import { Bumper } from "./bumper.js";
import { Angle, Vec2 } from "./math.js"
import { Track } from "./track.js";

const ACCELERATION = 0.05;
const ON_TRACK_DRAG = 0.01;
const OFF_TRACK_DRAG = 0.03;
const WALL_RESTITUTION = 0.7;

export class Kart {
	gas: number = 0.0;
	brake: number = 0.0;
	steering: number = 0.0;

	private pos: Vec2 = new Vec2(0.0, 0.0);
	private speed: number = 0.0;
	private heading: Angle = new Angle(0.0);

	private frontBumper: Bumper = new Bumper(15.0);
	private backBumper: Bumper = new Bumper(10.0);

	getPos(): Vec2 {
		return this.pos;
	}

	getSpeed(): number {
		return this.speed;
	}

	getHeading(): Angle {
		return this.heading;
	}

	update(track: Track, walls: Bumper[]) {
		// Apply gas and brake.
		this.speed -= ACCELERATION * this.brake;
		this.speed += ACCELERATION * this.gas;

		// Apply drag.
		const drag = track.containsPoint(this.pos) ? ON_TRACK_DRAG : OFF_TRACK_DRAG;
		this.speed *= 1.0 - drag;
		// Update heading and position.
		this.heading = this.heading.plus(this.steering * this.speed / 50.0);
		this.pos = this.pos.plus(Vec2.fromPolar(this.speed, this.heading));

		const offset = Vec2.fromPolar(20.0, this.heading);
		this.frontBumper.pos = this.pos.plus(offset);
		this.backBumper.pos = this.pos.minus(offset);

		this.bumperCollision(walls, this.frontBumper);
		this.bumperCollision(walls, this.backBumper);
	}

	private bumperCollision(walls: Bumper[], bumper: Bumper) {
		for (let wall of walls) {
			const r = bumper.radius + wall.radius;
			let offset = new Vec2(bumper.pos.x - wall.pos.x, bumper.pos.y - wall.pos.y);
			const d2 = offset.length2();
			if (d2 != 0.0 && d2 < r * r) {
				// Lose speed.
				this.speed *= -WALL_RESTITUTION;
				// Fix overlap.
				const d = Math.sqrt(d2);
				this.pos = this.pos.plus(offset.times((r - d) / d));
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D, debug: boolean) {
		const x = this.pos.x;
		const y = this.pos.y;

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
