import { CubicBezier, Vec2 } from "./math.js";
var SplineCorner = /** @class */ (function () {
    function SplineCorner(vertex, smoothness) {
        this.vertex = vertex;
        this.smoothness = smoothness;
    }
    return SplineCorner;
}());
export { SplineCorner };
export var corner = function (x, y, smoothness) {
    return new SplineCorner(new Vec2(x, y), smoothness);
};
var SplineLoop = /** @class */ (function () {
    function SplineLoop() {
        var corners = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            corners[_i] = arguments[_i];
        }
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
    // Whether the given point lies within this spline loop, based on sampling
    // using a variant of the winding number algorithm. The number of samples
    // must be a positive integer.
    SplineLoop.prototype.containsPoint = function (p, samplesPerSection) {
        if (samplesPerSection === void 0) { samplesPerSection = 100; }
        var lastQuadrant = this.quadrant(this.sections[0].at(0).minus(p));
        var winding = 0;
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var section = _a[_i];
            // Start at i = 1 since there's redundancy at the endpoints.
            for (var i = 1; i < samplesPerSection; ++i) {
                var q = section.at(i / (samplesPerSection - 1));
                var quadrant = this.quadrant(q.minus(p));
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
    };
    SplineLoop.prototype.quadrant = function (v) {
        if (v.y >= 0) {
            return v.x >= 0 ? 0 : 1;
        }
        else {
            return v.x <= 0 ? 2 : 3;
        }
    };
    // Whether p is within distance of this spline loop's boundary.
    SplineLoop.prototype.pointIsWithinDistance = function (p, distance) {
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var section = _a[_i];
            if (section.projectPoint(p).minus(p).length2() < distance * distance) {
                return true;
            }
        }
        return false;
    };
    // The point on this spline loop closest to the given point.
    SplineLoop.prototype.projectPoint = function (p) {
        // Find the projection of p onto this loop's sections that is closest to p.
        var nearest;
        var minDistance2 = Number.POSITIVE_INFINITY;
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var section = _a[_i];
            var projection = section.projectPoint(p);
            var distance2 = projection.minus(p).length2();
            if (projection.minus(p).length2() < minDistance2) {
                nearest = projection;
                minDistance2 = distance2;
            }
        }
        return nearest;
    };
    SplineLoop.prototype.getPath = function () {
        var path = new Path2D();
        var start = this.sections[0].start;
        path.moveTo(start.x, start.y);
        for (var _i = 0, _a = this.sections; _i < _a.length; _i++) {
            var section = _a[_i];
            path.bezierCurveTo(section.cp1.x, section.cp1.y, section.cp2.x, section.cp2.y, section.end.x, section.end.y);
        }
        path.closePath();
        return path;
    };
    return SplineLoop;
}());
export { SplineLoop };
