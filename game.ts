import { Controller, ControlMode, Device } from "./control.js";
import { Course, COURSE_ZONES, TEST_COURSES } from "./course.js";
import { Kart } from "./kart.js";
import { mod, Vec2 } from "./math.js";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

const UPDATES_PER_SEC = 60.0;
const MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;

class Game {
	private debug: boolean = false;

	private courseIdx: number = 3;
	private course: Course = TEST_COURSES[this.courseIdx];

	private kart: Kart;

	private lastZone: number = 0;
	private subLaps: number = 0;
	private laps: number = 0;

	private controller: Controller = new Controller(Device.Gamepad, ControlMode.Follow);

	private camera: Vec2 = new Vec2(0.0, 0.0);

	constructor() {
		const startingRay = this.course.track.startingRay
		this.kart = new Kart(startingRay.origin, startingRay.angle);

		// Add debug event listeners.
		window.addEventListener("keydown", (event: KeyboardEvent) => {
			switch (event.code) {
				case "KeyD":
					this.debug = !this.debug;
					return false;
				case "ArrowLeft":
					{
						this.courseIdx = mod(this.courseIdx - 1, TEST_COURSES.length);
						this.course = TEST_COURSES[this.courseIdx];
						const startingRay = this.course.track.startingRay;
						this.kart = new Kart(startingRay.origin, startingRay.angle);
						this.lastZone = 0;
						this.subLaps = 0;
						this.laps = 0;
						return false;
					}
				case "ArrowRight":
					{
						this.courseIdx = mod(this.courseIdx + 1, TEST_COURSES.length);
						this.course = TEST_COURSES[this.courseIdx];
						const startingRay = this.course.track.startingRay;
						this.kart = new Kart(startingRay.origin, startingRay.angle);
						this.lastZone = 0;
						this.subLaps = 0;
						this.laps = 0;
						return false;
					}
			}
		});

		// Update loop
		window.setInterval(this.update.bind(this), MS_PER_UPDATE);

		// Render loop
		window.requestAnimationFrame(this.draw.bind(this));
	}

	update() {
		this.controller.update(this.kart, this.camera);
		this.kart.update(this.course);
		this.camera = this.kart.getPos();

		const zone = this.course.zone(this.kart.getPos());
		switch ((zone - this.lastZone + COURSE_ZONES) % COURSE_ZONES) {
			case COURSE_ZONES - 1:
				--this.subLaps;
				break;
			case 1:
				++this.subLaps;
				break;
		}
		if (this.subLaps >= COURSE_ZONES) {
			this.subLaps -= COURSE_ZONES;
			++this.laps;
		} else if (this.subLaps < -COURSE_ZONES) {
			this.subLaps += COURSE_ZONES;
		}
		this.lastZone = zone;
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

		window.requestAnimationFrame(this.draw.bind(this));
	}

	private drawWorld() {
		this.course.drawWorld(ctx, this.debug);

		this.kart.draw(ctx, this.debug);
	}

	private drawUI() {
		this.course.drawUI(ctx, this.debug);

		this.controller.drawUI(ctx, this.debug);

		if (this.debug) {
			ctx.font = "20pt serif";

			let trackText;
			if (this.course.track.containsPoint(this.kart.getPos())) {
				ctx.fillStyle = "cyan";
				trackText = "On track";
			} else {
				ctx.fillStyle = "red";
				trackText = "Off track";
			}
			ctx.fillText(trackText, 10, 70);

			ctx.fillStyle = "black";
			ctx.fillText("Zone " + this.course.zone(this.kart.getPos()), 10, 110);

			ctx.fillStyle = "black";
			ctx.fillText("Sublaps " + this.subLaps, 10, 150);

			ctx.fillStyle = "black";
			ctx.fillText("Laps " + this.laps, 10, 190);
		}
	}
}

// Disable context menu on right-click.
window.oncontextmenu = () => false;

// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	return false;
});

// Start the game.
new Game();
