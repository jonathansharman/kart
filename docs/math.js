// Supplementary math utilities.
export const TAU = 2 * Math.PI;
export const clamp = (n, min, max) => {
    return Math.max(min, Math.min(max, n));
};
// Maps n in domain [min, max] linearly to range [min, max].
export const mapToRange = (n, domain, range) => {
    return range[0] + (n - domain[0]) / (domain[1] - domain[0]) * range[1];
};
// Mathematical modulus. 0 <= (x mod m) < m for m > 0.
export const mod = (x, m) => {
    return (x % m + m) % m;
};
// 2D vector.
export class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static fromPolar(length, angle) {
        return new Vec2(angle.cos(), angle.sin()).times(length);
    }
    length2() {
        return this.x * this.x + this.y * this.y;
    }
    length() {
        return Math.sqrt(this.length2());
    }
    normalized() {
        return this.dividedBy(this.length());
    }
    normalizedTo(length) {
        return this.times(length).dividedBy(this.length());
    }
    plus(that) {
        return new Vec2(this.x + that.x, this.y + that.y);
    }
    minus(that) {
        return new Vec2(this.x - that.x, this.y - that.y);
    }
    times(factor) {
        return new Vec2(this.x * factor, this.y * factor);
    }
    dividedBy(divisor) {
        return new Vec2(this.x / divisor, this.y / divisor);
    }
    negated() {
        return new Vec2(-this.x, -this.y);
    }
    dot(that) {
        return this.x * that.x + this.y * that.y;
    }
    rotated(radians) {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }
    rotatedQuarter() {
        return new Vec2(-this.y, this.x);
    }
    rotatedThreeQuarters() {
        return new Vec2(this.y, -this.x);
    }
    // A new Vec2 in the same direction as this Vec2 with length extended the
    // given amount. Undefined for the zero vector. Negative extension is
    // supported.
    extended(extension) {
        let l = this.length();
        return this.times(l + extension).dividedBy(l);
    }
}
// 2D line segment from start to end.
export class Segment2 {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.offset = end.minus(start);
    }
    // The square of the shortest distance from this segment to point p.
    pointDistance2(p) {
        if (this.start === this.end) {
            return p.minus(this.start).length2();
        }
        const t = clamp(p.minus(this.start).dot(this.offset) / this.offset.length2(), 0.0, 1.0);
        return p.minus(this.start.plus(this.offset.times(t))).length2();
    }
}
export class Disk {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
}
// Maintains an angle in radians, normalized to [0, tau).
export class Angle {
    constructor(radians) {
        this.radians = mod(radians, TAU);
    }
    // An angle in the direction of v.
    static fromVec2(v) {
        return new Angle(Math.atan2(v.y, v.x));
    }
    // The angle in radians in [0, tau).
    get() {
        return this.radians;
    }
    // The angle in radians in [-pi, pi).
    getNegativePiToPi() {
        //return this.radians > Math.PI ? -Math.PI + this.radians % Math.PI : this.radians;
        return this.radians > Math.PI ? this.radians - TAU : this.radians;
    }
    sin() {
        return Math.sin(this.radians);
    }
    cos() {
        return Math.cos(this.radians);
    }
    tan() {
        return Math.tan(this.radians);
    }
    plus(radians) {
        return new Angle(this.radians + radians);
    }
    minus(radians) {
        return new Angle(this.radians - radians);
    }
    times(factor) {
        return new Angle(this.radians * factor);
    }
    dividedBy(divisor) {
        return new Angle(this.radians / divisor);
    }
    negated() {
        return new Angle(-this.radians);
    }
    // The most acute angle that when added to this is equal to target.
    smallestAngleTo(target) {
        const a = mod(target.radians - this.radians, TAU);
        const b = mod(this.radians - target.radians, TAU);
        return new Angle(a < b ? a : -b);
    }
}
export class Ray2 {
    constructor(origin, angle) {
        this.origin = origin;
        this.angle = angle;
    }
}
export class CubicBezier {
    constructor(start, end, cp1, cp2) {
        this.start = start;
        this.end = end;
        this.cp1 = cp1;
        this.cp2 = cp2;
    }
    // The point on the curve at the given t in [0, 1].
    at(t) {
        return this.start.times((1 - t) * (1 - t) * (1 - t))
            .plus(this.cp1.times(3 * (1 - t) * (1 - t) * t))
            .plus(this.cp2.times(3 * (1 - t) * t * t))
            .plus(this.end.times(t * t * t));
    }
    // The derivative of the curve at the given t in [0, 1].
    derivativeAt(t) {
        return this.start.times(-3 * (1 - t) * (1 - t))
            .plus(this.cp1.times(3 * (1 - t) * (1 - t)))
            .minus(this.cp1.times(6 * t * (1 - t)))
            .minus(this.cp2.times(3 * t * t))
            .plus(this.cp2.times(6 * t * (1 - t)))
            .plus(this.end.times(3 * t * t));
    }
    // The point on this Bezier curve closest to the given point, based on
    // sampling. The number of samples must be a positive integer.
    projectPoint(p, sampleCount = 100) {
        let minD2 = Infinity;
        let closest;
        for (let i = 0; i < sampleCount; ++i) {
            const q = this.at(i / (sampleCount - 1));
            const d2 = q.minus(p).length2();
            if (d2 < minD2) {
                minD2 = d2;
                closest = q;
            }
        }
        return closest;
    }
}
