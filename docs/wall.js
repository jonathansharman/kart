export class Wall {
    constructor(loop) {
        this.loop = loop;
        this.path = loop.getPath();
    }
    projectPoint(p) {
        return this.loop.projectPoint(p);
    }
    containsPoint(p) {
        return this.loop.containsPoint(p);
    }
    draw(ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fill(this.path);
    }
}
