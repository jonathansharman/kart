import { SplineLoop } from "./spline.js"
import { Vec2 } from "./math.js";

export class Wall {
	private loop: SplineLoop;
	private path: Path2D;

	constructor(loop: SplineLoop) {
		this.loop = loop;
		this.path = loop.getPath();
	}

	projectPoint(p: Vec2): Vec2 {
		return this.loop.projectPoint(p);
	}

	containsPoint(p: Vec2): boolean {
		return this.loop.containsPoint(p);
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		ctx.fill(this.path);
	}
}
