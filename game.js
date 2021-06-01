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

class Bumper {
	constructor(radius, pos = [0.0, 0.0]) {
		this.radius = radius;
		this.pos = pos;
	}
}

class Car {
	constructor() {
		this.pos = [0.0, 0.0];
		this.speed = 0.0;
		this.heading = 0.0;
		this.steering = 0.0;

		this.frontBumper = new Bumper(15.0);
		this.backBumper = new Bumper(10.0);
	}
}

class MainScene {
	constructor() {
		this.mousePos = [0, 0];
		this.brake = false;
		this.gas = false;

		this.camera = [0.0, 0.0];

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
		this.addWall(new Bumper(15.0, [0.5 * canvas.width, 0.5 * canvas.height]));
	}

	addWall(wall) {
		const col = Math.floor(wall.pos[0] / COLLISION_BUCKET_WIDTH);
		const row = Math.floor(wall.pos[1] / COLLISION_BUCKET_WIDTH);
		this.walls.push(wall);
		this.wallBuckets[row * COLLISION_BUCKET_COLS + col].push(wall);
	}

	wallsNear(pos) {
		const centerCol = Math.floor(pos[0] / COLLISION_BUCKET_WIDTH);
		const centerRow = Math.floor(pos[1] / COLLISION_BUCKET_WIDTH);
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
		// -1 (left) to 1 (right)
		const xControl = Math.max(-1.0, Math.min(1.0, -1.0 + 2.0 * (canvas.width - this.mousePos[0]) / canvas.width));
		// 0 (bottom) to 1 (top)
		const yControl = Math.max(0.0, Math.min(1.0, 1.0 * (canvas.height - this.mousePos[1]) / canvas.height));
		// Gas and brake
		if (this.brake) {
			this.car.speed -= ACCELERATION * (1.0 - yControl);
		}
		if (this.gas) {
			this.car.speed += ACCELERATION * yControl;
		}
		// Drag
		this.car.speed -= DRAG * this.car.speed;
		// Steering
		this.car.steering = MAX_STEERING_ANGLE * -xControl;
		// Change in heading
		this.car.heading += this.car.steering * this.car.speed / 35.0;

		const vx = this.car.speed * Math.cos(this.car.heading);
		const vy = this.car.speed * Math.sin(this.car.heading);

		this.car.pos[0] += vx;
		this.car.pos[1] += vy;

		while (this.car.pos[0] < 0.0) {
			this.car.pos[0] += canvas.width;
		}
		while (this.car.pos[0] > canvas.width) {
			this.car.pos[0] -= canvas.width;
		}
		while (this.car.pos[1] < 0.0) {
			this.car.pos[1] += canvas.height;
		}
		while (this.car.pos[1] > canvas.height) {
			this.car.pos[1] -= canvas.height;
		}

		this.car.frontBumper.pos = [
			this.car.pos[0] + 20.0 * Math.cos(this.car.heading),
			this.car.pos[1] + 20.0 * Math.sin(this.car.heading),
		];
		this.car.backBumper.pos = [
			this.car.pos[0] - 20.0 * Math.cos(this.car.heading),
			this.car.pos[1] - 20.0 * Math.sin(this.car.heading),
		];

		this.wallBumperCollision(this.car.frontBumper);
		this.wallBumperCollision(this.car.backBumper);

		// The camera leads the car.
		//this.car.camera = [this.car.pos[0] + 20.0 * vx, this.car.pos[1] + 20.0 * vy];
		//this.car.camera = [this.car.pos[0], this.car.pos[1]];
	}

	wallBumperCollision(bumper) {
		for (let wall of this.wallsNear(bumper.pos)) {
			console.log(wall);
			const r = bumper.radius + wall.radius;
			const dx = bumper.pos[0] - wall.pos[0];
			const dy = bumper.pos[1] - wall.pos[1];
			const d2 = dx ** 2.0 + dy ** 2.0;
			if (d2 != 0.0 && d2 < r ** 2.0) {
				this.car.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.car.speed;

				const d = d2 ** 0.5;
				const factor = (r - d) / d;
				this.car.pos[0] += dx * factor;
				this.car.pos[1] += dy * factor;
			}
		}
	}

	render() {
		ctx.fillStyle = "rgb(30, 100, 40)";
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fill();

		const pos = [this.car.pos[0] - this.camera[0], this.car.pos[1] - this.camera[1]];

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
		const frontRight = [pos[0] + frontOffset * Math.cos(this.car.heading + frontAngleOffset), pos[1] + frontOffset * Math.sin(this.car.heading + frontAngleOffset)];
		const frontLeft = [pos[0] + frontOffset * Math.cos(this.car.heading - frontAngleOffset), pos[1] + frontOffset * Math.sin(this.car.heading - frontAngleOffset)];
		const backLeft = [pos[0] + backOffset * Math.cos(this.car.heading + Math.PI + backAngleOffset), pos[1] + backOffset * Math.sin(this.car.heading + Math.PI + backAngleOffset)];
		const backRight = [pos[0] + backOffset * Math.cos(this.car.heading + Math.PI - backAngleOffset), pos[1] + backOffset * Math.sin(this.car.heading + Math.PI - backAngleOffset)];

		drawBumper(this.car.frontBumper);
		drawBumper(this.car.backBumper);

		const wheelRadius = 8.0;
		drawWheel(frontRight, this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
		drawWheel(frontLeft, this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
		drawWheel(backLeft, this.car.heading, wheelRadius, Math.PI / 6.0);
		drawWheel(backRight, this.car.heading, wheelRadius, Math.PI / 6.0);

		ctx.fillStyle = "rgb(180, 0, 0)";
		ctx.beginPath();
		ctx.moveTo(frontRight[0], frontRight[1]);
		ctx.lineTo(frontLeft[0], frontLeft[1]);
		ctx.lineTo(backLeft[0], backLeft[1]);
		ctx.lineTo(backRight[0], backRight[1]);
		ctx.closePath();
		ctx.fill();
	}
}

function drawWheel(pos, angle, radius, angleOffset) {
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.moveTo(
		pos[0] + radius * Math.cos(angle + angleOffset),
		pos[1] + radius * Math.sin(angle + angleOffset),
	);
	ctx.lineTo(
		pos[0] + radius * Math.cos(angle - angleOffset),
		pos[1] + radius * Math.sin(angle - angleOffset),
	);
	ctx.lineTo(
		pos[0] + radius * Math.cos(angle + Math.PI + angleOffset),
		pos[1] + radius * Math.sin(angle - Math.PI + angleOffset),
	);
	ctx.lineTo(
		pos[0] + radius * Math.cos(angle + Math.PI - angleOffset),
		pos[1] + radius * Math.sin(angle + Math.PI - angleOffset),
	);
	ctx.closePath();
	ctx.fill();
}

function drawBumper(bumper) {
	ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
	ctx.beginPath();
	ctx.ellipse(
		bumper.pos[0], bumper.pos[1],
		bumper.radius, bumper.radius,
		0.0,
		0.0, 2.0 * Math.PI,
	);
	ctx.fill();
}

const mainScene = new MainScene();

window.onmousemove = (event) => {
	const rect = canvas.getBoundingClientRect();
	mainScene.mousePos = [event.clientX - rect.left, event.clientY - rect.top];
};

window.onkeydown = (event) => {
	switch (event.code) {
		case "Digit1":
			mainScene.brake = true;
			break;
		case "Digit2":
			mainScene.gas = true;
			break;
	}
};

window.onkeyup = (event) => {
	switch (event.code) {
		case "Digit1":
			mainScene.brake = false;
			break;
		case "Digit2":
			mainScene.gas = false;
			break;
	}
};

window.setInterval(() => {
	mainScene.update();
	mainScene.render();
}, MS_PER_FRAME);
