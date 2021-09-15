// Supplementary math utilities.
var TAU = 2 * Math.PI;
var clamp = function (n, min, max) {
    return Math.max(min, Math.min(max, n));
};
// Mathematical modulus. 0 <= (x mod m) < m for m > 0.
var mod = function (x, m) {
    return (x % m + m) % m;
};
// 2D vector.
var Vec2 = /** @class */ (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.length2 = function () {
        return this.x * this.x + this.y * this.y;
    };
    Vec2.prototype.length = function () {
        return Math.sqrt(this.length2());
    };
    Vec2.prototype.plus = function (that) {
        return new Vec2(this.x + that.x, this.y + that.y);
    };
    Vec2.prototype.minus = function (that) {
        return new Vec2(this.x - that.x, this.y - that.y);
    };
    Vec2.prototype.times = function (t) {
        return new Vec2(t * this.x, t * this.y);
    };
    Vec2.prototype.dot = function (that) {
        return this.x * that.x + this.y * that.y;
    };
    return Vec2;
}());
// 2D line segment from start to end.
var Segment2 = /** @class */ (function () {
    function Segment2(start, end) {
        this.start = start;
        this.end = end;
        this.offset = end.minus(start);
    }
    // The square of the shortest distance from this segment to point p.
    Segment2.prototype.pointDistance2 = function (p) {
        if (this.start === this.end) {
            return p.minus(this.start).length2();
        }
        var t = clamp(p.minus(this.start).dot(this.offset) / this.offset.length2(), 0.0, 1.0);
        return p.minus(this.start.plus(this.offset.times(t))).length2();
    };
    return Segment2;
}());
// Maintains an angle in radians, normalized to [0, tau).
var Angle = /** @class */ (function () {
    function Angle(radians) {
        this.radians = mod(radians, TAU);
    }
    // An angle in the direction of v.
    Angle.fromVec2 = function (v) {
        return new Angle(Math.atan2(v.y, v.x));
    };
    // The angle in radians in [0, tau).
    Angle.prototype.get = function () {
        return this.radians;
    };
    // The angle in radians in [-pi, pi).
    Angle.prototype.getNegativePiToPi = function () {
        //return this.radians > Math.PI ? -Math.PI + this.radians % Math.PI : this.radians;
        return this.radians > Math.PI ? this.radians - TAU : this.radians;
    };
    Angle.prototype.sin = function () {
        return Math.sin(this.radians);
    };
    Angle.prototype.cos = function () {
        return Math.cos(this.radians);
    };
    Angle.prototype.tan = function () {
        return Math.tan(this.radians);
    };
    Angle.prototype.plus = function (radians) {
        return new Angle(this.radians + radians);
    };
    Angle.prototype.minus = function (radians) {
        return new Angle(this.radians - radians);
    };
    Angle.prototype.times = function (factor) {
        return new Angle(this.radians * factor);
    };
    Angle.prototype.negated = function () {
        return new Angle(-this.radians);
    };
    // The most acute angle that when added to this is equal to target.
    Angle.prototype.smallestAngleTo = function (target) {
        var a = mod(target.radians - this.radians, TAU);
        var b = mod(this.radians - target.radians, TAU);
        return new Angle(a < b ? a : -b);
    };
    return Angle;
}());
