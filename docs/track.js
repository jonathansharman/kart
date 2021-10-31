import { Vec2 } from "./math.js";
import { SplineCorner, SplineLoop } from "./spline.js";
var TRACK_RADIUS = 50.0;
var TRACK_BORDER = 2.0;
var Track = /** @class */ (function () {
    function Track(name, radius, loop) {
        this.name = name;
        this.radius = radius;
        this.loop = loop;
        this.path = loop.getPath();
    }
    Track.prototype.containsPoint = function (p) {
        return this.loop.pointIsWithinDistance(p, this.radius);
    };
    Track.prototype.drawWorld = function (ctx, debug) {
        ctx.lineJoin = "round";
        // Draw outline.
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2 * this.radius;
        ctx.stroke(this.path);
        // Draw fill.
        ctx.strokeStyle = "rgb(60, 60, 60)";
        ctx.lineWidth = 2 * (this.radius - TRACK_BORDER);
        ctx.stroke(this.path);
        if (debug) {
            // Draw the center of the path.
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.stroke(this.path);
            var even = true;
            for (var _i = 0, _a = this.loop.sections; _i < _a.length; _i++) {
                var curve = _a[_i];
                even = !even;
                // Draw Bezier curve "frame".
                ctx.strokeStyle = even ? "red" : "white";
                ctx.lineWidth = 2;
                var frame = new Path2D();
                frame.moveTo(curve.start.x, curve.start.y);
                frame.lineTo(curve.cp1.x, curve.cp1.y);
                frame.lineTo(curve.cp2.x, curve.cp2.y);
                frame.lineTo(curve.end.x, curve.end.y);
                ctx.stroke(frame);
            }
        }
    };
    Track.prototype.drawUI = function (ctx, debug) {
        if (debug) {
            ctx.font = "20pt serif";
            ctx.fillStyle = "white";
            ctx.fillText(this.name, 10, 30);
        }
    };
    return Track;
}());
export { Track };
export var TEST_TRACKS = [
    new Track("Serpentine", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(100, 100), 0.5),
        new SplineCorner(new Vec2(100, 668), 0.5),
        new SplineCorner(new Vec2(250, 668), 1.0),
        new SplineCorner(new Vec2(250, 200), 1.0),
        new SplineCorner(new Vec2(450, 200), 1.0),
        new SplineCorner(new Vec2(450, 668), 1.0),
        new SplineCorner(new Vec2(650, 668), 1.0),
        new SplineCorner(new Vec2(650, 200), 1.0),
        new SplineCorner(new Vec2(850, 200), 1.0),
        new SplineCorner(new Vec2(850, 668), 1.0),
        new SplineCorner(new Vec2(1000, 668), 0.5),
        new SplineCorner(new Vec2(1000, 100), 0.5),
    ])),
    new Track("Clockwise oval, tight turns", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(300, 300), 0.0),
        new SplineCorner(new Vec2(800, 300), 0.0),
        new SplineCorner(new Vec2(800, 500), 0.0),
        new SplineCorner(new Vec2(300, 500), 0.0),
    ])),
    new Track("Counter-clockwise oval", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(300, 300), 1.0),
        new SplineCorner(new Vec2(300, 500), 1.0),
        new SplineCorner(new Vec2(800, 500), 1.0),
        new SplineCorner(new Vec2(800, 300), 1.0),
    ])),
    new Track("Clockwise big track, tight turns", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(100, 100), 0.0),
        new SplineCorner(new Vec2(924, 100), 0.0),
        new SplineCorner(new Vec2(924, 668), 0.0),
        new SplineCorner(new Vec2(824, 668), 0.0),
        new SplineCorner(new Vec2(602, 568), 0.0),
        new SplineCorner(new Vec2(422, 568), 0.0),
        new SplineCorner(new Vec2(200, 668), 0.0),
        new SplineCorner(new Vec2(100, 668), 0.0),
    ])),
    new Track("Counter-clockwise big track", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(100, 100), 0.5),
        new SplineCorner(new Vec2(100, 668), 1.0),
        new SplineCorner(new Vec2(200, 668), 1.0),
        new SplineCorner(new Vec2(422, 568), 1.0),
        new SplineCorner(new Vec2(602, 568), 1.0),
        new SplineCorner(new Vec2(824, 668), 1.0),
        new SplineCorner(new Vec2(924, 668), 1.0),
        new SplineCorner(new Vec2(924, 100), 0.5),
    ])),
    new Track("Degenerate quad (triangle)", TRACK_RADIUS, new SplineLoop([
        new SplineCorner(new Vec2(300, 300), 1.0),
        new SplineCorner(new Vec2(300, 500), 1.0),
        new SplineCorner(new Vec2(800, 400), 1.0),
        new SplineCorner(new Vec2(800, 400), 1.0),
    ])),
];
