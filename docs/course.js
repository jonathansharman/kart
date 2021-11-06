import { corner, SplineLoop } from "./spline.js";
import { Track } from "./track.js";
import { Wall } from "./wall.js";
var Course = /** @class */ (function () {
    function Course(name, track, walls) {
        this.name = name;
        this.track = track;
        this.walls = walls;
    }
    Course.prototype.drawWorld = function (ctx, debug) {
        this.track.draw(ctx, debug);
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            wall.draw(ctx);
        }
    };
    Course.prototype.drawUI = function (ctx, debug) {
        if (debug) {
            ctx.font = "20pt serif";
            ctx.fillStyle = "white";
            ctx.fillText(this.name, 10, 30);
        }
    };
    return Course;
}());
export { Course };
var TRACK_RADIUS = 50.0;
export var TEST_COURSES = [
    new Course("Serpentine", new Track(TRACK_RADIUS, new SplineLoop(corner(100, 100, 0.5), corner(100, 668, 0.5), corner(250, 668, 1.0), corner(250, 200, 1.0), corner(450, 200, 1.0), corner(450, 668, 1.0), corner(650, 668, 1.0), corner(650, 200, 1.0), corner(850, 200, 1.0), corner(850, 668, 1.0), corner(1000, 668, 0.5), corner(1000, 100, 0.5))), []),
    new Course("Clockwise oval, tight turns", new Track(TRACK_RADIUS, new SplineLoop(corner(300, 300, 0.0), corner(800, 300, 0.0), corner(800, 500, 0.0), corner(300, 500, 0.0))), [
        new Wall(new SplineLoop(corner(350, 350, 0.0), corner(750, 350, 0.0), corner(750, 450, 0.0), corner(350, 450, 0.0)))
    ]),
    new Course("Counter-clockwise oval", new Track(TRACK_RADIUS, new SplineLoop(corner(300, 300, 1.0), corner(300, 500, 1.0), corner(800, 500, 1.0), corner(800, 300, 1.0))), [
        new Wall(new SplineLoop(corner(350, 350, 1.0), corner(350, 450, 1.0), corner(750, 450, 1.0), corner(750, 350, 1.0)))
    ]),
    new Course("Clockwise big track, tight turns", new Track(TRACK_RADIUS, new SplineLoop(corner(0, 0, 0.0), corner(1000, 0, 0.0), corner(1000, 600, 0.0), corner(900, 600, 0.0), corner(700, 500, 0.0), corner(300, 500, 0.0), corner(100, 600, 0.0), corner(0, 600, 0.0))), [
        new Wall(new SplineLoop(corner(100, 100, 0.0), corner(900, 100, 0.0), corner(900, 490, 0.0), corner(725, 400, 0.0), corner(275, 400, 0.0), corner(100, 490, 0.0)))
    ]),
    new Course("Counter-clockwise big track", new Track(TRACK_RADIUS, new SplineLoop(corner(0, 0, 0.5), corner(0, 600, 1.0), corner(100, 600, 1.0), corner(300, 500, 1.0), corner(700, 500, 1.0), corner(900, 600, 1.0), corner(1000, 600, 1.0), corner(1000, 0, 0.5))), [
        new Wall(new SplineLoop(corner(75, 75, 0.5), corner(50, 500, 0.5), corner(275, 400, 1.0), corner(725, 400, 1.0), corner(950, 500, 0.5), corner(925, 75, 0.5)))
    ]),
    new Course("Degenerate quad (triangle)", new Track(TRACK_RADIUS, new SplineLoop(corner(300, 300, 1.0), corner(300, 500, 1.0), corner(800, 400, 1.0), corner(800, 400, 1.0))), []),
];
