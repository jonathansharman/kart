import { CubicBezier } from "./math.js";
var SplineCorner = /** @class */ (function () {
    function SplineCorner(vertex, smoothness) {
        this.vertex = vertex;
        this.smoothness = smoothness;
    }
    return SplineCorner;
}());
export { SplineCorner };
var SplineLoop = /** @class */ (function () {
    function SplineLoop(corners) {
        // Build a list of unit offset vectors from each vertex to its control
        // point in the forward direction.
        var forwardCPOffsets = [];
        for (var i = 0; i < corners.length; ++i) {
            var v = corners[i].vertex;
            var vPrev = corners[(i - 1 + corners.length) % corners.length].vertex;
            var vNext = corners[(i + 1) % corners.length].vertex;
            var fromPrev = v.minus(vPrev);
            var toNext = vNext.minus(v);
            // Get a vector bisecting the angle of the corner.
            var bisector = fromPrev.times(toNext.length()).plus(toNext.times(-fromPrev.length()));
            // Use the z-coordinate of the cross product to determine if it's a
            // left or right turn and therefore which way to rotate the offset.
            var crossZ = fromPrev.x * toNext.y - fromPrev.y * toNext.x;
            var rotated = crossZ > 0 ? bisector.rotatedQuarter() : bisector.rotatedThreeQuarters();
            forwardCPOffsets.push(rotated.normalized());
        }
        this.sections = [];
        for (var i = 0; i < corners.length; ++i) {
            var next = (i + 1) % corners.length;
            var start = corners[i].vertex;
            var end = corners[next].vertex;
            var l = end.minus(start).length() / 3;
            var cp1 = start.plus(forwardCPOffsets[i].times(corners[i].smoothness * l));
            var cp2 = end.minus(forwardCPOffsets[next].times(corners[next].smoothness * l));
            this.sections.push(new CubicBezier(start, end, cp1, cp2));
        }
    }
    SplineLoop.prototype.pointIsWithinDistance = function (p, distance) {
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var curve = _a[_i];
            if (curve.projectPoint(p).minus(p).length2() < distance * distance) {
                return true;
            }
        }
        return false;
    };
    SplineLoop.prototype.getPath = function () {
        var path = new Path2D();
        var start = this.sections[0].start;
        path.moveTo(start.x, start.y);
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var curve = _a[_i];
            path.bezierCurveTo(curve.cp1.x, curve.cp1.y, curve.cp2.x, curve.cp2.y, curve.end.x, curve.end.y);
        }
        path.closePath();
        return path;
    };
    return SplineLoop;
}());
export { SplineLoop };
