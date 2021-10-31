import { CubicBezier, Vec2 } from "./math.js";

export class SplineCorner {
	vertex: Vec2;
	// Values outside [0, 1] may result in loops.
	smoothness: number;

	constructor(vertex: Vec2, smoothness: number) {
		this.vertex = vertex;
		this.smoothness = smoothness;
	}
}

export class SplineLoop {
	sections: CubicBezier[];

	constructor(corners: SplineCorner[]) {
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

		this.sections = [];
		for (let i = 0; i < corners.length; ++i) {
			const next = (i + 1) % corners.length;
			const start = corners[i].vertex;
			const end = corners[next].vertex;
			const l = end.minus(start).length() / 3;
			const cp1 = start.plus(forwardCPOffsets[i].times(corners[i].smoothness * l));
			const cp2 = end.minus(forwardCPOffsets[next].times(corners[next].smoothness * l));
			this.sections.push(new CubicBezier(start, end, cp1, cp2));
		}
	}

	pointIsWithinDistance(p: Vec2, distance: number): boolean {
		for (let curve of this.sections) {
			if (curve.projectPoint(p).minus(p).length2() < distance * distance) {
				return true;
			}
		}
		return false;
	}

	getPath(): Path2D {
		const path = new Path2D();
		const start = this.sections[0].start;
		path.moveTo(start.x, start.y);
		for (let curve of this.sections) {
			path.bezierCurveTo(
				curve.cp1.x, curve.cp1.y,
				curve.cp2.x, curve.cp2.y,
				curve.end.x, curve.end.y,
			);
		}
		path.closePath();
		return path;
	}
}
