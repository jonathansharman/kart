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
