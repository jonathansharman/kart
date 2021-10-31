var Wall = /** @class */ (function () {
    function Wall(loop) {
        this.loop = loop;
        this.path = loop.getPath();
    }
    Wall.prototype.drawWorld = function (ctx) {
        ctx.fillStyle = "black";
        ctx.fill(this.path);
    };
    return Wall;
}());
export { Wall };
