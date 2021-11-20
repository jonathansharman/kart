var Wall = /** @class */ (function () {
    function Wall(loop) {
        this.loop = loop;
        this.path = loop.getPath();
    }
    Wall.prototype.projectPoint = function (p) {
        return this.loop.projectPoint(p);
    };
    Wall.prototype.containsPoint = function (p) {
        return this.loop.containsPoint(p);
    };
    Wall.prototype.draw = function (ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fill(this.path);
    };
    return Wall;
}());
export { Wall };
