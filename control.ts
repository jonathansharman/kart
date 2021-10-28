import { Kart } from "./kart.js";
import { Angle, clamp, mapToRange, Vec2 } from "./math.js";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const MAX_STEERING_ANGLE = Math.PI / 6.0; // TODO: This should go in Kart.

// MouseAxes control scheme constants

const CONTROL_AREA_WIDTH = 400.0;
const CONTROL_AREA_HEIGHT = 300.0;

const DEAD_AREA_WIDTH = 75.0;

const STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);

// MouseFollow control scheme constants

const MAX_SPEED_DISTANCE = 300.0;

// Gamepad control constants

const STICK_DEAD_RADIUS = 0.25;
const STICK_STEERING_DRAG = 0.95;

export enum Device {
	Mouse,
	Gamepad,
}

export enum ControlMode {
	Axes,
	Follow,
}

export class Controller {
	device: Device;
	mode: ControlMode;

	private mousePosClient: Vec2 = new Vec2(0.0, 0.0);

	constructor(device: Device, mode: ControlMode) {
		this.device = device;
		this.mode = mode;

		// Mouse events
		window.addEventListener("mousemove", (event: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			this.mousePosClient.x = event.clientX - rect.left;
			this.mousePosClient.y = event.clientY - rect.top;
		});
		window.addEventListener("mousedown", (event: MouseEvent) => {
			switch (event.button) {
				case 0: // Left button
					return false;
				case 2: // Right button
					return false;
			}
		});
		window.addEventListener("mouseup", (event: MouseEvent) => {
			event.preventDefault();
			switch (event.button) {
				case 0: // Left button
					return false;
				case 2: // Right button
					return false;
			}
		});

		// Keyboard events
		window.addEventListener("keydown", (event: KeyboardEvent) => {
			switch (event.code) {
				case "Digit1":
					return false;
				case "Digit2":
					return false;
			}
		});
		window.addEventListener("keyup", (event: KeyboardEvent) => {
			event.preventDefault();
			switch (event.code) {
				case "Digit1":
					return false;
				case "Digit2":
					return false;
			}
		});
	}

	update(kart: Kart, camera: Vec2) {
		// Fall back to mouse controls if the gamepad is disconnected.
		let device = this.device;
		const gamepad = navigator.getGamepads()[0];
		if (!gamepad && device == Device.Gamepad) {
			device = Device.Mouse;
		}

		switch (device) {
			case Device.Mouse:
				switch (this.mode) {
					case ControlMode.Axes:
						{
							const controlAreaTop = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
							const controlAreaBottom = controlAreaTop + CONTROL_AREA_HEIGHT;
							const deadAreaLeft = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
							const deadAreaRight = deadAreaLeft + DEAD_AREA_WIDTH;
							// Left steering: 0 (right) to 1 (left)
							const leftSteering = clamp((deadAreaLeft - this.mousePosClient.x) / STEERING_WIDTH, 0.0, 1.0);
							// Right steering: 0 (left) to 1 (right)
							const rightSteering = clamp((this.mousePosClient.x - deadAreaRight) / STEERING_WIDTH, 0.0, 1.0);
							// Gas: 0 (bottom) to 1 (top)
							kart.gas = clamp((controlAreaBottom - this.mousePosClient.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
							// Steering
							kart.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
						}
						break;
					case ControlMode.Follow:
						{
							const mousePosWorld = this.mousePosClient
								.plus(camera)
								.minus(new Vec2(0.5 * canvas.width, 0.5 * canvas.height));
							const offset = mousePosWorld.minus(kart.getPos());
							const angle = Angle.fromVec2(offset);
							const distance = offset.length();
							kart.gas = Math.min(MAX_SPEED_DISTANCE, distance) / MAX_SPEED_DISTANCE;
							kart.steering = clamp(
								kart.getHeading().smallestAngleTo(angle).getNegativePiToPi(),
								-MAX_STEERING_ANGLE,
								MAX_STEERING_ANGLE,
							);
						}
						break;
				}
				break;
			case Device.Gamepad:
				switch (this.mode) {
					case ControlMode.Axes:
						kart.gas = gamepad.buttons[7].value;
						kart.brake = gamepad.buttons[6].value;
						// Steering
						const steeringAbs = MAX_STEERING_ANGLE * mapToRange(
							Math.abs(gamepad.axes[0]),
							[STICK_DEAD_RADIUS, 1.0],
							[0.0, 1.0],
						);
						if (gamepad.axes[0] < -STICK_DEAD_RADIUS) {
							kart.steering = -steeringAbs;
						} else if (gamepad.axes[0] > STICK_DEAD_RADIUS) {
							kart.steering = steeringAbs;
						} else {
							kart.steering *= STICK_STEERING_DRAG;
						}
						break;
					case ControlMode.Follow:
						{
							const offset = new Vec2(gamepad.axes[0], gamepad.axes[1]);
							const angle = Angle.fromVec2(offset);
							const length = offset.length();
							if (length > STICK_DEAD_RADIUS) {
								kart.gas = mapToRange(length, [STICK_DEAD_RADIUS, 1.0], [0.0, 1.0]);
								kart.steering = clamp(
									kart.getHeading().smallestAngleTo(angle).getNegativePiToPi(),
									-MAX_STEERING_ANGLE,
									MAX_STEERING_ANGLE,
								);
							} else {
								kart.gas = 0.0;
								kart.steering *= STICK_STEERING_DRAG;
							}
						}
						break;
				}
				break;
		}
	}

	drawUI(ctx: CanvasRenderingContext2D) {
		// Draw control area when in MouseAxes control mode.
		if (this.device == Device.Mouse && this.mode == ControlMode.Axes) {
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
