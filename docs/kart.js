import { Bumper } from "./bumper.js";
import { Angle, Vec2 } from "./math.js";
var ACCELERATION = 0.05;
var ON_TRACK_DRAG = 0.01;
var OFF_TRACK_DRAG = 0.03;
var WALL_RESTITUTION = 0.7;
var Kart = /** @class */ (function () {
    function Kart() {
        // Gas pedal, from 0 to 1.
        this.gas = 0.0;
        // Brake pedal, from 0 to 1.
        this.brake = 0.0;
        this.steering = 0.0;
        this.pos = new Vec2(0.0, 0.0);
        this.speed = 0.0;
        this.heading = new Angle(0.0);
        this.frontBumper = new Bumper(15.0);
        this.backBumper = new Bumper(10.0);
    }
    Kart.prototype.getPos = function () {
        return this.pos;
    };
    Kart.prototype.getSpeed = function () {
        return this.speed;
    };
    Kart.prototype.getHeading = function () {
        return this.heading;
    };
    Kart.prototype.update = function (track, walls) {
        // Apply gas and brake.
        this.speed -= ACCELERATION * this.brake;
        this.speed += ACCELERATION * this.gas;
        // Apply drag.
        var drag = track.containsPoint(this.pos) ? ON_TRACK_DRAG : OFF_TRACK_DRAG;
        this.speed *= 1.0 - drag;
        // Update heading and position.
        this.heading = this.heading.plus(this.steering * this.speed / 50.0);
        this.pos = this.pos.plus(Vec2.fromPolar(this.speed, this.heading));
        var offset = Vec2.fromPolar(20.0, this.heading);
        this.frontBumper.pos = this.pos.plus(offset);
        this.backBumper.pos = this.pos.minus(offset);
        this.bumperCollision(walls, this.frontBumper);
        this.bumperCollision(walls, this.backBumper);
    };
    Kart.prototype.bumperCollision = function (walls, bumper) {
        for (var _i = 0, walls_1 = walls; _i < walls_1.length; _i++) {
            var wall = walls_1[_i];
            var r = bumper.radius + wall.radius;
            var offset = new Vec2(bumper.pos.x - wall.pos.x, bumper.pos.y - wall.pos.y);
            var d2 = offset.length2();
            if (d2 != 0.0 && d2 < r * r) {
                // Lose speed.
                this.speed *= -WALL_RESTITUTION;
                // Fix overlap.
                var d = Math.sqrt(d2);
                this.pos = this.pos.plus(offset.times((r - d) / d));
            }
        }
    };
    Kart.prototype.draw = function (ctx, debug) {
        var x = this.pos.x;
        var y = this.pos.y;
        var frontOffset = 25.0;
        var backOffset = 20.0;
        var frontAngleOffset = Math.PI / 10.0;
        var backAngleOffset = Math.PI / 5.0;
        var frontRight = new Vec2(x + frontOffset * this.heading.plus(frontAngleOffset).cos(), y + frontOffset * this.heading.plus(frontAngleOffset).sin());
        var frontLeft = new Vec2(x + frontOffset * this.heading.minus(frontAngleOffset).cos(), y + frontOffset * this.heading.minus(frontAngleOffset).sin());
        var backLeft = new Vec2(x + backOffset * this.heading.plus(Math.PI + backAngleOffset).cos(), y + backOffset * this.heading.plus(backAngleOffset + Math.PI).sin());
        var backRight = new Vec2(x + backOffset * this.heading.plus(Math.PI - backAngleOffset).cos(), y + backOffset * this.heading.minus(backAngleOffset - Math.PI).sin());
        if (debug) {
            this.frontBumper.draw(ctx);
            this.backBumper.draw(ctx);
        }
        var wheelRadius = 8.0;
        this.drawWheel(ctx, frontRight, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
        this.drawWheel(ctx, frontLeft, this.heading.plus(this.steering), wheelRadius, Math.PI / 6.0);
        this.drawWheel(ctx, backLeft, this.heading, wheelRadius, Math.PI / 6.0);
        this.drawWheel(ctx, backRight, this.heading, wheelRadius, Math.PI / 6.0);
        var chassis = new Path2D();
        chassis.moveTo(frontRight.x, frontRight.y);
        chassis.lineTo(frontLeft.x, frontLeft.y);
        chassis.lineTo(backLeft.x, backLeft.y);
        chassis.lineTo(backRight.x, backRight.y);
        chassis.closePath();
        ctx.fillStyle = "rgb(180, 0, 0)";
        ctx.fill(chassis);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1.0;
        ctx.stroke(chassis);
    };
    Kart.prototype.drawWheel = function (ctx, pos, angle, radius, angleOffset) {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(pos.x + radius * angle.plus(angleOffset).cos(), pos.y + radius * angle.plus(angleOffset).sin());
        ctx.lineTo(pos.x + radius * angle.minus(angleOffset).cos(), pos.y + radius * angle.minus(angleOffset).sin());
        ctx.lineTo(pos.x + radius * angle.plus(angleOffset + Math.PI).cos(), pos.y + radius * angle.plus(angleOffset - Math.PI).sin());
        ctx.lineTo(pos.x + radius * angle.minus(angleOffset - Math.PI).cos(), pos.y + radius * angle.minus(angleOffset - Math.PI).sin());
        ctx.closePath();
        ctx.fill();
    };
    return Kart;
}());
export { Kart };
