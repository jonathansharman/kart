var FPS = 60.0;
var MS_PER_FRAME = 1000.0 / FPS;
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var ACCELERATION = 0.05;
var ON_ROAD_DRAG = 0.01;
var OFF_ROAD_DRAG = 0.03;
var WALL_BOUNCE_LOSS = 0.3;
var MAX_STEERING_ANGLE = Math.PI / 6.0;
var COLLISION_BUCKET_COLS = 8;
var COLLISION_BUCKET_WIDTH = canvas.width / COLLISION_BUCKET_COLS;
var COLLISION_BUCKET_ROWS = canvas.height / COLLISION_BUCKET_WIDTH;
var TERRAIN_CELL_WIDTH = 10;
var TERRAIN_CELL_COLS = Math.floor(canvas.width / TERRAIN_CELL_WIDTH);
var TERRAIN_CELL_ROWS = Math.floor(canvas.height / TERRAIN_CELL_WIDTH);
var TRACK_RADIUS = 50.0;
var TRACK_BORDER = 2.0;
var CONTROL_AREA_WIDTH = 400.0;
var CONTROL_AREA_HEIGHT = 300.0;
var CONTROL_AREA_LEFT = 0.5 * (canvas.width - CONTROL_AREA_WIDTH);
var CONTROL_AREA_RIGHT = CONTROL_AREA_LEFT + CONTROL_AREA_WIDTH;
var CONTROL_AREA_TOP = 0.5 * (canvas.height - CONTROL_AREA_HEIGHT);
var CONTROL_AREA_BOTTOM = CONTROL_AREA_TOP + CONTROL_AREA_HEIGHT;
var DEAD_AREA_WIDTH = 75.0;
var DEAD_AREA_LEFT = 0.5 * (canvas.width - DEAD_AREA_WIDTH);
var DEAD_AREA_RIGHT = DEAD_AREA_LEFT + DEAD_AREA_WIDTH;
var STEERING_WIDTH = 0.5 * (CONTROL_AREA_WIDTH - DEAD_AREA_WIDTH);
var clamp = function (n, min, max) { return Math.max(min, Math.min(max, n)); };
var Bumper = /** @class */ (function () {
    function Bumper(radius, pos) {
        if (pos === void 0) { pos = new Vec2(0.0, 0.0); }
        this.radius = radius;
        this.pos = pos;
    }
    return Bumper;
}());
var Car = /** @class */ (function () {
    function Car() {
        this.pos = new Vec2(0.0, 0.0);
        this.speed = 0.0;
        this.heading = 0.0;
        this.steering = 0.0;
        this.frontBumper = new Bumper(15.0);
        this.backBumper = new Bumper(10.0);
    }
    return Car;
}());
var MainScene = /** @class */ (function () {
    function MainScene() {
        this.mousePos = new Vec2(0.0, 0.0);
        this.brake = false;
        this.gas = false;
        this.cameraPos = new Vec2(0.0, 0.0);
        this.car = new Car();
        this.trackPoints = [
            new Vec2(100, 100),
            new Vec2(100, 668),
            new Vec2(200, 668),
            new Vec2(422, 568),
            new Vec2(602, 568),
            new Vec2(824, 668),
            new Vec2(924, 668),
            new Vec2(924, 100),
        ];
        this.addWalls();
    }
    MainScene.prototype.addWalls = function () {
        this.walls = [];
        this.wallBuckets = [];
        for (var i = 0; i < COLLISION_BUCKET_COLS * COLLISION_BUCKET_ROWS; ++i) {
            this.wallBuckets.push([]);
        }
        this.addWall(new Bumper(15.0, new Vec2(0.5 * canvas.width, 0.5 * canvas.height)));
    };
    MainScene.prototype.addWall = function (wall) {
        var col = Math.floor(wall.pos.x / COLLISION_BUCKET_WIDTH);
        var row = Math.floor(wall.pos.y / COLLISION_BUCKET_WIDTH);
        this.walls.push(wall);
        this.wallBuckets[row * COLLISION_BUCKET_COLS + col].push(wall);
    };
    MainScene.prototype.wallsNear = function (pos) {
        var centerCol = Math.floor(pos.x / COLLISION_BUCKET_WIDTH);
        var centerRow = Math.floor(pos.y / COLLISION_BUCKET_WIDTH);
        var nearbyWalls = [];
        for (var row = centerRow - 1; row <= centerRow + 1; ++row) {
            if (row < 0 || COLLISION_BUCKET_ROWS <= row) {
                continue;
            }
            for (var col = centerCol - 1; col <= centerCol + 1; ++col) {
                if (col < 0 || COLLISION_BUCKET_COLS <= col) {
                    continue;
                }
                nearbyWalls = nearbyWalls.concat(this.wallBuckets[row * COLLISION_BUCKET_COLS + col]);
            }
        }
        return nearbyWalls;
    };
    MainScene.prototype.update = function () {
        // Left steering: 0 (right) to 1 (left)
        var leftSteering = clamp((DEAD_AREA_LEFT - this.mousePos.x) / STEERING_WIDTH, 0.0, 1.0);
        // Right steering: 0 (left) to 1 (right)
        var rightSteering = clamp((this.mousePos.x - DEAD_AREA_RIGHT) / STEERING_WIDTH, 0.0, 1.0);
        // Throttle: 0 (bottom) to 1 (top)
        var throttle = clamp((CONTROL_AREA_BOTTOM - this.mousePos.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
        // Gas and brake
        if (this.brake) {
            this.car.speed -= ACCELERATION * (1.0 - throttle);
        }
        if (this.gas) {
            this.car.speed += ACCELERATION * throttle;
        }
        // Drag
        var drag = this.offRoad() ? OFF_ROAD_DRAG : ON_ROAD_DRAG;
        this.car.speed -= drag * this.car.speed;
        // Steering
        this.car.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
        // Change in heading
        this.car.heading += this.car.steering * this.car.speed / 50.0;
        var vx = this.car.speed * Math.cos(this.car.heading);
        var vy = this.car.speed * Math.sin(this.car.heading);
        this.car.pos.x += vx;
        this.car.pos.y += vy;
        while (this.car.pos.x < 0.0) {
            this.car.pos.x += canvas.width;
        }
        while (this.car.pos.x > canvas.width) {
            this.car.pos.x -= canvas.width;
        }
        while (this.car.pos.y < 0.0) {
            this.car.pos.y += canvas.height;
        }
        while (this.car.pos.y > canvas.height) {
            this.car.pos.y -= canvas.height;
        }
        this.car.frontBumper.pos.x = this.car.pos.x + 20.0 * Math.cos(this.car.heading);
        this.car.frontBumper.pos.y = this.car.pos.y + 20.0 * Math.sin(this.car.heading);
        this.car.backBumper.pos.x = this.car.pos.x - 20.0 * Math.cos(this.car.heading);
        this.car.backBumper.pos.y = this.car.pos.y - 20.0 * Math.sin(this.car.heading);
        this.wallBumperCollision(this.car.frontBumper);
        this.wallBumperCollision(this.car.backBumper);
        // The camera leads the car.
        //this.cameraPos = new Vec2(this.car.pos.x + 20.0 * vx, this.car.pos.y + 20.0 * vy);
        //this.cameraPos = this.car.pos;
    };
    MainScene.prototype.offRoad = function () {
        for (var i = 0; i < this.trackPoints.length; ++i) {
            var start = this.trackPoints[i];
            var end = this.trackPoints[(i + 1) % this.trackPoints.length];
            if (pointSegmentDistance2(this.car.pos, start, end) < TRACK_RADIUS * TRACK_RADIUS) {
                return false;
            }
        }
        return true;
    };
    MainScene.prototype.wallBumperCollision = function (bumper) {
        for (var _i = 0, _a = this.wallsNear(bumper.pos); _i < _a.length; _i++) {
            var wall = _a[_i];
            var r = bumper.radius + wall.radius;
            var dx = bumper.pos.x - wall.pos.x;
            var dy = bumper.pos.y - wall.pos.y;
            var d2 = Math.pow(dx, 2.0) + Math.pow(dy, 2.0);
            if (d2 != 0.0 && d2 < Math.pow(r, 2.0)) {
                this.car.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.car.speed;
                var d = Math.pow(d2, 0.5);
                var factor = (r - d) / d;
                this.car.pos.x += dx * factor;
                this.car.pos.y += dy * factor;
            }
        }
    };
    MainScene.prototype.render = function () {
        ctx.fillStyle = "rgb(30, 100, 40)";
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fill();
        var x = this.car.pos.x - this.cameraPos.x;
        var y = this.car.pos.y - this.cameraPos.y;
        this.drawTrack(TRACK_RADIUS, "black");
        this.drawTrack(TRACK_RADIUS - TRACK_BORDER, "rgb(60, 60, 60)");
        // Draw walls.
        for (var _i = 0, _a = this.walls; _i < _a.length; _i++) {
            var wall = _a[_i];
            drawBumper(wall);
        }
        // Draw car.
        var frontOffset = 25.0;
        var backOffset = 20.0;
        var frontAngleOffset = Math.PI / 10.0;
        var backAngleOffset = Math.PI / 5.0;
        var frontRight = new Vec2(x + frontOffset * Math.cos(this.car.heading + frontAngleOffset), y + frontOffset * Math.sin(this.car.heading + frontAngleOffset));
        var frontLeft = new Vec2(x + frontOffset * Math.cos(this.car.heading - frontAngleOffset), y + frontOffset * Math.sin(this.car.heading - frontAngleOffset));
        var backLeft = new Vec2(x + backOffset * Math.cos(this.car.heading + Math.PI + backAngleOffset), y + backOffset * Math.sin(this.car.heading + Math.PI + backAngleOffset));
        var backRight = new Vec2(x + backOffset * Math.cos(this.car.heading + Math.PI - backAngleOffset), y + backOffset * Math.sin(this.car.heading + Math.PI - backAngleOffset));
        drawBumper(this.car.frontBumper);
        drawBumper(this.car.backBumper);
        var wheelRadius = 8.0;
        drawWheel(frontRight, this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
        drawWheel(frontLeft, this.car.heading + this.car.steering, wheelRadius, Math.PI / 6.0);
        drawWheel(backLeft, this.car.heading, wheelRadius, Math.PI / 6.0);
        drawWheel(backRight, this.car.heading, wheelRadius, Math.PI / 6.0);
        ctx.beginPath();
        ctx.moveTo(frontRight.x, frontRight.y);
        ctx.lineTo(frontLeft.x, frontLeft.y);
        ctx.lineTo(backLeft.x, backLeft.y);
        ctx.lineTo(backRight.x, backRight.y);
        ctx.closePath();
        ctx.fillStyle = "rgb(180, 0, 0)";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1.0;
        ctx.stroke();
        // Draw control area.
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
    };
    MainScene.prototype.drawTrack = function (radius, style) {
        ctx.fillStyle = style;
        for (var i = 0; i < this.trackPoints.length; ++i) {
            var start = this.trackPoints[i];
            var end = this.trackPoints[(i + 1) % this.trackPoints.length];
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineWidth = 2 * radius;
            ctx.strokeStyle = style;
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(start.x, start.y, radius, radius, 0.0, 0.0, 2.0 * Math.PI);
            ctx.fill();
        }
    };
    return MainScene;
}());
// The square of the shortest distance from p to the line segment (q, r).
function pointSegmentDistance2(p, q, r) {
    if (q === r) {
        return p.minus(q).length2();
    }
    var t = clamp(p.minus(q).dot(r.minus(q)) / r.minus(q).length2(), 0.0, 1.0);
    return p.minus(q.plus(r.minus(q).times(t))).length2();
}
function drawWheel(pos, angle, radius, angleOffset) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(pos.x + radius * Math.cos(angle + angleOffset), pos.y + radius * Math.sin(angle + angleOffset));
    ctx.lineTo(pos.x + radius * Math.cos(angle - angleOffset), pos.y + radius * Math.sin(angle - angleOffset));
    ctx.lineTo(pos.x + radius * Math.cos(angle + Math.PI + angleOffset), pos.y + radius * Math.sin(angle - Math.PI + angleOffset));
    ctx.lineTo(pos.x + radius * Math.cos(angle + Math.PI - angleOffset), pos.y + radius * Math.sin(angle + Math.PI - angleOffset));
    ctx.closePath();
    ctx.fill();
}
function drawBumper(bumper) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(bumper.pos.x, bumper.pos.y, bumper.radius, bumper.radius, 0.0, 0.0, 2.0 * Math.PI);
    ctx.fill();
}
var mainScene = new MainScene();
window.onmousemove = function (event) {
    var rect = canvas.getBoundingClientRect();
    mainScene.mousePos.x = event.clientX - rect.left;
    mainScene.mousePos.y = event.clientY - rect.top;
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
window.oncontextmenu = function () { return false; };
window.setInterval(function () {
    mainScene.update();
    mainScene.render();
}, MS_PER_FRAME);
