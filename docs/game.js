import { Bumper } from "./bumper.js";
import { Kart } from "./kart.js";
import { Angle, clamp, mod, TAU, Vec2 } from "./math.js";
import { Corner, Track } from "./track.js";
var UPDATES_PER_SEC = 60.0;
var MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var ACCELERATION = 0.05;
var ON_ROAD_DRAG = 0.01;
var OFF_ROAD_DRAG = 0.03;
var WALL_BOUNCE_LOSS = 0.3;
var MAX_STEERING_ANGLE = Math.PI / 6.0;
var TRACK_RADIUS = 50.0;
// MouseAxes control scheme constants
var CONTROL_AREA_WIDTH = 400.0;
var CONTROL_AREA_HEIGHT = 300.0;
var DEAD_AREA_WIDTH = 75.0;
var STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);
// MouseFollow control scheme constants
var MAX_SPEED_DISTANCE = 300.0;
// GamepadFollow control scheme constants
var STICK_DEAD_RADIUS = 0.25;
var STICK_STEERING_DRAG = 0.95;
var ControlScheme;
(function (ControlScheme) {
    ControlScheme[ControlScheme["MouseAxes"] = 0] = "MouseAxes";
    ControlScheme[ControlScheme["MouseFollow"] = 1] = "MouseFollow";
    ControlScheme[ControlScheme["GamepadFollow"] = 2] = "GamepadFollow";
})(ControlScheme || (ControlScheme = {}));
var tracks = [
    new Track("Serpentine", TRACK_RADIUS, [
        new Corner(new Vec2(100, 100), 0.5),
        new Corner(new Vec2(100, 668), 0.5),
        new Corner(new Vec2(250, 668), 1.0),
        new Corner(new Vec2(250, 200), 1.0),
        new Corner(new Vec2(400, 200), 1.0),
        new Corner(new Vec2(400, 668), 1.0),
        new Corner(new Vec2(550, 668), 1.0),
        new Corner(new Vec2(550, 200), 1.0),
        new Corner(new Vec2(700, 200), 1.0),
        new Corner(new Vec2(700, 668), 1.0),
        new Corner(new Vec2(850, 668), 0.5),
        new Corner(new Vec2(850, 100), 0.5),
    ]),
    new Track("Clockwise oval, tight turns", TRACK_RADIUS, [
        new Corner(new Vec2(300, 300), 0.0),
        new Corner(new Vec2(800, 300), 0.0),
        new Corner(new Vec2(800, 500), 0.0),
        new Corner(new Vec2(300, 500), 0.0),
    ]),
    new Track("Counter-clockwise oval", TRACK_RADIUS, [
        new Corner(new Vec2(300, 300), 1.0),
        new Corner(new Vec2(300, 500), 1.0),
        new Corner(new Vec2(800, 500), 1.0),
        new Corner(new Vec2(800, 300), 1.0),
    ]),
    new Track("Clockwise big track, tight turns", TRACK_RADIUS, [
        new Corner(new Vec2(100, 100), 0.0),
        new Corner(new Vec2(924, 100), 0.0),
        new Corner(new Vec2(924, 668), 0.0),
        new Corner(new Vec2(824, 668), 0.0),
        new Corner(new Vec2(602, 568), 0.0),
        new Corner(new Vec2(422, 568), 0.0),
        new Corner(new Vec2(200, 668), 0.0),
        new Corner(new Vec2(100, 668), 0.0),
    ]),
    new Track("Counter-clockwise big track", TRACK_RADIUS, [
        new Corner(new Vec2(100, 100), 0.5),
        new Corner(new Vec2(100, 668), 1.0),
        new Corner(new Vec2(200, 668), 1.0),
        new Corner(new Vec2(422, 568), 1.0),
        new Corner(new Vec2(602, 568), 1.0),
        new Corner(new Vec2(824, 668), 1.0),
        new Corner(new Vec2(924, 668), 1.0),
        new Corner(new Vec2(924, 100), 0.5),
    ]),
    new Track("Degenerate quad (triangle)", TRACK_RADIUS, [
        new Corner(new Vec2(300, 300), 1.0),
        new Corner(new Vec2(300, 500), 1.0),
        new Corner(new Vec2(800, 400), 1.0),
        new Corner(new Vec2(800, 400), 1.0),
    ]),
];
var MainScene = /** @class */ (function () {
    function MainScene() {
        this.debug = false;
        this.trackIdx = 0;
        this.controlScheme = ControlScheme.GamepadFollow;
        this.mousePosClient = new Vec2(0.0, 0.0);
        this.mousePosWorld = new Vec2(0.0, 0.0);
        this.brake = false;
        this.gas = false;
        this.camera = new Vec2(0.0, 0.0);
        this.kart = new Kart();
        this.walls = [
            new Bumper(15.0, new Vec2(300.0, 300.0)),
        ];
    }
    MainScene.prototype.update = function () {
        // Fall back to mouse controls if the gamepad is disconnected.
        var controlScheme = this.controlScheme;
        var gamepad = navigator.getGamepads()[0];
        if (!gamepad) {
            controlScheme = ControlScheme.MouseFollow;
        }
        var throttle = 0.0;
        switch (controlScheme) {
            case ControlScheme.MouseAxes:
                {
                    var controlAreaTop = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
                    var controlAreaBottom = controlAreaTop + CONTROL_AREA_HEIGHT;
                    var deadAreaLeft = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
                    var deadAreaRight = deadAreaLeft + DEAD_AREA_WIDTH;
                    // Left steering: 0 (right) to 1 (left)
                    var leftSteering = clamp((deadAreaLeft - this.mousePosClient.x) / STEERING_WIDTH, 0.0, 1.0);
                    // Right steering: 0 (left) to 1 (right)
                    var rightSteering = clamp((this.mousePosClient.x - deadAreaRight) / STEERING_WIDTH, 0.0, 1.0);
                    // Throttle: 0 (bottom) to 1 (top)
                    throttle = clamp((controlAreaBottom - this.mousePosClient.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
                    // Steering
                    this.kart.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
                }
                break;
            case ControlScheme.MouseFollow:
                {
                    var offset_1 = this.mousePosWorld.minus(this.kart.pos);
                    var angle = Angle.fromVec2(offset_1);
                    var distance = offset_1.length();
                    throttle = Math.min(MAX_SPEED_DISTANCE, distance) / MAX_SPEED_DISTANCE;
                    this.kart.steering = clamp(this.kart.heading.smallestAngleTo(angle).getNegativePiToPi(), -MAX_STEERING_ANGLE, MAX_STEERING_ANGLE);
                }
                break;
            case ControlScheme.GamepadFollow:
                {
                    var offset_2 = new Vec2(gamepad.axes[0], gamepad.axes[1]);
                    var angle = Angle.fromVec2(offset_2);
                    var length_1 = offset_2.length();
                    if (length_1 > STICK_DEAD_RADIUS) {
                        throttle = Math.min(1.0, (length_1 - STICK_DEAD_RADIUS) / (1.0 - STICK_DEAD_RADIUS));
                        this.kart.steering = clamp(this.kart.heading.smallestAngleTo(angle).getNegativePiToPi(), -MAX_STEERING_ANGLE, MAX_STEERING_ANGLE);
                        this.gas = true;
                    }
                    else {
                        this.gas = false;
                        this.kart.steering *= STICK_STEERING_DRAG;
                    }
                }
                break;
        }
        // Gas and brake
        if (this.brake) {
            this.kart.speed -= ACCELERATION * (1.0 - throttle);
        }
        if (this.gas) {
            this.kart.speed += ACCELERATION * throttle;
        }
        // Drag
        var drag = this.offRoad() ? OFF_ROAD_DRAG : ON_ROAD_DRAG;
        this.kart.speed -= drag * this.kart.speed;
        // Change in heading
        this.kart.heading = this.kart.heading.plus(this.kart.steering * this.kart.speed / 50.0);
        var v = Vec2.fromPolar(this.kart.speed, this.kart.heading);
        this.kart.pos = this.kart.pos.plus(v);
        var offset = Vec2.fromPolar(20.0, this.kart.heading);
        this.kart.frontBumper.pos = this.kart.pos.plus(offset);
        this.kart.backBumper.pos = this.kart.pos.minus(offset);
        this.wallBumperCollision(this.kart.frontBumper);
        this.wallBumperCollision(this.kart.backBumper);
        this.camera = this.kart.pos;
        this.mousePosWorld = mainScene.mousePosClient
            .plus(mainScene.camera)
            .minus(new Vec2(0.5 * canvas.width, 0.5 * canvas.height));
    };
    MainScene.prototype.offRoad = function () {
        // TODO: Collision detection with track's bezier curves
        // for (let i = 0; i < this.track.length; ++i) {
        // 	const start = this.trackPoints[i];
        // 	const end = this.trackPoints[(i + 1) % this.trackPoints.length];
        // 	const segment = new Segment2(start, end);
        // 	if (segment.pointDistance2(this.kart.pos) < TRACK_RADIUS * TRACK_RADIUS) {
        // 		return false;
        // 	}
        // }
        // return true;
        return false;
    };
    MainScene.prototype.wallBumperCollision = function (bumper) {
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            var r = bumper.radius + wall.radius;
            var dx = bumper.pos.x - wall.pos.x;
            var dy = bumper.pos.y - wall.pos.y;
            var d2 = dx * dx + dy * dy;
            if (d2 != 0.0 && d2 < r * r) {
                this.kart.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.kart.speed;
                var d = Math.sqrt(d2);
                var factor = (r - d) / d;
                this.kart.pos.x += dx * factor;
                this.kart.pos.y += dy * factor;
            }
        }
    };
    MainScene.prototype.draw = function (_timestamp) {
        var _this = this;
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
        window.requestAnimationFrame(function (timestamp) {
            _this.draw(timestamp);
        });
    };
    MainScene.prototype.drawWorld = function () {
        tracks[this.trackIdx].drawWorld(ctx, this.debug);
        // Draw walls.
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            wall.draw(ctx);
        }
        this.kart.draw(ctx, this.debug);
        // Draw the mouse's position in the world.
        if (this.debug) {
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.ellipse(this.mousePosWorld.x, this.mousePosWorld.y, 5, 5, 0, 0, TAU);
            ctx.fill();
        }
    };
    MainScene.prototype.drawUI = function () {
        tracks[this.trackIdx].drawUI(ctx, this.debug);
        // Draw control area when in MouseAxes control mode.
        if (this.controlScheme == ControlScheme.MouseAxes) {
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.rect(0.5 * (canvas.width - CONTROL_AREA_WIDTH), 0.5 * (canvas.height - CONTROL_AREA_HEIGHT), CONTROL_AREA_WIDTH, CONTROL_AREA_HEIGHT);
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = "black";
            ctx.rect(0.5 * (canvas.width - DEAD_AREA_WIDTH), 0.5 * (canvas.height - CONTROL_AREA_HEIGHT), DEAD_AREA_WIDTH, CONTROL_AREA_HEIGHT);
            ctx.stroke();
        }
    };
    return MainScene;
}());
var mainScene = new MainScene();
window.onmousemove = function (event) {
    var rect = canvas.getBoundingClientRect();
    mainScene.mousePosClient.x = event.clientX - rect.left;
    mainScene.mousePosClient.y = event.clientY - rect.top;
};
window.onmousedown = function (event) {
    switch (event.button) {
        case 0: // Left button
            mainScene.gas = true;
            return false;
        case 2: // Right button
            mainScene.brake = true;
            return false;
    }
};
window.onmouseup = function (event) {
    event.preventDefault();
    switch (event.button) {
        case 0: // Left button
            mainScene.gas = false;
            return false;
        case 2: // Right button
            mainScene.brake = false;
            return false;
    }
};
window.onkeydown = function (event) {
    switch (event.code) {
        case "Digit1":
            mainScene.brake = true;
            return false;
        case "Digit2":
            mainScene.gas = true;
            return false;
        case "KeyD":
            mainScene.debug = !mainScene.debug;
            return false;
        case "ArrowLeft":
            mainScene.trackIdx = mod(mainScene.trackIdx - 1, tracks.length);
            return false;
        case "ArrowRight":
            mainScene.trackIdx = mod(mainScene.trackIdx + 1, tracks.length);
            return false;
    }
};
window.onkeyup = function (event) {
    event.preventDefault();
    switch (event.code) {
        case "Digit1":
            mainScene.brake = false;
            return false;
        case "Digit2":
            mainScene.gas = false;
            return false;
    }
};
// Disable context menu on right-click.
window.oncontextmenu = function () { return false; };
// Make the canvas fill the window.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.onresize = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return false;
};
// Update loop
window.setInterval(function () {
    mainScene.update();
}, MS_PER_UPDATE);
// Render loop
window.requestAnimationFrame(function (timestamp) {
    mainScene.draw(timestamp);
});
