import { Controller, ControlMode, Device } from "./control.js";
import { COURSE_ZONES, TEST_COURSES } from "./course.js";
import { Kart } from "./kart.js";
import { mod, Vec2 } from "./math.js";
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const UPDATES_PER_SEC = 60.0;
const MS_PER_FRAME = 1000.0 / UPDATES_PER_SEC;
class Game {
    constructor() {
        this.debug = false;
        this.courseIdx = 3;
        this.course = TEST_COURSES[this.courseIdx];
        this.lastZone = 0;
        this.subLaps = 0;
        this.laps = 0;
        this.currentLapFrames = 0;
        this.totalFrames = 0;
        this.lapFrames = [];
        this.controller = new Controller(Device.Gamepad, ControlMode.Follow);
        this.camera = new Vec2(0.0, 0.0);
        const startingRay = this.course.track.startingRay;
        this.kart = new Kart(startingRay.origin, startingRay.angle);
        // Add debug event listeners.
        window.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "KeyD":
                    this.debug = !this.debug;
                    return false;
                case "ArrowLeft":
                    this.courseIdx = mod(this.courseIdx - 1, TEST_COURSES.length);
                    this.course = TEST_COURSES[this.courseIdx];
                    this.reset();
                    return false;
                case "ArrowRight":
                    this.courseIdx = mod(this.courseIdx + 1, TEST_COURSES.length);
                    this.course = TEST_COURSES[this.courseIdx];
                    this.reset();
                    return false;
            }
        });
        // Start the update loop.
        window.setInterval(this.update.bind(this), MS_PER_FRAME);
    }
    reset() {
        const startingRay = this.course.track.startingRay;
        this.kart = new Kart(startingRay.origin, startingRay.angle);
        this.lastZone = 0;
        this.subLaps = 0;
        this.laps = 0;
        this.currentLapFrames = 0;
        this.totalFrames = 0;
        this.lapFrames = [];
    }
    update() {
        this.controller.update(this.kart, this.camera);
        this.kart.update(this.course);
        this.camera = this.kart.getPos();
        if (this.laps < this.course.laps) {
            this.updateLaps();
        }
        window.requestAnimationFrame(this.draw.bind(this));
    }
    updateLaps() {
        const zone = this.course.zone(this.kart.getPos());
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
            this.lapFrames.push(this.currentLapFrames);
            this.currentLapFrames = 0;
            ++this.laps;
        }
        else if (this.subLaps < -COURSE_ZONES) {
            this.subLaps += COURSE_ZONES;
        }
        this.lastZone = zone;
        ++this.currentLapFrames;
        ++this.totalFrames;
    }
    draw(_timestamp) {
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
    }
    drawWorld() {
        this.course.drawWorld(ctx, this.debug);
        this.kart.draw(ctx, this.debug);
    }
    drawUI() {
        this.course.drawUI(ctx, this.debug);
        this.controller.drawUI(ctx, this.debug);
        // Draw total time and lap times.
        ctx.font = "24pt monospace";
        ctx.fillStyle = "white";
        ctx.textAlign = "right";
        ctx.fillText(framesToTimeString(this.totalFrames), canvas.width - 10, 30);
        ctx.font = "16pt monospace";
        ctx.fillStyle = "rgb(190, 190, 190)";
        for (let i = 0; i < this.lapFrames.length; ++i) {
            ctx.fillText((i + 1) + "| " + framesToTimeString(this.lapFrames[i]), canvas.width - 10, 55 + 25 * i);
        }
        // Draw lap count.
        ctx.font = "36pt sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        if (this.laps < this.course.laps) {
            ctx.fillText((this.laps + 1) + "/" + this.course.laps, 10, canvas.height);
        }
        else {
            ctx.fillText("🏁/" + this.course.laps, 10, canvas.height);
        }
        if (this.debug) {
            ctx.font = "20pt serif";
            ctx.textBaseline = "alphabetic";
            let trackText;
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
        }
    }
}
const framesToTimeString = (frames) => {
    const totalS = frames * MS_PER_FRAME / 1000;
    const s = totalS % 60;
    const m = Math.floor(totalS / 60);
    return m + ":" + s.toFixed(3).padStart(6, "0");
};
// Disable context menu on right-click.
window.oncontextmenu = () => false;
// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return false;
});
// Start the game.
new Game();
