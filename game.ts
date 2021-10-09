import { Bumper } from "./bumper.js";
import { Kart } from "./kart.js";
import { Angle, clamp, mod, TAU, Vec2 } from "./math.js";
import { Corner, Track } from "./track.js"

const UPDATES_PER_SEC = 60.0;
const MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const ACCELERATION = 0.05;
const ON_TRACK_DRAG = 0.01;
const OFF_TRACK_DRAG = 0.03;
const WALL_BOUNCE_LOSS = 0.3;

const MAX_STEERING_ANGLE = Math.PI / 6.0;

const TRACK_RADIUS = 50.0;

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
	debug: boolean = false;

	trackIdx: number = 0;

	controlScheme: ControlScheme = ControlScheme.GamepadFollow;
	mousePosClient: Vec2 = new Vec2(0.0, 0.0);
	mousePosWorld: Vec2 = new Vec2(0.0, 0.0);
	brake: boolean = false;
	gas: boolean = false;

	camera: Vec2 = new Vec2(0.0, 0.0);

	private kart: Kart = new Kart();

	private walls: Bumper[] = [
		new Bumper(15.0, new Vec2(300.0, 300.0)),
	];

	private onTrack: boolean;

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
					const leftSteering = clamp((deadAreaLeft - this.mousePosClient.x) / STEERING_WIDTH, 0.0, 1.0);
					// Right steering: 0 (left) to 1 (right)
					const rightSteering = clamp((this.mousePosClient.x - deadAreaRight) / STEERING_WIDTH, 0.0, 1.0);
					// Throttle: 0 (bottom) to 1 (top)
					throttle = clamp((controlAreaBottom - this.mousePosClient.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
					// Steering
					this.kart.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
				}
				break;
			case ControlScheme.MouseFollow:
				{
					const offset = this.mousePosWorld.minus(this.kart.pos);
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

		this.onTrack = tracks[this.trackIdx].containsPoint(this.kart.pos);

		// Drag
		const drag = this.onTrack ? ON_TRACK_DRAG : OFF_TRACK_DRAG;
		this.kart.speed -= drag * this.kart.speed;
		// Update heading and position.
		this.kart.heading = this.kart.heading.plus(this.kart.steering * this.kart.speed / 50.0);
		this.kart.pos = this.kart.pos.plus(Vec2.fromPolar(this.kart.speed, this.kart.heading));

		const offset = Vec2.fromPolar(20.0, this.kart.heading);
		this.kart.frontBumper.pos = this.kart.pos.plus(offset);
		this.kart.backBumper.pos = this.kart.pos.minus(offset);

		this.wallBumperCollision(this.kart.frontBumper);
		this.wallBumperCollision(this.kart.backBumper);

		this.camera = this.kart.pos;

		this.mousePosWorld = mainScene.mousePosClient
			.plus(mainScene.camera)
			.minus(new Vec2(0.5 * canvas.width, 0.5 * canvas.height));
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
		// Clear the drawing.
		ctx.fillStyle = "rgb(30, 100, 40)";
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fill();

		// Save the current ctx state and then apply the camera transform and draw the world.
		ctx.save();
		ctx.translate(0.5 * canvas.width - this.camera.x, 0.5 * canvas.height - this.camera.y);
		this.drawWorld();

		// Restore the ctx state to undo the camera transform and draw the UI.
		ctx.restore();
		this.drawUI();

		window.requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
			this.draw(timestamp);
		});
	}

	drawWorld() {
		tracks[this.trackIdx].drawWorld(ctx, this.debug);

		// Draw walls.
		for (const wall of this.walls) {
			wall.draw(ctx);
		}

		this.kart.draw(ctx, this.debug);

		// Draw the mouse's position in the world.
		if (this.debug) {
			ctx.beginPath();
			ctx.fillStyle = "red";
			ctx.ellipse(this.mousePosWorld.x, this.mousePosWorld.y, 5, 5, 0, 0, TAU);
			ctx.fill();
		}
	}

	private drawUI() {
		tracks[this.trackIdx].drawUI(ctx, this.debug);

		if (this.debug) {
			ctx.font = "20pt serif";
			const x = 10;
			const y = 70;
			if (this.onTrack) {
				ctx.fillStyle = "cyan";
				ctx.fillText("On track", x, y);
			} else {
				ctx.fillStyle = "red";
				ctx.fillText("Off track", x, y);
			}
		}

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
	}
}

const mainScene = new MainScene();

window.onmousemove = (event: MouseEvent) => {
	const rect = canvas.getBoundingClientRect();
	mainScene.mousePosClient.x = event.clientX - rect.left;
	mainScene.mousePosClient.y = event.clientY - rect.top;
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
