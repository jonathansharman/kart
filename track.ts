import { Vec2 } from "./math.js"
import { SplineLoop } from "./spline.js";

const TRACK_BORDER = 2.0;

// Represents a track/course/level of the game. Consists of the track/road
// itself and at least one wall.
export class Track {
	private radius: number;
	private loop: SplineLoop;
	private path: Path2D;

	constructor(radius: number, trackLoop: SplineLoop) {
		this.radius = radius;
		this.loop = trackLoop;
		this.path = trackLoop.getPath();
	}

	// Whether the given point is on the track.
	containsPoint(p: Vec2): boolean {
		return this.loop.pointIsWithinDistance(p, this.radius);
	}

	draw(ctx: CanvasRenderingContext2D, debug: boolean) {
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
		}
	}
}
