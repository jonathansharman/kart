import { CubicBezier } from "./math.js";
var TRACK_BORDER = 2.0;
var Corner = /** @class */ (function () {
    function Corner(vertex, smoothness) {
        this.vertex = vertex;
        this.smoothness = smoothness;
    }
    return Corner;
}());
export { Corner };
var Track = /** @class */ (function () {
    function Track(name, radius, corners) {
        this.name = name;
        this.radius = radius;
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
        this.spline = [];
        for (var i = 0; i < corners.length; ++i) {
            var next = (i + 1) % corners.length;
            var start = corners[i].vertex;
            var end = corners[next].vertex;
            var l = end.minus(start).length() / 3;
            var cp1 = start.plus(forwardCPOffsets[i].times(corners[i].smoothness * l));
            var cp2 = end.minus(forwardCPOffsets[next].times(corners[next].smoothness * l));
            this.spline.push(new CubicBezier(start, end, cp1, cp2));
        }
    }
    Track.prototype.draw = function (ctx, debug) {
        this.drawSplines(ctx, this.radius, "black");
        this.drawSplines(ctx, this.radius - TRACK_BORDER, "rgb(60, 60, 60)");
        if (debug) {
            ctx.font = "20pt serif";
            ctx.fillStyle = "white";
            ctx.fillText(this.name, 10, 30);
            // Draw Bezier curve "frames".
            ctx.lineWidth = 1;
            var even = true;
            for (var _i = 0, _a = this.spline; _i < _a.length; _i++) {
                var curve = _a[_i];
                ctx.strokeStyle = even ? "red" : "white";
                even = !even;
                ctx.beginPath();
                ctx.moveTo(curve.start.x, curve.start.y);
                ctx.lineTo(curve.cp1.x, curve.cp1.y);
                ctx.lineTo(curve.cp2.x, curve.cp2.y);
                ctx.lineTo(curve.end.x, curve.end.y);
                ctx.stroke();
            }
        }
    };
    Track.prototype.drawSplines = function (ctx, radius, style) {
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.strokeStyle = style;
        ctx.lineWidth = 2 * radius;
        var start = this.spline[0].start;
        ctx.moveTo(start.x, start.y);
        for (var _i = 0, _a = this.spline; _i < _a.length; _i++) {
            var curve = _a[_i];
            ctx.bezierCurveTo(curve.cp1.x, curve.cp1.y, curve.cp2.x, curve.cp2.y, curve.end.x, curve.end.y);
        }
        ctx.closePath();
        ctx.stroke();
    };
    return Track;
}());
export { Track };
