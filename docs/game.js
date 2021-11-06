import { Controller, ControlMode, Device } from "./control.js";
import { TEST_COURSES } from "./course.js";
import { Kart } from "./kart.js";
import { mod, Vec2 } from "./math.js";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var UPDATES_PER_SEC = 60.0;
var MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;
var Game = /** @class */ (function () {
    function Game() {
        this.debug = false;
        this.kart = new Kart();
        this.courseIdx = 3;
        this.course = TEST_COURSES[this.courseIdx];
        this.controller = new Controller(Device.Gamepad, ControlMode.Follow);
        this.camera = new Vec2(0.0, 0.0);
    }
    Game.prototype.update = function () {
        this.controller.update(this.kart, this.camera);
        this.kart.update(this.course);
        this.camera = this.kart.getPos();
    };
    Game.prototype.draw = function (_timestamp) {
        // Clear the drawing.
        ctx.fillStyle = "rgb(30, 100, 40)";
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fill();
        // Save the current ctx state and then apply the camera transform and draw the world.
        ctx.save();
        ctx.translate(0.5 * canvas.width - this.camera.x, 0.5 * canvas.height - this.camera.y);
        this.drawWorld();
        // Restore the ctx state to undo the camera transform and draw the UI.
        ctx.restore();
        this.drawUI();
        window.requestAnimationFrame(this.draw.bind(this));
    };
    Game.prototype.drawWorld = function () {
        this.course.drawWorld(ctx, this.debug);
        this.kart.draw(ctx, this.debug);
    };
    Game.prototype.drawUI = function () {
        this.course.drawUI(ctx, this.debug);
        this.controller.drawUI(ctx, this.debug);
        if (this.debug) {
            ctx.font = "20pt serif";
            var x = 10;
            var y = 70;
            if (this.course.track.containsPoint(this.kart.getPos())) {
                ctx.fillStyle = "cyan";
                ctx.fillText("On track", x, y);
            }
            else {
                ctx.fillStyle = "red";
                ctx.fillText("Off track", x, y);
            }
        }
    };
    return Game;
}());
var game = new Game();
// Disable context menu on right-click.
window.oncontextmenu = function () { return false; };
// Add debug event listeners.
window.addEventListener("keydown", function (event) {
    switch (event.code) {
        case "KeyD":
            game.debug = !game.debug;
            return false;
        case "ArrowLeft":
            game.courseIdx = mod(game.courseIdx - 1, TEST_COURSES.length);
            game.course = TEST_COURSES[game.courseIdx];
            return false;
        case "ArrowRight":
            game.courseIdx = mod(game.courseIdx + 1, TEST_COURSES.length);
            game.course = TEST_COURSES[game.courseIdx];
            return false;
    }
});
// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return false;
});
// Update loop
window.setInterval(game.update.bind(game), MS_PER_UPDATE);
// Render loop
window.requestAnimationFrame(game.draw.bind(game));
