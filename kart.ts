import { Course } from "./course.js";
import { Angle, Disk, TAU, Vec2 } from "./math.js"
import { Wall } from "./wall.js";

const ACCELERATION = 0.05;
const ON_TRACK_DRAG = 0.01;
const OFF_TRACK_DRAG = 0.03;
const WALL_RESTITUTION = 0.7;

export class Kart {
	// Gas pedal, from 0 to 1.
	gas: number = 0.0;
	// Brake pedal, from 0 to 1.
	brake: number = 0.0;
	steering: number = 0.0;

	private pos: Vec2;
	private speed: number = 0.0;
	private heading: Angle;

	private frontBumper: Disk = new Disk(new Vec2(0.0, 0.0), 15.0);
	private backBumper: Disk = new Disk(new Vec2(0.0, 0.0), 10.0);

	constructor(pos: Vec2, heading: Angle) {
		this.pos = pos;
		this.heading = heading;
	}

	getPos(): Vec2 {
		return this.pos;
	}

	getSpeed(): number {
		return this.speed;
	}

	getHeading(): Angle {
		return this.heading;
	}

	update(course: Course) {
		// Apply gas and brake.
		this.speed -= ACCELERATION * this.brake;
		this.speed += ACCELERATION * this.gas;

		// Apply drag.
		const drag = course.track.containsPoint(this.pos) ? ON_TRACK_DRAG : OFF_TRACK_DRAG;
		this.speed *= 1.0 - drag;
		// Update heading and position.
		this.heading = this.heading.plus(this.steering * this.speed / 50.0);
		this.pos = this.pos.plus(Vec2.fromPolar(this.speed, this.heading));

		this.repositionBumpers();

		const frontCollision = this.bumperCollision(course.walls, this.frontBumper);
		const backCollision = this.bumperCollision(course.walls, this.backBumper);
		if (frontCollision || backCollision) {
			// There may be multiple collisions in a single frame, but the kart
			// should bounce at most once per frame.
			this.speed *= -WALL_RESTITUTION;
		}
	}

	private repositionBumpers() {
		const offset = Vec2.fromPolar(20.0, this.heading);
		this.frontBumper.center = this.pos.plus(offset);
		this.backBumper.center = this.pos.minus(offset);
	}

	private bumperCollision(walls: Wall[], bumper: Disk): boolean {
		let collided = false;
		for (let wall of walls) {
			const bumperToWall = wall.projectPoint(bumper.center).minus(bumper.center);
			if (wall.containsPoint(bumper.center)) {
				collided = true;
				// Push out from inside the wall (towards its boundary).
				this.pos = this.pos.plus(bumperToWall.extended(bumper.radius));
				this.repositionBumpers();
			} else if (bumperToWall.length2() < bumper.radius * bumper.radius) {
				collided = true;
				// Push away from outside the wall (away from its boundary).
				this.pos = this.pos.plus(bumperToWall.extended(-bumper.radius));
				this.repositionBumpers();
			}
		}
		return collided;
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
			this.drawBumper(ctx, this.frontBumper);
			this.drawBumper(ctx, this.backBumper);
		}

		const wheelRadius = 8.0;
		this.drawWheel(ctx, frontRight, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, frontLeft, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, backLeft, this.heading, wheelRadius, Math.PI / 6.0);
		this.drawWheel(ctx, backRight, this.heading, wheelRadius, Math.PI / 6.0);

		const chassis = new Path2D();
		chassis.moveTo(frontRight.x, frontRight.y);
		chassis.lineTo(frontLeft.x, frontLeft.y);
		chassis.lineTo(backLeft.x, backLeft.y);
		chassis.lineTo(backRight.x, backRight.y);
		chassis.closePath();
		ctx.fillStyle = "rgb(180, 0, 0)";
		ctx.fill(chassis);
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1.0;
		ctx.stroke(chassis);
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

	private drawBumper(ctx: CanvasRenderingContext2D, bumper: Disk) {
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		const path = new Path2D();
		path.ellipse(
			bumper.center.x, bumper.center.y,
			bumper.radius, bumper.radius,
			0.0,
			0.0, TAU,
		);
		ctx.fill(path);
	}
}
