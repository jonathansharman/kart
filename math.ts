// Supplementary math utilities.

export const TAU = 2 * Math.PI;

export const clamp = (n: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, n));
}

// Mathematical modulus. 0 <= (x mod m) < m for m > 0.
export const mod = (x: number, m: number): number => {
	return (x % m + m) % m;
}

// 2D vector.
export class Vec2 {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	static fromPolar(length: number, angle: Angle): Vec2 {
		return new Vec2(angle.cos(), angle.sin()).times(length);
	}

	length2(): number {
		return this.x * this.x + this.y * this.y;
	}

	length(): number {
		return Math.sqrt(this.length2());
	}

	normalized(): Vec2 {
		return this.dividedBy(this.length());
	}

	plus(that: Vec2): Vec2 {
		return new Vec2(this.x + that.x, this.y + that.y);
	}

	minus(that: Vec2): Vec2 {
		return new Vec2(this.x - that.x, this.y - that.y);
	}

	times(factor: number): Vec2 {
		return new Vec2(this.x * factor, this.y * factor);
	}

	dividedBy(divisor: number): Vec2 {
		return new Vec2(this.x / divisor, this.y / divisor);
	}

	negated(): Vec2 {
		return new Vec2(-this.x, -this.y);
	}

	dot(that: Vec2): number {
		return this.x * that.x + this.y * that.y;
	}

	rotated(radians: number): Vec2 {
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);
		return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
	}

	rotatedQuarter(): Vec2 {
		return new Vec2(-this.y, this.x);
	}

	rotatedThreeQuarters(): Vec2 {
		return new Vec2(this.y, -this.x);
	}
}

// 2D line segment from start to end.
export class Segment2 {
	public start: Vec2;
	public end: Vec2;
	private offset: Vec2;

	constructor(start: Vec2, end: Vec2) {
		this.start = start;
		this.end = end;
		this.offset = end.minus(start);
	}

	// The square of the shortest distance from this segment to point p.
	pointDistance2(p: Vec2): number {
		if (this.start === this.end) {
			return p.minus(this.start).length2();
		}
		const t = clamp(p.minus(this.start).dot(this.offset) / this.offset.length2(), 0.0, 1.0);
		return p.minus(this.start.plus(this.offset.times(t))).length2();
	}
}

// Maintains an angle in radians, normalized to [0, tau).
export class Angle {
	private radians: number;

	constructor(radians: number) {
		this.radians = mod(radians, TAU);
	}

	// An angle in the direction of v.
	static fromVec2(v: Vec2): Angle {
		return new Angle(Math.atan2(v.y, v.x));
	}

	// The angle in radians in [0, tau).
	get(): number {
		return this.radians;
	}

	// The angle in radians in [-pi, pi).
	getNegativePiToPi(): number {
		//return this.radians > Math.PI ? -Math.PI + this.radians % Math.PI : this.radians;
		return this.radians > Math.PI ? this.radians - TAU : this.radians;
	}

	sin(): number {
		return Math.sin(this.radians);
	}

	cos(): number {
		return Math.cos(this.radians);
	}

	tan(): number {
		return Math.tan(this.radians);
	}

	plus(radians: number): Angle {
		return new Angle(this.radians + radians);
	}

	minus(radians: number): Angle {
		return new Angle(this.radians - radians);
	}

	times(factor: number): Angle {
		return new Angle(this.radians * factor);
	}

	dividedBy(divisor: number): Angle {
		return new Angle(this.radians / divisor);
	}

	negated(): Angle {
		return new Angle(-this.radians);
	}

	// The most acute angle that when added to this is equal to target.
	smallestAngleTo(target: Angle): Angle {
		const a = mod(target.radians - this.radians, TAU);
		const b = mod(this.radians - target.radians, TAU);
		return new Angle(a < b ? a : -b);
	}
}

export class CubicBezier {
	start: Vec2;
	end: Vec2;
	cp1: Vec2;
	cp2: Vec2;

	constructor(start: Vec2, end: Vec2, cp1: Vec2, cp2: Vec2) {
		this.start = start;
		this.end = end;
		this.cp1 = cp1;
		this.cp2 = cp2;
	}

	// The point on the curve at the given t in [0, 1].
	at(t: number): Vec2 {
		return this.start.times((1 - t) * (1 - t) * (1 - t))
			.plus(this.cp1.times(3 * (1 - t) * (1 - t) * t))
			.plus(this.cp2.times(3 * (1 - t) * t * t))
			.plus(this.end.times(t * t * t));
	}

	// The point on this Bezier curve closest to the given point, based on
	// sampling. The number of samples must be a positive integer.
	projectPoint(p: Vec2, nSamples: number = 100): Vec2 {
		let minD2 = Infinity;
		let closest: Vec2;
		for (let i = 0; i < nSamples; ++i) {
			const q = this.at(i / (nSamples - 1));
			const d2 = q.minus(p).length2();
			if (d2 < minD2) {
				minD2 = d2;
				closest = q;
			}
		}
		return closest;
	}
}
