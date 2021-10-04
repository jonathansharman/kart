import { Bumper } from "./bumper.js";
import { Angle, Vec2 } from "./math.js"

export class Kart {
	pos: Vec2;
	speed: number;
	heading: Angle;
	steering: number;

	frontBumper: Bumper;
	backBumper: Bumper;

	constructor() {
		this.pos = new Vec2(0.0, 0.0);
		this.speed = 0.0;
		this.heading = new Angle(0.0);
		this.steering = 0.0;

		this.frontBumper = new Bumper(15.0);
		this.backBumper = new Bumper(10.0);
	}

	draw(ctx: CanvasRenderingContext2D, cameraPos: Vec2, debug: boolean) {
		const x = this.pos.x - cameraPos.x;
		const y = this.pos.y - cameraPos.y;

		const frontOffset = 25.0;
		const backOffset = 20.0;
		const frontAngleOffset = Math.PI / 10.0;
		const backAngleOffset = Math.PI / 5.0;
		const frontRight = new Vec2(
			x + frontOffset * this.heading.plus(frontAngleOffset).cos(),
			y + frontOffset * this.heading.plus(frontAngleOffset).sin(),
		);
		const frontLeft = new Vec2(
			x + frontOffset * this.heading.minus(frontAngleOffset).cos(),
			y + frontOffset * this.heading.minus(frontAngleOffset).sin(),
		);
		const backLeft = new Vec2(
			x + backOffset * this.heading.plus(Math.PI + backAngleOffset).cos(),
			y + backOffset * this.heading.plus(backAngleOffset + Math.PI).sin(),
		);
		const backRight = new Vec2(
			x + backOffset * this.heading.plus(Math.PI - backAngleOffset).cos(),
			y + backOffset * this.heading.minus(backAngleOffset - Math.PI).sin(),
		);

		if (debug) {
			this.frontBumper.draw(ctx);
			this.backBumper.draw(ctx);
		}

		const wheelRadius = 8.0;
		this.drawWheel(ctx, frontRight, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, frontLeft, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, backLeft, this.heading, wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, backRight, this.heading, wheelRadius, Math.PI / 6.0);

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
	}

	private drawWheel(ctx: CanvasRenderingContext2D, pos: Vec2, angle: Angle, radius: number, angleOffset: number) {
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
}
