import { Bumper } from "./bumper.js";
import { Kart } from "./kart.js";
import { Angle, clamp, mod, Vec2 } from "./math.js";

const UPDATES_PER_SEC = 60.0;
const MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const ACCELERATION = 0.05;
const ON_ROAD_DRAG = 0.01;
const OFF_ROAD_DRAG = 0.03;
const WALL_BOUNCE_LOSS = 0.3;

const MAX_STEERING_ANGLE = Math.PI / 6.0;

const TRACK_RADIUS = 50.0;
const TRACK_BORDER = 2.0;

// MouseAxes control scheme constants

const CONTROL_AREA_WIDTH = 400.0;
const CONTROL_AREA_HEIGHT = 300.0;

const DEAD_AREA_WIDTH = 75.0;

const STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);

// MouseFollow control scheme constants

const MAX_SPEED_DISTANCE = 300.0;

// GamepadFollow control scheme constants

const STICK_DEAD_RADIUS = 0.25;
const STICK_STEERING_DRAG = 0.95;

enum ControlScheme {
	MouseAxes,
	MouseFollow,
	GamepadFollow,
}

class Corner {
	vertex: Vec2;
	// Values outside [0, 1] may result in loops.
	smoothness: number;

	constructor(vertex: Vec2, smoothness: number) {
		this.vertex = vertex;
		this.smoothness = smoothness;
	}
}

class CubicBezier {
	start: Vec2;
	end: Vec2;
	cp1: Vec2;
	cp2: Vec2;

	constructor(start: Vec2, end: Vec2, cp1: Vec2, cp2: Vec2) {
		this.start = start;
		this.end = end;
		this.cp1 = cp1;
		this.cp2 = cp2;
	}
}

class Track {
	private name: string;
	private radius: number;
	private spline: CubicBezier[];

	constructor(name: string, radius: number, corners: Corner[]) {
		this.name = name;
		this.radius = radius;
		// Build a list of unit offset vectors from each vertex to its control
		// point in the forward direction.
		let forwardCPOffsets: Vec2[] = [];
		for (let i = 0; i < corners.length; ++i) {
			const v = corners[i].vertex;
			const vPrev = corners[(i - 1 + corners.length) % corners.length].vertex;
			const vNext = corners[(i + 1) % corners.length].vertex;
			const fromPrev = v.minus(vPrev);
			const toNext = vNext.minus(v);
			// Get a vector bisecting the angle of the corner.
			const bisector = fromPrev.times(toNext.length()).plus(toNext.times(-fromPrev.length()));
			// Use the z-coordinate of the cross product to determine if it's a
			// left or right turn and therefore which way to rotate the offset.
			const crossZ = fromPrev.x * toNext.y - fromPrev.y * toNext.x;
			const rotated = crossZ > 0 ? bisector.rotatedQuarter() : bisector.rotatedThreeQuarters();
			forwardCPOffsets.push(rotated.normalized());
		}

		this.spline = [];
		for (let i = 0; i < corners.length; ++i) {
			const next = (i + 1) % corners.length;
			const start = corners[i].vertex;
			const end = corners[next].vertex;
			const l = end.minus(start).length() / 3;
			const cp1 = start.plus(forwardCPOffsets[i].times(corners[i].smoothness * l));
			const cp2 = end.minus(forwardCPOffsets[next].times(corners[next].smoothness * l));
			this.spline.push(new CubicBezier(start, end, cp1, cp2));
		}
	}

	draw(debug: boolean) {
		this.drawSplines(this.radius, "black");
		this.drawSplines(this.radius - TRACK_BORDER, "rgb(60, 60, 60)");

		if (debug) {
			ctx.font = "20pt serif";
			ctx.fillStyle = "white";
			ctx.fillText(this.name, 10, 30);
			// Draw Bezier curve "frames".
			ctx.lineWidth = 1;
			let even = true;
			for (let curve of this.spline) {
				ctx.strokeStyle = even ? "red" : "white";
				even = !even;
				ctx.beginPath();
				ctx.moveTo(curve.start.x, curve.start.y);
				ctx.lineTo(curve.cp1.x, curve.cp1.y);
				ctx.lineTo(curve.cp2.x, curve.cp2.y);
				ctx.lineTo(curve.end.x, curve.end.y);
				ctx.stroke();
			}
		}
	}

	private drawSplines(radius: number, style: string) {
		ctx.beginPath();
		ctx.strokeStyle = style;
		const start = this.spline[0].start;
		ctx.moveTo(start.x, start.y);
		for (let curve of this.spline) {
			ctx.bezierCurveTo(curve.cp1.x, curve.cp1.y, curve.cp2.x, curve.cp2.y, curve.end.x, curve.end.y);
			ctx.lineWidth = 2 * radius;
		}
		ctx.closePath();
		ctx.stroke();
	}
}

const tracks: Track[] = [
	new Track("Serpentine", TRACK_RADIUS, [
		new Corner(new Vec2(100, 100), 0.5),
		new Corner(new Vec2(100, 668), 0.5),
		new Corner(new Vec2(250, 668), 1.0),
		new Corner(new Vec2(250, 200), 1.0),
		new Corner(new Vec2(400, 200), 1.0),
		new Corner(new Vec2(400, 668), 1.0),
		new Corner(new Vec2(550, 668), 1.0),
		new Corner(new Vec2(550, 200), 1.0),
		new Corner(new Vec2(700, 200), 1.0),
		new Corner(new Vec2(700, 668), 1.0),
		new Corner(new Vec2(850, 668), 0.5),
		new Corner(new Vec2(850, 100), 0.5),
	]),
	new Track("Clockwise oval, tight turns", TRACK_RADIUS, [
		new Corner(new Vec2(300, 300), 0.0),
		new Corner(new Vec2(800, 300), 0.0),
		new Corner(new Vec2(800, 500), 0.0),
		new Corner(new Vec2(300, 500), 0.0),
	]),
	new Track("Counter-clockwise oval", TRACK_RADIUS, [
		new Corner(new Vec2(300, 300), 1.0),
		new Corner(new Vec2(300, 500), 1.0),
		new Corner(new Vec2(800, 500), 1.0),
		new Corner(new Vec2(800, 300), 1.0),
	]),
	new Track("Clockwise big track, tight turns", TRACK_RADIUS, [
		new Corner(new Vec2(100, 100), 0.0),
		new Corner(new Vec2(924, 100), 0.0),
		new Corner(new Vec2(924, 668), 0.0),
		new Corner(new Vec2(824, 668), 0.0),
		new Corner(new Vec2(602, 568), 0.0),
		new Corner(new Vec2(422, 568), 0.0),
		new Corner(new Vec2(200, 668), 0.0),
		new Corner(new Vec2(100, 668), 0.0),
	]),
	new Track("Counter-clockwise big track", TRACK_RADIUS, [
		new Corner(new Vec2(100, 100), 0.5),
		new Corner(new Vec2(100, 668), 1.0),
		new Corner(new Vec2(200, 668), 1.0),
		new Corner(new Vec2(422, 568), 1.0),
		new Corner(new Vec2(602, 568), 1.0),
		new Corner(new Vec2(824, 668), 1.0),
		new Corner(new Vec2(924, 668), 1.0),
		new Corner(new Vec2(924, 100), 0.5),
	]),
	new Track("Degenerate quad (triangle)", TRACK_RADIUS, [
		new Corner(new Vec2(300, 300), 1.0),
		new Corner(new Vec2(300, 500), 1.0),
		new Corner(new Vec2(800, 400), 1.0),
		new Corner(new Vec2(800, 400), 1.0),
	]),
];

class MainScene {
	debug: boolean;

	trackIdx: number;

	controlScheme: ControlScheme;
	mousePos: Vec2;
	brake: boolean;
	gas: boolean;

	private cameraPos: Vec2;

	private kart: Kart;

	private walls: Bumper[];
	private wallBuckets: Bumper[][];

	constructor() {
		this.debug = false;

		this.controlScheme = ControlScheme.GamepadFollow;
		this.mousePos = new Vec2(0.0, 0.0);
		this.brake = false;
		this.gas = false;

		this.cameraPos = new Vec2(0.0, 0.0);

		this.kart = new Kart();

		this.trackIdx = 0;

		this.addWalls();
	}

	addWalls() {
		this.walls = [];
		this.walls.push(new Bumper(15.0, new Vec2(300.0, 300.0)));
	}

	update() {
		// Fall back to mouse controls if the gamepad is disconnected.
		let controlScheme = this.controlScheme;
		const gamepad = navigator.getGamepads()[0];
		if (!gamepad) {
			controlScheme = ControlScheme.MouseFollow;
		}

		let throttle = 0.0;
		switch (controlScheme) {
			case ControlScheme.MouseAxes:
				{
					const controlAreaTop = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
					const controlAreaBottom = controlAreaTop + CONTROL_AREA_HEIGHT;
					const deadAreaLeft = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
					const deadAreaRight = deadAreaLeft + DEAD_AREA_WIDTH;
					// Left steering: 0 (right) to 1 (left)
					const leftSteering = clamp((deadAreaLeft - this.mousePos.x) / STEERING_WIDTH, 0.0, 1.0);
					// Right steering: 0 (left) to 1 (right)
					const rightSteering = clamp((this.mousePos.x - deadAreaRight) / STEERING_WIDTH, 0.0, 1.0);
					// Throttle: 0 (bottom) to 1 (top)
					throttle = clamp((controlAreaBottom - this.mousePos.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
					// Steering
					this.kart.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
				}
				break;
			case ControlScheme.MouseFollow:
				{
					const offset = this.mousePos.minus(this.kart.pos);
					const angle = Angle.fromVec2(offset);
					const distance = offset.length();
					throttle = Math.min(MAX_SPEED_DISTANCE, distance) / MAX_SPEED_DISTANCE;
					this.kart.steering = clamp(
						this.kart.heading.smallestAngleTo(angle).getNegativePiToPi(),
						-MAX_STEERING_ANGLE,
						MAX_STEERING_ANGLE,
					);
				}
				break;
			case ControlScheme.GamepadFollow:
				{
					let offset = new Vec2(gamepad.axes[0], gamepad.axes[1]);
					const angle = Angle.fromVec2(offset);
					const length = offset.length();
					if (length > STICK_DEAD_RADIUS) {
						throttle = Math.min(1.0, (length - STICK_DEAD_RADIUS) / (1.0 - STICK_DEAD_RADIUS));
						this.kart.steering = clamp(
							this.kart.heading.smallestAngleTo(angle).getNegativePiToPi(),
							-MAX_STEERING_ANGLE,
							MAX_STEERING_ANGLE,
						);
						this.gas = true;
					} else {
						this.gas = false;
						this.kart.steering *= STICK_STEERING_DRAG;
					}
				}
				break;
		}
		// Gas and brake
		if (this.brake) {
			this.kart.speed -= ACCELERATION * (1.0 - throttle);
		}
		if (this.gas) {
			this.kart.speed += ACCELERATION * throttle;
		}

		// Drag
		const drag = this.offRoad() ? OFF_ROAD_DRAG : ON_ROAD_DRAG;
		this.kart.speed -= drag * this.kart.speed;
		// Change in heading
		this.kart.heading = this.kart.heading.plus(this.kart.steering * this.kart.speed / 50.0);

		const vx = this.kart.speed * this.kart.heading.cos();
		const vy = this.kart.speed * this.kart.heading.sin();

		this.kart.pos.x += vx;
		this.kart.pos.y += vy;

		while (this.kart.pos.x < 0.0) {
			this.kart.pos.x += canvas.width;
		}
		while (this.kart.pos.x > canvas.width) {
			this.kart.pos.x -= canvas.width;
		}
		while (this.kart.pos.y < 0.0) {
			this.kart.pos.y += canvas.height;
		}
		while (this.kart.pos.y > canvas.height) {
			this.kart.pos.y -= canvas.height;
		}

		this.kart.frontBumper.pos.x = this.kart.pos.x + 20.0 * this.kart.heading.cos();
		this.kart.frontBumper.pos.y = this.kart.pos.y + 20.0 * this.kart.heading.sin();

		this.kart.backBumper.pos.x = this.kart.pos.x - 20.0 * this.kart.heading.cos();
		this.kart.backBumper.pos.y = this.kart.pos.y - 20.0 * this.kart.heading.sin();

		this.wallBumperCollision(this.kart.frontBumper);
		this.wallBumperCollision(this.kart.backBumper);

		// The camera leads the kart.
		//this.cameraPos = new Vec2(this.kart.pos.x + 20.0 * vx, this.kart.pos.y + 20.0 * vy);
		//this.cameraPos = this.kart.pos;
	}

	offRoad(): boolean {
		// TODO: Collision detection with track's bezier curves
		// for (let i = 0; i < this.track.length; ++i) {
		// 	const start = this.trackPoints[i];
		// 	const end = this.trackPoints[(i + 1) % this.trackPoints.length];
		// 	const segment = new Segment2(start, end);
		// 	if (segment.pointDistance2(this.kart.pos) < TRACK_RADIUS * TRACK_RADIUS) {
		// 		return false;
		// 	}
		// }
		// return true;
		return false;
	}

	wallBumperCollision(bumper: Bumper) {
		for (let wall of this.walls) {
			const r = bumper.radius + wall.radius;
			const dx = bumper.pos.x - wall.pos.x;
			const dy = bumper.pos.y - wall.pos.y;
			const d2 = dx * dx + dy * dy;
			if (d2 != 0.0 && d2 < r * r) {
				this.kart.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.kart.speed;

				const d = Math.sqrt(d2);
				const factor = (r - d) / d;
				this.kart.pos.x += dx * factor;
				this.kart.pos.y += dy * factor;
			}
		}
	}

	draw(_timestamp: DOMHighResTimeStamp) {
		ctx.fillStyle = "rgb(30, 100, 40)";
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fill();

		tracks[this.trackIdx].draw(this.debug);

		// Draw walls.
		for (const wall of this.walls) {
			wall.draw(ctx);
		}

		this.kart.draw(ctx, this.cameraPos, this.debug);

		// Draw control area when in MouseAxes control mode.
		if (this.controlScheme == ControlScheme.MouseAxes) {
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
		}

		window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
			this.draw(timestamp);
		});
	}
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
		case "KeyD":
			mainScene.debug = !mainScene.debug;
			return false;
		case "ArrowLeft":
			mainScene.trackIdx = mod(mainScene.trackIdx - 1, tracks.length);
			return false;
		case "ArrowRight":
			mainScene.trackIdx = mod(mainScene.trackIdx + 1, tracks.length);
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

// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	return false;
}

// Update loop
window.setInterval(() => {
	mainScene.update();
}, MS_PER_UPDATE);

// Render loop
window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
	mainScene.draw(timestamp);
});
