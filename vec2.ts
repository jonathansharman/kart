class Vec2 {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	length2(): number {
		return this.x * this.x + this.y * this.y;
	}

	length(): number {
		return Math.sqrt(this.length2());
	}

	plus(that: Vec2): Vec2 {
		return new Vec2(this.x + that.x, this.y + that.y);
	}

	minus(that: Vec2): Vec2 {
		return new Vec2(this.x - that.x, this.y - that.y);
	}

	times(t: number): Vec2 {
		return new Vec2(t * this.x, t * this.y);
	}

	dot(that: Vec2): number {
		return this.x * that.x + this.y * that.y;
	}
}
