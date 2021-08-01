class Vec2 {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	length2() {
		return this.x * this.x + this.y * this.y;
	}

	length() {
		return Math.sqrt(this.length2());
	}

	plus(that) {
		return new Vec2(this.x + that.x, this.y + that.y);
	}

	minus(that) {
		return new Vec2(this.x - that.x, this.y - that.y);
	}

	times(t) {
		return new Vec2(t * this.x, t * this.y);
	}

	dot(that) {
		return this.x * that.x + this.y * that.y;
	}
}
