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

export const corner = (x: number, y: number, smoothness: number): SplineCorner => {
	return new SplineCorner(new Vec2(x, y), smoothness);
}

export class SplineLoop {
	sections: CubicBezier[];

	constructor(...corners: SplineCorner[]) {
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

	// Whether the given point lies within this spline loop, based on sampling
	// using a variant of the winding number algorithm. The number of samples
	// must be a positive integer.
	containsPoint(p: Vec2, samplesPerSection: number = 100): boolean {
		let lastQuadrant = this.quadrant(this.sections[0].at(0).minus(p));
		let winding = 0;
		for (let section of this.sections) {
			// Start at i = 1 since there's redundancy at the endpoints.
			for (let i = 1; i < samplesPerSection; ++i) {
				const q = section.at(i / (samplesPerSection - 1));
				const quadrant = this.quadrant(q.minus(p));
				switch ((quadrant - lastQuadrant + 4) % 4) {
					case 0:
						break;
					case 1:
						++winding;
						break;
					case 2:
						// Crossed to the opposite quadrant. Treat this as non-containment.
						return false;
					case 3:
						--winding;
						break;
				}
				lastQuadrant = quadrant;
			}
		}
		return winding != 0;
	}

	private quadrant(v: Vec2): number {
		if (v.y >= 0) {
			return v.x >= 0 ? 0 : 1
		} else {
			return v.x <= 0 ? 2 : 3
		}
	}

	// Whether p is within distance of this spline loop's boundary.
	pointIsWithinDistance(p: Vec2, distance: number): boolean {
		for (let section of this.sections) {
			if (section.projectPoint(p).minus(p).length2() < distance * distance) {
				return true;
			}
		}
		return false;
	}

	// The point on this spline loop closest to the given point.
	projectPoint(p: Vec2): Vec2 {
		// Find the projection of p onto this loop's sections that is closest to p.
		let nearest: Vec2;
		let minDistance2 = Number.POSITIVE_INFINITY;
		for (let section of this.sections) {
			const projection = section.projectPoint(p);
			const distance2 = projection.minus(p).length2();
			if (projection.minus(p).length2() < minDistance2) {
				nearest = projection;
				minDistance2 = distance2;
			}
		}
		return nearest;
	}

	getPath(): Path2D {
		const path = new Path2D();
		const start = this.sections[0].start;
		path.moveTo(start.x, start.y);
		for (let section of this.sections) {
			path.bezierCurveTo(
				section.cp1.x, section.cp1.y,
				section.cp2.x, section.cp2.y,
				section.end.x, section.end.y,
			);
		}
		path.closePath();
		return path;
	}
}
