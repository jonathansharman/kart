import { CubicBezier, Vec2 } from "./math.js"

const TRACK_BORDER = 2.0;

export class Corner {
	vertex: Vec2;
	// Values outside [0, 1] may result in loops.
	smoothness: number;

	constructor(vertex: Vec2, smoothness: number) {
		this.vertex = vertex;
		this.smoothness = smoothness;
	}
}

export class Track {
	private name: string;
	private radius: number;
	private spline: CubicBezier[];

	constructor(name: string, radius: number, corners: Corner[]) {
		this.name = name;
		this.radius = radius;
		// Build a list of unit offset vectors from each vertex to its control
		// point in the forward direction.
		let forwardCPOffsets: Vec2[] = [];
		for (let i = 0; i < corners.length; ++i) {
			const v = corners[i].vertex;
			const vPrev = corners[(i - 1 + corners.length) % corners.length].vertex;
			const vNext = corners[(i + 1) % corners.length].vertex;
			const fromPrev = v.minus(vPrev);
			const toNext = vNext.minus(v);
			// Get a vector bisecting the angle of the corner.
			const bisector = fromPrev.times(toNext.length()).plus(toNext.times(-fromPrev.length()));
			// Use the z-coordinate of the cross product to determine if it's a
			// left or right turn and therefore which way to rotate the offset.
			const crossZ = fromPrev.x * toNext.y - fromPrev.y * toNext.x;
			const rotated = crossZ > 0 ? bisector.rotatedQuarter() : bisector.rotatedThreeQuarters();
			forwardCPOffsets.push(rotated.normalized());
		}

		this.spline = [];
		for (let i = 0; i < corners.length; ++i) {
			const next = (i + 1) % corners.length;
			const start = corners[i].vertex;
			const end = corners[next].vertex;
			const l = end.minus(start).length() / 3;
			const cp1 = start.plus(forwardCPOffsets[i].times(corners[i].smoothness * l));
			const cp2 = end.minus(forwardCPOffsets[next].times(corners[next].smoothness * l));
			this.spline.push(new CubicBezier(start, end, cp1, cp2));
		}
	}

	drawWorld(ctx: CanvasRenderingContext2D, debug: boolean) {
		this.drawSplines(ctx, this.radius, "black");
		this.drawSplines(ctx, this.radius - TRACK_BORDER, "rgb(60, 60, 60)");

		if (debug) {
			// Draw Bezier curve "frames".
			ctx.lineWidth = 1;
			let even = true;
			for (let curve of this.spline) {
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
	}

	drawUI(ctx: CanvasRenderingContext2D, debug: boolean) {
		if (debug) {
			ctx.font = "20pt serif";
			ctx.fillStyle = "white";
			ctx.fillText(this.name, 10, 30);
		}
	}

	private drawSplines(ctx: CanvasRenderingContext2D, radius: number, style: string) {
		ctx.beginPath();
		ctx.lineJoin = "round";
		ctx.strokeStyle = style;
		ctx.lineWidth = 2 * radius;
		const start = this.spline[0].start;
		ctx.moveTo(start.x, start.y);
		for (let curve of this.spline) {
			ctx.bezierCurveTo(
				curve.cp1.x,
				curve.cp1.y,
				curve.cp2.x,
				curve.cp2.y,
				curve.end.x,
				curve.end.y,
			);
		}
		ctx.closePath();
		ctx.stroke();
	}
}
