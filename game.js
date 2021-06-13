"use strict";

const FPS = 60.0;
const MS_PER_FRAME = 1000.0 / FPS;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const ACCELERATION = 0.05;
const DRAG = 0.007;
const WALL_BOUNCE_LOSS = 0.3;

const MAX_STEERING_ANGLE = Math.PI / 6.0;

const COLLISION_BUCKET_COLS = 8;
const COLLISION_BUCKET_WIDTH = canvas.width / COLLISION_BUCKET_COLS;
const COLLISION_BUCKET_ROWS = canvas.height / COLLISION_BUCKET_WIDTH;

const TERRAIN_CELL_WIDTH = 10;
const TERRAIN_CELL_COLS = Math.floor(canvas.width / TERRAIN_CELL_WIDTH);
const TERRAIN_CELL_ROWS = Math.floor(canvas.height / TERRAIN_CELL_WIDTH);

const TRACK_RADIUS = 40.0;

const CONTROL_AREA_WIDTH = 400.0;
const CONTROL_AREA_HEIGHT = 300.0;
const CONTROL_AREA_LEFT = 0.5 * (canvas.width - CONTROL_AREA_WIDTH);
const CONTROL_AREA_RIGHT = CONTROL_AREA_LEFT + CONTROL_AREA_WIDTH;
const CONTROL_AREA_TOP = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
const CONTROL_AREA_BOTTOM = CONTROL_AREA_TOP + CONTROL_AREA_HEIGHT;

const DEAD_AREA_WIDTH = 100.0;
const DEAD_AREA_LEFT = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
const DEAD_AREA_RIGHT = DEAD_AREA_LEFT + DEAD_AREA_WIDTH;

const STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

class Bumper {
	constructor(radius, x = 0.0, y = 0.0) {
		this.radius = radius;
		this.x = x;
		this.y = y;
	}
}

class Car {
	constructor() {
		this.x = 0.0;
		this.y = 0.0;
		this.speed = 0.0;
		this.heading = 0.0;
		this.steering = 0.0;

		this.frontBumper = new Bumper(15.0);
		this.backBumper = new Bumper(10.0);
	}
}

class MainScene {
	constructor() {
		this.mouseX = 0;
		this.mouseY = 0;
		this.brake = false;
		this.gas = false;

		this.cameraX = 0.0;
		this.cameraY = 0.0;

		this.car = new Car();

		this.trackPoints = [
			[100, 100],
			[100, 500],
			[700, 500],
			[700, 100],
		];

		this.addWalls();
	}

	addWalls() {
		this.walls = [];
		this.wallBuckets = [];
		for (let i = 0; i < COLLISION_BUCKET_COLS * COLLISION_BUCKET_ROWS; ++i) {
			this.wallBuckets.push([]);
		}
		this.addWall(new Bumper(15.0, 0.5 * canvas.width, 0.5 * canvas.height));
	}

	addWall(wall) {
		const col = Math.floor(wall.x / COLLISION_BUCKET_WIDTH);
		const row = Math.floor(wall.y / COLLISION_BUCKET_WIDTH);
		this.walls.push(wall);
		this.wallBuckets[row * COLLISION_BUCKET_COLS + col].push(wall);
	}

	wallsNear(x, y) {
		const centerCol = Math.floor(x / COLLISION_BUCKET_WIDTH);
		const centerRow = Math.floor(y / COLLISION_BUCKET_WIDTH);
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

	update() {
		// Left steering: 0 (right) to 1 (left)
		const leftSteering = clamp((DEAD_AREA_LEFT - this.mouseX) / STEERING_WIDTH, 0.0, 1.0);
		// Right steering: 0 (left) to 1 (right)
		const rightSteering = clamp((this.mouseX - DEAD_AREA_RIGHT) / STEERING_WIDTH, 0.0, 1.0);
		// Throttle: 0 (bottom) to 1 (top)
		const throttle = clamp((CONTROL_AREA_BOTTOM - this.mouseY) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
		// Gas and brake
		if (this.brake) {
			this.car.speed -= ACCELERATION * (1.0 - throttle);
		}
		if (this.gas) {
			this.car.speed += ACCELERATION * throttle;
		}
		// Drag
		this.car.speed -= DRAG * this.car.speed;
		// Steering
		this.car.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
		// Change in heading
		this.car.heading += this.car.steering * this.car.speed / 35.0;

		const vx = this.car.speed * Math.cos(this.car.heading);
		const vy = this.car.speed * Math.sin(this.car.heading);

		this.car.x += vx;
		this.car.y += vy;

		while (this.car.x < 0.0) {
			this.car.x += canvas.width;
		}
		while (this.car.x > canvas.width) {
			this.car.x -= canvas.width;
		}
		while (this.car.y < 0.0) {
			this.car.y += canvas.height;
		}
		while (this.car.y > canvas.height) {
			this.car.y -= canvas.height;
		}

		this.car.frontBumper.x = this.car.x + 20.0 * Math.cos(this.car.heading);
		this.car.frontBumper.y = this.car.y + 20.0 * Math.sin(this.car.heading);

		this.car.backBumper.x = this.car.x - 20.0 * Math.cos(this.car.heading);
		this.car.backBumper.y = this.car.y - 20.0 * Math.sin(this.car.heading);

		this.wallBumperCollision(this.car.frontBumper);
		this.wallBumperCollision(this.car.backBumper);

		// The camera leads the car.
		//this.car.camera = [this.car.x + 20.0 * vx, this.car.y + 20.0 * vy];
		//this.car.camera = [this.car.x, this.car.y];
	}

	wallBumperCollision(bumper) {
		for (let wall of this.wallsNear(bumper.x, bumper.y)) {
			const r = bumper.radius + wall.radius;
			const dx = bumper.x - wall.x;
			const dy = bumper.y - wall.y;
			const d2 = dx ** 2.0 + dy ** 2.0;
			if (d2 != 0.0 && d2 < r ** 2.0) {
				this.car.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.car.speed;

				const d = d2 ** 0.5;
				const factor = (r - d) / d;
				this.car.x += dx * factor;
				this.car.y += dy * factor;
			}
		}
	}

	render() {
		ctx.fillStyle = "rgb(30, 100, 40)";
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fill();

		const x = this.car.x - this.cameraX;
		const y = this.car.y - this.cameraY;

		// Draw track.
		for (let i = 0; i < this.trackPoints.length; ++i) {
			const start = this.trackPoints[i];
			const end = this.trackPoints[(i + 1) % this.trackPoints.length];
			const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) + 0.5 * Math.PI;
			const dx = TRACK_RADIUS * Math.cos(angle);
			const dy = TRACK_RADIUS * Math.sin(angle);

			ctx.fillStyle = "rgb(60, 60, 60)";

			ctx.beginPath();
			ctx.moveTo(start[0] - dx, start[1] - dy);
			ctx.lineTo(start[0] + dx, start[1] + dy);
			ctx.lineTo(end[0] + dx, end[1] + dy);
			ctx.lineTo(end[0] - dx, end[1] - dy);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.ellipse(
				start[0], start[1],
				TRACK_RADIUS, TRACK_RADIUS,
				0.0,
				0.0, 2.0 * Math.PI,
			);
			ctx.fill();
		}

		// Draw walls.
		for (const wall of this.walls) {
			drawBumper(wall);
		}

		// Draw car.
		const frontOffset = 25.0;
		const backOffset = 20.0;
		const frontAngleOffset = Math.PI / 10.0;
		const backAngleOffset = Math.PI / 5.0;
		const frontRight = [x + frontOffset * Math.cos(this.car.heading + frontAngleOffset), y + frontOffset * Math.sin(this.car.heading + frontAngleOffset)];
		const frontLeft = [x + frontOffset * Math.cos(this.car.heading - frontAngleOffset), y + frontOffset * Math.sin(this.car.heading - frontAngleOffset)];
		const backLeft = [x + backOffset * Math.cos(this.car.heading + Math.PI + backAngleOffset), y + backOffset * Math.sin(this.car.heading + Math.PI + backAngleOffset)];
		const backRight = [x + backOffset * Math.cos(this.car.heading + Math.PI - backAngleOffset), y + backOffset * Math.sin(this.car.heading + Math.PI - backAngleOffset)];

		drawBumper(this.car.frontBumper);
		drawBumper(this.car.backBumper);

		const wheelRadius = 8.0;
		drawWheel(frontRight[0], frontRight[1], this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
		drawWheel(frontLeft[0], frontLeft[1], this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
		drawWheel(backLeft[0], backLeft[1], this.car.heading, wheelRadius, Math.PI / 6.0);
		drawWheel(backRight[0], backRight[1], this.car.heading, wheelRadius, Math.PI / 6.0);

		ctx.beginPath();
		ctx.moveTo(frontRight[0], frontRight[1]);
		ctx.lineTo(frontLeft[0], frontLeft[1]);
		ctx.lineTo(backLeft[0], backLeft[1]);
		ctx.lineTo(backRight[0], backRight[1]);
		ctx.closePath();
		ctx.fillStyle = "rgb(180, 0, 0)";
		ctx.fill();
		ctx.fillStyle = "black";
		ctx.stroke();

		// Draw control area.
		ctx.beginPath();
		ctx.rect(
			0.5 * (canvas.width - CONTROL_AREA_WIDTH),
			0.5 * (canvas.height - CONTROL_AREA_HEIGHT),
			CONTROL_AREA_WIDTH,
			CONTROL_AREA_HEIGHT,
		);
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		ctx.fill();
		ctx.fillStyle = "black";
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
}

function drawWheel(x, y, angle, radius, angleOffset) {
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.moveTo(
		x + radius * Math.cos(angle + angleOffset),
		y + radius * Math.sin(angle + angleOffset),
	);
	ctx.lineTo(
		x + radius * Math.cos(angle - angleOffset),
		y + radius * Math.sin(angle - angleOffset),
	);
	ctx.lineTo(
		x + radius * Math.cos(angle + Math.PI + angleOffset),
		y + radius * Math.sin(angle - Math.PI + angleOffset),
	);
	ctx.lineTo(
		x + radius * Math.cos(angle + Math.PI - angleOffset),
		y + radius * Math.sin(angle + Math.PI - angleOffset),
	);
	ctx.closePath();
	ctx.fill();
}

function drawBumper(bumper) {
	ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
	ctx.beginPath();
	ctx.ellipse(
		bumper.x, bumper.y,
		bumper.radius, bumper.radius,
		0.0,
		0.0, 2.0 * Math.PI,
	);
	ctx.fill();
}

const mainScene = new MainScene();

window.onmousemove = (event) => {
	const rect = canvas.getBoundingClientRect();
	mainScene.mouseX = event.clientX - rect.left;
	mainScene.mouseY = event.clientY - rect.top;
};

window.onmousedown = (event) => {
	switch (event.button) {
		case 0: // Left button
			mainScene.gas = true;
			return false;
		case 2: // Right button
			mainScene.brake = true;
			return false;
	}
};

window.onmouseup = (event) => {
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

window.onkeydown = (event) => {
	switch (event.code) {
		case "Digit1":
			mainScene.brake = true;
			return false;
		case "Digit2":
			mainScene.gas = true;
			return false;
	}
};

window.onkeyup = (event) => {
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

window.oncontextmenu = () => false;

window.setInterval(() => {
	mainScene.update();
	mainScene.render();
}, MS_PER_FRAME);
