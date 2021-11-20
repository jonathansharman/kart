import { Angle, Ray2, TAU, Vec2 } from "./math.js";
import { corner, SplineLoop } from "./spline.js";
import { Track } from "./track.js";
import { Wall } from "./wall.js";

export const COURSE_ZONES = 3;

export class Course {
	name: string;
	track: Track;
	walls: Wall[];

	private lapRay: Ray2;

	constructor(name: string, originOffset: number, track: Track, walls: Wall[]) {
		this.name = name;
		this.track = track;
		this.walls = walls;

		// Initialize lap ray.
		const offsetToLapOrigin = Vec2.fromPolar(originOffset, this.track.startingRay.angle.plus(-0.25 * TAU));
		const lapRayOrigin = this.track.startingRay.origin.plus(offsetToLapOrigin);
		this.lapRay = new Ray2(lapRayOrigin, Angle.fromVec2(this.track.startingRay.origin.minus(lapRayOrigin)));
	}

	// The course is partitioned by the lap ray and starting ray into three
	// zones, numbered 0-2.
	zone(p: Vec2): number {
		const v = p.minus(this.lapRay.origin);
		if (v.dot(Vec2.fromPolar(1.0, this.track.startingRay.angle)) >= 0.0) {
			return 0;
		} else if (v.dot(Vec2.fromPolar(1.0, this.lapRay.angle)) <= 0.0) {
			return 1;
		} else {
			return 2;
		}
	}

	drawWorld(ctx: CanvasRenderingContext2D, debug: boolean) {
		this.track.draw(ctx, debug);
		for (let wall of this.walls) {
			wall.draw(ctx);
		}
		if (debug) {
			const vectorPath = new Path2D();
			vectorPath.moveTo(this.lapRay.origin.x, this.lapRay.origin.y);
			const end = this.lapRay.origin.plus(Vec2.fromPolar(100.0, this.lapRay.angle));
			vectorPath.lineTo(end.x, end.y);
			ctx.strokeStyle = "lime";
			ctx.lineWidth = 2;
			ctx.stroke(vectorPath);

			const originPath = new Path2D();
			originPath.ellipse(this.lapRay.origin.x, this.lapRay.origin.y, 5, 5, 0, 0, TAU);
			ctx.fillStyle = "lime";
			ctx.fill(originPath);
		}
	}

	drawUI(ctx: CanvasRenderingContext2D, debug: boolean) {
		if (debug) {
			ctx.font = "20pt serif";
			ctx.fillStyle = "white";
			ctx.fillText(this.name, 10, 30);
		}
	}
}

const TRACK_RADIUS = 50.0;

export const TEST_COURSES: Course[] = [
	new Course(
		"Serpentine",
		500.0,
		new Track(
			TRACK_RADIUS,
			0.88,
			new SplineLoop(
				corner(100, 100, 0.5),
				corner(100, 668, 0.5),
				corner(250, 668, 1.0),
				corner(250, 200, 1.0),
				corner(450, 200, 1.0),
				corner(450, 668, 1.0),
				corner(650, 668, 1.0),
				corner(650, 200, 1.0),
				corner(850, 200, 1.0),
				corner(850, 668, 1.0),
				corner(1000, 668, 0.5),
				corner(1000, 100, 0.5),
			),
		),
		[],
	),
	new Course(
		"Clockwise oval, tight turns",
		-100.0,
		new Track(
			TRACK_RADIUS,
			0.125,
			new SplineLoop(
				corner(300, 300, 0.0),
				corner(800, 300, 0.0),
				corner(800, 500, 0.0),
				corner(300, 500, 0.0),
			),
		),
		[
			new Wall(new SplineLoop(
				corner(350, 350, 0.0),
				corner(750, 350, 0.0),
				corner(750, 450, 0.0),
				corner(350, 450, 0.0),
			))
		],
	),
	new Course(
		"Counter-clockwise oval",
		150.0,
		new Track(
			TRACK_RADIUS,
			0.0,
			new SplineLoop(
				corner(300, 300, 1.0),
				corner(300, 500, 1.0),
				corner(800, 500, 1.0),
				corner(800, 300, 1.0),
			),
		),
		[
			new Wall(new SplineLoop(
				corner(350, 350, 1.0),
				corner(350, 450, 1.0),
				corner(750, 450, 1.0),
				corner(750, 350, 1.0),
			))
		],
	),
	new Course(
		"Clockwise big track, tight turns",
		-200.0,
		new Track(
			TRACK_RADIUS,
			0.0625,
			new SplineLoop(
				corner(0, 0, 0.0),
				corner(1000, 0, 0.0),
				corner(1000, 600, 0.0),
				corner(900, 600, 0.0),
				corner(700, 500, 0.0),
				corner(300, 500, 0.0),
				corner(100, 600, 0.0),
				corner(0, 600, 0.0),
			),
		),
		[
			new Wall(new SplineLoop(
				corner(100, 100, 0.0),
				corner(900, 100, 0.0),
				corner(900, 490, 0.0),
				corner(725, 400, 0.0),
				corner(275, 400, 0.0),
				corner(100, 490, 0.0),
			))
		],
	),
	new Course(
		"Counter-clockwise big track",
		400.0,
		new Track(
			TRACK_RADIUS,
			0.0,
			new SplineLoop(
				corner(0, 0, 0.5),
				corner(0, 600, 1.0),
				corner(100, 600, 1.0),
				corner(300, 500, 1.0),
				corner(700, 500, 1.0),
				corner(900, 600, 1.0),
				corner(1000, 600, 1.0),
				corner(1000, 0, 0.5),
			),
		),
		[
			new Wall(new SplineLoop(
				corner(75, 75, 0.5),
				corner(50, 500, 0.5),
				corner(275, 400, 1.0),
				corner(725, 400, 1.0),
				corner(950, 500, 0.5),
				corner(925, 75, 0.5),
			))
		],
	),
	new Course(
		"Degenerate quad (triangle)",
		500.0,
		new Track(
			TRACK_RADIUS,
			0.0,
			new SplineLoop(
				corner(300, 300, 1.0),
				corner(300, 500, 1.0),
				corner(800, 400, 1.0),
				corner(800, 400, 1.0),
			),
		),
		[],
	),
];
