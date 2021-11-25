import { Angle, Ray2, TAU, Vec2 } from "./math.js";
const TRACK_BORDER = 2.0;
const STARTING_LINE_WIDTH = 5.0;
const ARROW_FORWARD_OFFSET = -20.0;
const ARROW_SIDE_OFFSET_FACTOR = 0.7;
const ARROW_HALF_WIDTH = 4.0;
const ARROW_LENGTH = 10.0;
// Represents a track/course/level of the game. Consists of the track/road
// itself and at least one wall.
export class Track {
    constructor(radius, startingT, trackLoop) {
        this.radius = radius;
        this.loop = trackLoop;
        this.loopPath = trackLoop.getPath();
        const startPos = this.loop.at(startingT);
        const startDerivative = this.loop.derivativeAt(startingT);
        this.startingRay = new Ray2(startPos, Angle.fromVec2(startDerivative));
        // Initialize starting line and arrow paths.
        {
            const lineUnit = startDerivative.rotatedQuarter().normalized();
            const lineOffset = lineUnit.times(radius - TRACK_BORDER);
            const lineStart = startPos.plus(lineOffset);
            const lineEnd = startPos.minus(lineOffset);
            this.startingLinePath = new Path2D();
            this.startingLinePath.moveTo(lineStart.x, lineStart.y);
            this.startingLinePath.lineTo(lineEnd.x, lineEnd.y);
            const startAngle = Angle.fromVec2(startDerivative);
            this.startingArrowPaths = [];
            const base = startPos.plus(startDerivative.normalizedTo(ARROW_FORWARD_OFFSET));
            const lineSideOffset = lineOffset.times(ARROW_SIDE_OFFSET_FACTOR);
            this.startingArrowPaths.push(this.getArrowPath(base.minus(lineSideOffset), startAngle));
            this.startingArrowPaths.push(this.getArrowPath(base, startAngle));
            this.startingArrowPaths.push(this.getArrowPath(base.plus(lineSideOffset), startAngle));
        }
    }
    getArrowPath(base, angle) {
        const path = new Path2D();
        const perpendicular = angle.plus(0.25 * TAU);
        const sideOffset = Vec2.fromPolar(ARROW_HALF_WIDTH, perpendicular);
        const p0 = base.plus(Vec2.fromPolar(ARROW_LENGTH, angle));
        const p1 = base.plus(sideOffset);
        const p2 = base.minus(sideOffset);
        path.moveTo(p0.x, p0.y);
        path.lineTo(p1.x, p1.y);
        path.lineTo(p2.x, p2.y);
        return path;
    }
    // Whether the given point is on the track.
    containsPoint(p) {
        return this.loop.pointIsWithinDistance(p, this.radius);
    }
    draw(ctx, debug) {
        ctx.lineJoin = "round";
        // Draw outline.
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2 * this.radius;
        ctx.stroke(this.loopPath);
        // Draw fill.
        ctx.strokeStyle = "rgb(60, 60, 60)";
        ctx.lineWidth = 2 * (this.radius - TRACK_BORDER);
        ctx.stroke(this.loopPath);
        // Draw starting line.
        ctx.strokeStyle = "white";
        ctx.lineWidth = STARTING_LINE_WIDTH;
        ctx.stroke(this.startingLinePath);
        ctx.fillStyle = "white";
        for (let arrowPath of this.startingArrowPaths) {
            ctx.fill(arrowPath);
        }
        if (debug) {
            // Draw the center of the path.
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.stroke(this.loopPath);
            let even = true;
            for (let section of this.loop.sections) {
                even = !even;
                // Draw Bezier curve "frame".
                ctx.strokeStyle = even ? "red" : "white";
                ctx.lineWidth = 2;
                const frame = new Path2D();
                frame.moveTo(section.start.x, section.start.y);
                frame.lineTo(section.cp1.x, section.cp1.y);
                frame.lineTo(section.cp2.x, section.cp2.y);
                frame.lineTo(section.end.x, section.end.y);
                ctx.stroke(frame);
            }
            const startingVectorPath = new Path2D();
            startingVectorPath.moveTo(this.startingRay.origin.x, this.startingRay.origin.y);
            const end = this.startingRay.origin.plus(Vec2.fromPolar(100.0, this.startingRay.angle));
            startingVectorPath.lineTo(end.x, end.y);
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2;
            ctx.stroke(startingVectorPath);
            const originPath = new Path2D();
            originPath.ellipse(this.startingRay.origin.x, this.startingRay.origin.y, 5, 5, 0, 0, TAU);
            ctx.fillStyle = "blue";
            ctx.fill(originPath);
        }
    }
}
