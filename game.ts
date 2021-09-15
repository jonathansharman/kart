const UPDATES_PER_SEC = 60.0;
const MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const ACCELERATION = 0.05;
const ON_ROAD_DRAG = 0.01;
const OFF_ROAD_DRAG = 0.03;
const WALL_BOUNCE_LOSS = 0.3;

const MAX_STEERING_ANGLE = Math.PI / 6.0;

const COLLISION_BUCKET_COLS = 8;
const COLLISION_BUCKET_WIDTH = canvas.width / COLLISION_BUCKET_COLS;
const COLLISION_BUCKET_ROWS = canvas.height / COLLISION_BUCKET_WIDTH;

const TERRAIN_CELL_WIDTH = 10;
const TERRAIN_CELL_COLS = Math.floor(canvas.width / TERRAIN_CELL_WIDTH);
const TERRAIN_CELL_ROWS = Math.floor(canvas.height / TERRAIN_CELL_WIDTH);

const TRACK_RADIUS = 50.0;
const TRACK_BORDER = 2.0;

// Axis control scheme constants

const CONTROL_AREA_WIDTH = 400.0;
const CONTROL_AREA_HEIGHT = 300.0;
const CONTROL_AREA_LEFT = 0.5 * (canvas.width - CONTROL_AREA_WIDTH);
const CONTROL_AREA_RIGHT = CONTROL_AREA_LEFT + CONTROL_AREA_WIDTH;
const CONTROL_AREA_TOP = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
const CONTROL_AREA_BOTTOM = CONTROL_AREA_TOP + CONTROL_AREA_HEIGHT;

const DEAD_AREA_WIDTH = 75.0;
const DEAD_AREA_LEFT = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
const DEAD_AREA_RIGHT = DEAD_AREA_LEFT + DEAD_AREA_WIDTH;

const STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);

// Follow control scheme constants

const MAX_SPEED_DISTANCE = 300.0;

enum ControlScheme {
	MouseAxes,
	MouseFollow,
}

class Bumper {
	public radius: number;
	public pos: Vec2;

	constructor(radius: number, pos = new Vec2(0.0, 0.0)) {
		this.radius = radius;
		this.pos = pos;
	}
}

class Car {
	public pos: Vec2;
	public speed: number;
	public heading: Angle;
	public steering: number;

	public frontBumper: Bumper;
	public backBumper: Bumper;

	constructor() {
		this.pos = new Vec2(0.0, 0.0);
		this.speed = 0.0;
		this.heading = new Angle(0.0);
		this.steering = 0.0;

		this.frontBumper = new Bumper(15.0);
		this.backBumper = new Bumper(10.0);
	}
}

class MainScene {
	public controlScheme: ControlScheme;
	public mousePos: Vec2;
	public brake: boolean;
	public gas: boolean;

	private cameraPos: Vec2;

	private car: Car;

	private trackPoints: Array<Vec2>;

	private walls: Array<Bumper>;
	private wallBuckets: Array<Array<Bumper>>;

	constructor() {
		this.controlScheme = ControlScheme.MouseFollow;
		this.mousePos = new Vec2(0.0, 0.0);
		this.brake = false;
		this.gas = false;

		this.cameraPos = new Vec2(0.0, 0.0);

		this.car = new Car();

		this.trackPoints = [
			new Vec2(100, 100),
			new Vec2(100, 668),
			new Vec2(200, 668),
			new Vec2(422, 568),
			new Vec2(602, 568),
			new Vec2(824, 668),
			new Vec2(924, 668),
			new Vec2(924, 100),
		];

		this.addWalls();
	}

	addWalls(): void {
		this.walls = [];
		this.wallBuckets = [];
		for (let i = 0; i < COLLISION_BUCKET_COLS * COLLISION_BUCKET_ROWS; ++i) {
			this.wallBuckets.push([]);
		}
		this.addWall(new Bumper(15.0, new Vec2(0.5 * canvas.width, 0.5 * canvas.height)));
	}

	addWall(wall: Bumper): void {
		const col = Math.floor(wall.pos.x / COLLISION_BUCKET_WIDTH);
		const row = Math.floor(wall.pos.y / COLLISION_BUCKET_WIDTH);
		this.walls.push(wall);
		this.wallBuckets[row * COLLISION_BUCKET_COLS + col].push(wall);
	}

	wallsNear(pos: Vec2): Array<Bumper> {
		const centerCol = Math.floor(pos.x / COLLISION_BUCKET_WIDTH);
		const centerRow = Math.floor(pos.y / COLLISION_BUCKET_WIDTH);
		let nearbyWalls = [];
		for (let row = centerRow - 1; row <= centerRow + 1; ++row) {
			if (row < 0 || COLLISION_BUCKET_ROWS <= row) {
				continue;
			}
			for (let col = centerCol - 1; col <= centerCol + 1; ++col) {
				if (col < 0 || COLLISION_BUCKET_COLS <= col) {
					continue;
				}
				nearbyWalls = nearbyWalls.concat(this.wallBuckets[row * COLLISION_BUCKET_COLS + col]);
			}
		}
		return nearbyWalls;
	}

	update(): void {
		let throttle: number;
		switch (this.controlScheme) {
			case ControlScheme.MouseAxes:
				// Left steering: 0 (right) to 1 (left)
				const leftSteering = clamp((DEAD_AREA_LEFT - this.mousePos.x) / STEERING_WIDTH, 0.0, 1.0);
				// Right steering: 0 (left) to 1 (right)
				const rightSteering = clamp((this.mousePos.x - DEAD_AREA_RIGHT) / STEERING_WIDTH, 0.0, 1.0);
				// Throttle: 0 (bottom) to 1 (top)
				throttle = clamp((CONTROL_AREA_BOTTOM - this.mousePos.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
				// Steering
				this.car.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
				break;
			case ControlScheme.MouseFollow:
				const offset = this.mousePos.minus(this.car.pos);
				const angle = Angle.fromVec2(offset);
				const distance = offset.length();
				throttle = Math.min(MAX_SPEED_DISTANCE, distance) / MAX_SPEED_DISTANCE;
				this.car.steering = clamp(
					this.car.heading.smallestAngleTo(angle).getNegativePiToPi(),
					-MAX_STEERING_ANGLE,
					MAX_STEERING_ANGLE,
				);
				break;
		}
		// Gas and brake
		if (this.brake) {
			this.car.speed -= ACCELERATION * (1.0 - throttle);
		}
		if (this.gas) {
			this.car.speed += ACCELERATION * throttle;
		}

		// Drag
		const drag = this.offRoad() ? OFF_ROAD_DRAG : ON_ROAD_DRAG;
		this.car.speed -= drag * this.car.speed;
		// Change in heading
		this.car.heading = this.car.heading.plus(this.car.steering * this.car.speed / 50.0);

		const vx = this.car.speed * this.car.heading.cos();
		const vy = this.car.speed * this.car.heading.sin();

		this.car.pos.x += vx;
		this.car.pos.y += vy;

		while (this.car.pos.x < 0.0) {
			this.car.pos.x += canvas.width;
		}
		while (this.car.pos.x > canvas.width) {
			this.car.pos.x -= canvas.width;
		}
		while (this.car.pos.y < 0.0) {
			this.car.pos.y += canvas.height;
		}
		while (this.car.pos.y > canvas.height) {
			this.car.pos.y -= canvas.height;
		}

		this.car.frontBumper.pos.x = this.car.pos.x + 20.0 * this.car.heading.cos();
		this.car.frontBumper.pos.y = this.car.pos.y + 20.0 * this.car.heading.sin();

		this.car.backBumper.pos.x = this.car.pos.x - 20.0 * this.car.heading.cos();
		this.car.backBumper.pos.y = this.car.pos.y - 20.0 * this.car.heading.sin();

		this.wallBumperCollision(this.car.frontBumper);
		this.wallBumperCollision(this.car.backBumper);

		// The camera leads the car.
		//this.cameraPos = new Vec2(this.car.pos.x + 20.0 * vx, this.car.pos.y + 20.0 * vy);
		//this.cameraPos = this.car.pos;
	}

	offRoad(): boolean {
		for (let i = 0; i < this.trackPoints.length; ++i) {
			const start = this.trackPoints[i];
			const end = this.trackPoints[(i + 1) % this.trackPoints.length];
			const segment = new Segment2(start, end);
			if (segment.pointDistance2(this.car.pos) < TRACK_RADIUS * TRACK_RADIUS) {
				return false;
			}
		}
		return true;
	}

	wallBumperCollision(bumper: Bumper): void {
		for (let wall of this.wallsNear(bumper.pos)) {
			const r = bumper.radius + wall.radius;
			const dx = bumper.pos.x - wall.pos.x;
			const dy = bumper.pos.y - wall.pos.y;
			const d2 = dx * dx + dy * dy;
			if (d2 != 0.0 && d2 < r * r) {
				this.car.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.car.speed;

				const d = Math.sqrt(d2);
				const factor = (r - d) / d;
				this.car.pos.x += dx * factor;
				this.car.pos.y += dy * factor;
			}
		}
	}

	draw(_timestamp: DOMHighResTimeStamp): void {
		ctx.fillStyle = "rgb(30, 100, 40)";
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fill();

		const x = this.car.pos.x - this.cameraPos.x;
		const y = this.car.pos.y - this.cameraPos.y;

		this.drawTrack(TRACK_RADIUS, "black");
		this.drawTrack(TRACK_RADIUS - TRACK_BORDER, "rgb(60, 60, 60)");

		// Draw walls.
		for (const wall of this.walls) {
			drawBumper(wall);
		}

		// Draw car.
		const frontOffset = 25.0;
		const backOffset = 20.0;
		const frontAngleOffset = Math.PI / 10.0;
		const backAngleOffset = Math.PI / 5.0;
		const frontRight = new Vec2(x + frontOffset * this.car.heading.plus(frontAngleOffset).cos(), y + frontOffset * this.car.heading.plus(frontAngleOffset).sin());
		const frontLeft = new Vec2(x + frontOffset * this.car.heading.minus(frontAngleOffset).cos(), y + frontOffset * this.car.heading.minus(frontAngleOffset).sin());
		const backLeft = new Vec2(x + backOffset * this.car.heading.plus(Math.PI + backAngleOffset).cos(), y + backOffset * this.car.heading.plus(backAngleOffset + Math.PI).sin());
		const backRight = new Vec2(x + backOffset * this.car.heading.plus(Math.PI - backAngleOffset).cos(), y + backOffset * this.car.heading.minus(backAngleOffset - Math.PI).sin());

		drawBumper(this.car.frontBumper);
		drawBumper(this.car.backBumper);

		const wheelRadius = 8.0;
		drawWheel(frontRight, this.car.heading.plus(this.car.steering), wheelRadius, Math.PI / 6.0);
		drawWheel(frontLeft, this.car.heading.plus(this.car.steering), wheelRadius, Math.PI / 6.0);
		drawWheel(backLeft, this.car.heading, wheelRadius, Math.PI / 6.0);
		drawWheel(backRight, this.car.heading, wheelRadius, Math.PI / 6.0);

		ctx.beginPath();
		ctx.moveTo(frontRight.x, frontRight.y);
		ctx.lineTo(frontLeft.x, frontLeft.y);
		ctx.lineTo(backLeft.x, backLeft.y);
		ctx.lineTo(backRight.x, backRight.y);
		ctx.closePath();
		ctx.fillStyle = "rgb(180, 0, 0)";
		ctx.fill();
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1.0;
		ctx.stroke();

		// Draw control area.
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.rect(
			0.5 * (canvas.width - CONTROL_AREA_WIDTH),
			0.5 * (canvas.height - CONTROL_AREA_HEIGHT),
			CONTROL_AREA_WIDTH,
			CONTROL_AREA_HEIGHT,
		);
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.fillStyle = "black";
		ctx.rect(
			0.5 * (canvas.width - DEAD_AREA_WIDTH),
			0.5 * (canvas.height - CONTROL_AREA_HEIGHT),
			DEAD_AREA_WIDTH,
			CONTROL_AREA_HEIGHT,
		);
		ctx.stroke();

		window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
			this.draw(timestamp);
		});
	}

	drawTrack(radius, style): void {
		ctx.fillStyle = style;
		for (let i = 0; i < this.trackPoints.length; ++i) {
			const start = this.trackPoints[i];
			const end = this.trackPoints[(i + 1) % this.trackPoints.length];

			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
			ctx.lineWidth = 2 * radius;
			ctx.strokeStyle = style;
			ctx.stroke();

			ctx.beginPath();
			ctx.ellipse(
				start.x, start.y,
				radius, radius,
				0.0,
				0.0, 2.0 * Math.PI,
			);
			ctx.fill();
		}

	}
}

function drawWheel(pos: Vec2, angle: Angle, radius: number, angleOffset: number) {
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.moveTo(
		pos.x + radius * angle.plus(angleOffset).cos(),
		pos.y + radius * angle.plus(angleOffset).sin(),
	);
	ctx.lineTo(
		pos.x + radius * angle.minus(angleOffset).cos(),
		pos.y + radius * angle.minus(angleOffset).sin(),
	);
	ctx.lineTo(
		pos.x + radius * angle.plus(angleOffset + Math.PI).cos(),
		pos.y + radius * angle.plus(angleOffset - Math.PI).sin(),
	);
	ctx.lineTo(
		pos.x + radius * angle.minus(angleOffset - Math.PI).cos(),
		pos.y + radius * angle.minus(angleOffset - Math.PI).sin(),
	);
	ctx.closePath();
	ctx.fill();
}

function drawBumper(bumper): void {
	ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
	ctx.beginPath();
	ctx.ellipse(
		bumper.pos.x, bumper.pos.y,
		bumper.radius, bumper.radius,
		0.0,
		0.0, 2.0 * Math.PI,
	);
	ctx.fill();
}

const mainScene = new MainScene();

window.onmousemove = (event: MouseEvent) => {
	const rect = canvas.getBoundingClientRect();
	mainScene.mousePos.x = event.clientX - rect.left;
	mainScene.mousePos.y = event.clientY - rect.top;
};

window.onmousedown = (event: MouseEvent) => {
	switch (event.button) {
		case 0: // Left button
			mainScene.gas = true;
			return false;
		case 2: // Right button
			mainScene.brake = true;
			return false;
	}
};

window.onmouseup = (event: MouseEvent) => {
	event.preventDefault();
	switch (event.button) {
		case 0: // Left button
			mainScene.gas = false;
			return false;
		case 2: // Right button
			mainScene.brake = false;
			return false;
	}
};

window.onkeydown = (event: KeyboardEvent) => {
	switch (event.code) {
		case "Digit1":
			mainScene.brake = true;
			return false;
		case "Digit2":
			mainScene.gas = true;
			return false;
	}
};

window.onkeyup = (event: KeyboardEvent) => {
	event.preventDefault();
	switch (event.code) {
		case "Digit1":
			mainScene.brake = false;
			return false;
		case "Digit2":
			mainScene.gas = false;
			return false;
	}
};

// Disable context menu on right-click.
window.oncontextmenu = () => false;

// Update loop
window.setInterval(() => {
	mainScene.update();
}, MS_PER_UPDATE);

// Render loop
window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
	mainScene.draw(timestamp);
});
