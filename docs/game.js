import { Controller, ControlMode, Device } from "./control.js";
import { COURSE_ZONES, TEST_COURSES } from "./course.js";
import { Kart } from "./kart.js";
import { mod, Vec2 } from "./math.js";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var UPDATES_PER_SEC = 60.0;
var MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;
var Game = /** @class */ (function () {
    function Game() {
        var _this = this;
        this.debug = false;
        this.courseIdx = 3;
        this.course = TEST_COURSES[this.courseIdx];
        this.lastZone = 0;
        this.subLaps = 0;
        this.laps = 0;
        this.controller = new Controller(Device.Gamepad, ControlMode.Follow);
        this.camera = new Vec2(0.0, 0.0);
        var startingRay = this.course.track.startingRay;
        this.kart = new Kart(startingRay.origin, startingRay.angle);
        // Add debug event listeners.
        window.addEventListener("keydown", function (event) {
            switch (event.code) {
                case "KeyD":
                    _this.debug = !_this.debug;
                    return false;
                case "ArrowLeft":
                    {
                        _this.courseIdx = mod(_this.courseIdx - 1, TEST_COURSES.length);
                        _this.course = TEST_COURSES[_this.courseIdx];
                        var startingRay_1 = _this.course.track.startingRay;
                        _this.kart = new Kart(startingRay_1.origin, startingRay_1.angle);
                        _this.lastZone = 0;
                        _this.subLaps = 0;
                        _this.laps = 0;
                        return false;
                    }
                case "ArrowRight":
                    {
                        _this.courseIdx = mod(_this.courseIdx + 1, TEST_COURSES.length);
                        _this.course = TEST_COURSES[_this.courseIdx];
                        var startingRay_2 = _this.course.track.startingRay;
                        _this.kart = new Kart(startingRay_2.origin, startingRay_2.angle);
                        _this.lastZone = 0;
                        _this.subLaps = 0;
                        _this.laps = 0;
                        return false;
                    }
            }
        });
        // Start the update loop.
        window.setInterval(this.update.bind(this), MS_PER_UPDATE);
    }
    Game.prototype.update = function () {
        this.controller.update(this.kart, this.camera);
        this.kart.update(this.course);
        this.camera = this.kart.getPos();
        var zone = this.course.zone(this.kart.getPos());
        switch ((zone - this.lastZone + COURSE_ZONES) % COURSE_ZONES) {
            case COURSE_ZONES - 1:
                --this.subLaps;
                break;
            case 1:
                ++this.subLaps;
                break;
        }
        if (this.subLaps >= COURSE_ZONES) {
            this.subLaps -= COURSE_ZONES;
            ++this.laps;
        }
        else if (this.subLaps < -COURSE_ZONES) {
            this.subLaps += COURSE_ZONES;
        }
        this.lastZone = zone;
        window.requestAnimationFrame(this.draw.bind(this));
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
            var trackText = void 0;
            if (this.course.track.containsPoint(this.kart.getPos())) {
                ctx.fillStyle = "cyan";
                trackText = "On track";
            }
            else {
                ctx.fillStyle = "red";
                trackText = "Off track";
            }
            ctx.fillText(trackText, 10, 70);
            ctx.fillStyle = "black";
            ctx.fillText("Zone " + this.course.zone(this.kart.getPos()), 10, 110);
            ctx.fillStyle = "black";
            ctx.fillText("Sublaps " + this.subLaps, 10, 150);
            ctx.fillStyle = "black";
            ctx.fillText("Laps " + this.laps, 10, 190);
        }
    };
    return Game;
}());
// Disable context menu on right-click.
window.oncontextmenu = function () { return false; };
// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return false;
});
// Start the game.
new Game();
