import { TAU, Vec2 } from "./math.js";
var Bumper = /** @class */ (function () {
    function Bumper(radius, pos) {
        if (pos === void 0) { pos = new Vec2(0.0, 0.0); }
        this.radius = radius;
        this.pos = pos;
    }
    Bumper.prototype.draw = function (ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y, this.radius, this.radius, 0.0, 0.0, TAU);
        ctx.fill();
    };
    return Bumper;
}());
export { Bumper };
