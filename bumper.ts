import { Vec2 } from "./math.js"

export class Bumper {
	radius: number;
	pos: Vec2;

	constructor(radius: number, pos = new Vec2(0.0, 0.0)) {
		this.radius = radius;
		this.pos = pos;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		ctx.beginPath();
		ctx.ellipse(
			this.pos.x, this.pos.y,
			this.radius, this.radius,
			0.0,
			0.0, 2.0 * Math.PI,
		);
		ctx.fill();
	}
}
