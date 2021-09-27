// Supplementary math utilities.

const TAU = 2 * Math.PI;

const clamp = (n: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, n));
}

// Mathematical modulus. 0 <= (x mod m) < m for m > 0.
const mod = (x: number, m: number): number => {
	return (x % m + m) % m;
}

// 2D vector.
class Vec2 {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
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
class Segment2 {
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
class Angle {
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
