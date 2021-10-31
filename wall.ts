import { SplineLoop } from "./spline.js"

export class Wall {
	private loop: SplineLoop;
	private path: Path2D;

	constructor(loop: SplineLoop) {
		this.loop = loop;
		this.path = loop.getPath();
	}

	drawWorld(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "black";
		ctx.fill(this.path);
	}
}
