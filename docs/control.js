import { Angle, clamp, mapToRange, TAU, Vec2 } from "./math.js";
var canvas = document.getElementById("canvas");
var MAX_STEERING_ANGLE = Math.PI / 6.0; // TODO: This should go in Kart.
// Mouse + axes control scheme constants
var CONTROL_AREA_WIDTH = 400.0;
var CONTROL_AREA_HEIGHT = 300.0;
var DEAD_AREA_WIDTH = 75.0;
var STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);
// Mouse + follow control scheme constants
var MIN_SPEED_DISTANCE = 60.0;
var MAX_SPEED_DISTANCE = 225.0;
// Gamepad constants
var STICK_DEAD_RADIUS = 0.25;
var STICK_STEERING_DRAG = 0.95;
export var Device;
(function (Device) {
    Device[Device["Mouse"] = 0] = "Mouse";
    Device[Device["Gamepad"] = 1] = "Gamepad";
})(Device || (Device = {}));
export var ControlMode;
(function (ControlMode) {
    ControlMode[ControlMode["Axes"] = 0] = "Axes";
    ControlMode[ControlMode["Follow"] = 1] = "Follow";
})(ControlMode || (ControlMode = {}));
var Controller = /** @class */ (function () {
    function Controller(device, mode) {
        var _this = this;
        this.mousePosClient = new Vec2(0.0, 0.0);
        this.device = device;
        this.mode = mode;
        // Mouse events
        window.addEventListener("mousemove", function (event) {
            var rect = canvas.getBoundingClientRect();
            _this.mousePosClient.x = event.clientX - rect.left;
            _this.mousePosClient.y = event.clientY - rect.top;
        });
        window.addEventListener("mousedown", function (event) {
            switch (event.button) {
                case 0: // Left button
                    return false;
                case 2: // Right button
                    return false;
            }
        });
        window.addEventListener("mouseup", function (event) {
            event.preventDefault();
            switch (event.button) {
                case 0: // Left button
                    return false;
                case 2: // Right button
                    return false;
            }
        });
        // Keyboard events
        window.addEventListener("keydown", function (event) {
            switch (event.code) {
                case "Digit1":
                    return false;
                case "Digit2":
                    return false;
            }
        });
        window.addEventListener("keyup", function (event) {
            event.preventDefault();
            switch (event.code) {
                case "Digit1":
                    return false;
                case "Digit2":
                    return false;
            }
        });
    }
    Controller.prototype.update = function (kart, camera) {
        // For now, determine device only by whether the gamepad is disconnected.
        var gamepad = navigator.getGamepads()[0];
        if (gamepad) {
            this.device = Device.Gamepad;
        }
        else {
            this.device = Device.Mouse;
        }
        switch (this.device) {
            case Device.Mouse:
                switch (this.mode) {
                    case ControlMode.Axes:
                        {
                            var controlAreaTop = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
                            var controlAreaBottom = controlAreaTop + CONTROL_AREA_HEIGHT;
                            var deadAreaLeft = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
                            var deadAreaRight = deadAreaLeft + DEAD_AREA_WIDTH;
                            // Left steering: 0 (right) to 1 (left)
                            var leftSteering = clamp((deadAreaLeft - this.mousePosClient.x) / STEERING_WIDTH, 0.0, 1.0);
                            // Right steering: 0 (left) to 1 (right)
                            var rightSteering = clamp((this.mousePosClient.x - deadAreaRight) / STEERING_WIDTH, 0.0, 1.0);
                            // Gas: 0 (bottom) to 1 (top)
                            kart.gas = clamp((controlAreaBottom - this.mousePosClient.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
                            // Steering
                            kart.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
                        }
                        break;
                    case ControlMode.Follow:
                        {
                            var mousePosWorld = this.mousePosClient
                                .plus(camera)
                                .minus(new Vec2(0.5 * canvas.width, 0.5 * canvas.height));
                            var offset = mousePosWorld.minus(kart.getPos());
                            var angle = Angle.fromVec2(offset);
                            var distance = offset.length();
                            kart.gas = mapToRange(clamp(distance, MIN_SPEED_DISTANCE, MAX_SPEED_DISTANCE), [MIN_SPEED_DISTANCE, MAX_SPEED_DISTANCE], [0.0, 1.0]);
                            kart.steering = clamp(kart.getHeading().smallestAngleTo(angle).getNegativePiToPi(), -MAX_STEERING_ANGLE, MAX_STEERING_ANGLE);
                        }
                        break;
                }
                break;
            case Device.Gamepad:
                switch (this.mode) {
                    case ControlMode.Axes:
                        kart.gas = gamepad.buttons[7].value;
                        kart.brake = gamepad.buttons[6].value;
                        // Steering
                        var steeringAbs = MAX_STEERING_ANGLE * mapToRange(Math.abs(gamepad.axes[0]), [STICK_DEAD_RADIUS, 1.0], [0.0, 1.0]);
                        if (gamepad.axes[0] < -STICK_DEAD_RADIUS) {
                            kart.steering = -steeringAbs;
                        }
                        else if (gamepad.axes[0] > STICK_DEAD_RADIUS) {
                            kart.steering = steeringAbs;
                        }
                        else {
                            kart.steering *= STICK_STEERING_DRAG;
                        }
                        break;
                    case ControlMode.Follow:
                        {
                            var offset = new Vec2(gamepad.axes[0], gamepad.axes[1]);
                            var angle = Angle.fromVec2(offset);
                            var length_1 = offset.length();
                            if (length_1 > STICK_DEAD_RADIUS) {
                                kart.gas = mapToRange(length_1, [STICK_DEAD_RADIUS, 1.0], [0.0, 1.0]);
                                kart.steering = clamp(kart.getHeading().smallestAngleTo(angle).getNegativePiToPi(), -MAX_STEERING_ANGLE, MAX_STEERING_ANGLE);
                            }
                            else {
                                kart.gas = 0.0;
                                kart.steering *= STICK_STEERING_DRAG;
                            }
                        }
                        break;
                }
                break;
        }
    };
    Controller.prototype.drawUI = function (ctx, debug) {
        // Draw control area when in MouseAxes control mode.
        if (this.device == Device.Mouse) {
            switch (this.mode) {
                case ControlMode.Follow:
                    if (debug) {
                        ctx.strokeStyle = "white";
                        ctx.lineWidth = 1.0;
                        ctx.beginPath();
                        ctx.ellipse(0.5 * canvas.width, 0.5 * canvas.height, MIN_SPEED_DISTANCE, MIN_SPEED_DISTANCE, 0, 0, TAU);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.ellipse(0.5 * canvas.width, 0.5 * canvas.height, MAX_SPEED_DISTANCE, MAX_SPEED_DISTANCE, 0, 0, TAU);
                        ctx.stroke();
                    }
                    break;
                case ControlMode.Axes:
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    ctx.rect(0.5 * (canvas.width - CONTROL_AREA_WIDTH), 0.5 * (canvas.height - CONTROL_AREA_HEIGHT), CONTROL_AREA_WIDTH, CONTROL_AREA_HEIGHT);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.fillStyle = "black";
                    ctx.rect(0.5 * (canvas.width - DEAD_AREA_WIDTH), 0.5 * (canvas.height - CONTROL_AREA_HEIGHT), DEAD_AREA_WIDTH, CONTROL_AREA_HEIGHT);
                    ctx.stroke();
                    break;
            }
        }
    };
    return Controller;
}());
export { Controller };
