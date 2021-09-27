var UPDATES_PER_SEC = 60.0;
var MS_PER_UPDATE = 1000.0 / UPDATES_PER_SEC;
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
// Axis control scheme constants
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
// Follow control scheme constants
var MAX_SPEED_DISTANCE = 300.0;
var ControlScheme;
(function (ControlScheme) {
    ControlScheme[ControlScheme["MouseAxes"] = 0] = "MouseAxes";
    ControlScheme[ControlScheme["MouseFollow"] = 1] = "MouseFollow";
})(ControlScheme || (ControlScheme = {}));
var Bumper = /** @class */ (function () {
    function Bumper(radius, pos) {
        if (pos === void 0) { pos = new Vec2(0.0, 0.0); }
        this.radius = radius;
        this.pos = pos;
    }
    return Bumper;
}());
var Corner = /** @class */ (function () {
    function Corner(vertex, smoothness) {
        this.vertex = vertex;
        this.smoothness = smoothness;
    }
    return Corner;
}());
var CubicBezier = /** @class */ (function () {
    function CubicBezier(start, end, cp1, cp2) {
        this.start = start;
        this.end = end;
        this.cp1 = cp1;
        this.cp2 = cp2;
    }
    return CubicBezier;
}());
var Track = /** @class */ (function () {
    function Track(corners) {
        // Build a list of unit offset vectors from each vertex to its control
        // point in the forward direction.
        var forwardCPOffsets = [];
        for (var i = 0; i < corners.length; ++i) {
            var v = corners[i].vertex;
            var vPrev = corners[(i - 1 + corners.length) % corners.length].vertex;
            var vNext = corners[(i + 1) % corners.length].vertex;
            var fromPrev = v.minus(vPrev);
            var toNext = vNext.minus(v);
            // Get a vector bisecting the angle of the corner.
            var bisector = fromPrev.times(toNext.length()).plus(toNext.times(-fromPrev.length()));
            // Use the z-coordinate of the cross product to determine if it's a
            // left or right turn and therefore which way to rotate the offset.
            var crossZ = fromPrev.x * toNext.y - fromPrev.y * toNext.x;
            var rotated = crossZ > 0 ? bisector.rotatedQuarter() : bisector.rotatedThreeQuarters();
            forwardCPOffsets.push(rotated.normalized());
        }
        this.spline = [];
        for (var i = 0; i < corners.length; ++i) {
            var next = (i + 1) % corners.length;
            var start = corners[i].vertex;
            var end = corners[next].vertex;
            var lCPOffset = corners[i].smoothness * end.minus(start).length() / 3;
            var cp1 = start.plus(forwardCPOffsets[i].times(lCPOffset));
            var cp2 = end.minus(forwardCPOffsets[next].times(lCPOffset));
            this.spline.push(new CubicBezier(start, end, cp1, cp2));
        }
    }
    return Track;
}());
var Car = /** @class */ (function () {
    function Car() {
        this.pos = new Vec2(0.0, 0.0);
        this.speed = 0.0;
        this.heading = new Angle(0.0);
        this.steering = 0.0;
        this.frontBumper = new Bumper(15.0);
        this.backBumper = new Bumper(10.0);
    }
    return Car;
}());
var tracks = [
    new Track([
        // Clockwise oval
        new Corner(new Vec2(300, 300), 1.0),
        new Corner(new Vec2(800, 300), 1.0),
        new Corner(new Vec2(800, 500), 1.0),
        new Corner(new Vec2(300, 500), 1.0),
    ]),
    new Track([
        // Counter-clockwise oval
        new Corner(new Vec2(300, 300), 1.0),
        new Corner(new Vec2(300, 500), 1.0),
        new Corner(new Vec2(800, 500), 1.0),
        new Corner(new Vec2(800, 300), 1.0),
    ]),
    new Track([
        // Clockwise big track
        new Corner(new Vec2(100, 100), 1.0),
        new Corner(new Vec2(924, 100), 1.0),
        new Corner(new Vec2(924, 668), 1.0),
        new Corner(new Vec2(824, 668), 1.0),
        new Corner(new Vec2(602, 568), 1.0),
        new Corner(new Vec2(422, 568), 1.0),
        new Corner(new Vec2(200, 668), 1.0),
        new Corner(new Vec2(100, 668), 1.0),
    ]),
    new Track([
        // Counter-clockwise big track
        new Corner(new Vec2(100, 100), 1.0),
        new Corner(new Vec2(100, 668), 1.0),
        new Corner(new Vec2(200, 668), 1.0),
        new Corner(new Vec2(422, 568), 1.0),
        new Corner(new Vec2(602, 568), 1.0),
        new Corner(new Vec2(824, 668), 1.0),
        new Corner(new Vec2(924, 668), 1.0),
        new Corner(new Vec2(924, 100), 1.0),
    ]),
];
var MainScene = /** @class */ (function () {
    function MainScene() {
        this.controlScheme = ControlScheme.MouseFollow;
        this.mousePos = new Vec2(0.0, 0.0);
        this.brake = false;
        this.gas = false;
        this.cameraPos = new Vec2(0.0, 0.0);
        this.car = new Car();
        this.track = tracks[0];
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
        var throttle;
        switch (this.controlScheme) {
            case ControlScheme.MouseAxes:
                // Left steering: 0 (right) to 1 (left)
                var leftSteering = clamp((DEAD_AREA_LEFT - this.mousePos.x) / STEERING_WIDTH, 0.0, 1.0);
                // Right steering: 0 (left) to 1 (right)
                var rightSteering = clamp((this.mousePos.x - DEAD_AREA_RIGHT) / STEERING_WIDTH, 0.0, 1.0);
                // Throttle: 0 (bottom) to 1 (top)
                throttle = clamp((CONTROL_AREA_BOTTOM - this.mousePos.y) / CONTROL_AREA_HEIGHT, 0.0, 1.0);
                // Steering
                this.car.steering = MAX_STEERING_ANGLE * (rightSteering - leftSteering);
                break;
            case ControlScheme.MouseFollow:
                var offset = this.mousePos.minus(this.car.pos);
                var angle = Angle.fromVec2(offset);
                var distance = offset.length();
                throttle = Math.min(MAX_SPEED_DISTANCE, distance) / MAX_SPEED_DISTANCE;
                this.car.steering = clamp(this.car.heading.smallestAngleTo(angle).getNegativePiToPi(), -MAX_STEERING_ANGLE, MAX_STEERING_ANGLE);
                break;
        }
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
        // Change in heading
        this.car.heading = this.car.heading.plus(this.car.steering * this.car.speed / 50.0);
        var vx = this.car.speed * this.car.heading.cos();
        var vy = this.car.speed * this.car.heading.sin();
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
        this.car.frontBumper.pos.x = this.car.pos.x + 20.0 * this.car.heading.cos();
        this.car.frontBumper.pos.y = this.car.pos.y + 20.0 * this.car.heading.sin();
        this.car.backBumper.pos.x = this.car.pos.x - 20.0 * this.car.heading.cos();
        this.car.backBumper.pos.y = this.car.pos.y - 20.0 * this.car.heading.sin();
        this.wallBumperCollision(this.car.frontBumper);
        this.wallBumperCollision(this.car.backBumper);
        // The camera leads the car.
        //this.cameraPos = new Vec2(this.car.pos.x + 20.0 * vx, this.car.pos.y + 20.0 * vy);
        //this.cameraPos = this.car.pos;
    };
    MainScene.prototype.offRoad = function () {
        // TODO: Collision detection with track's bezier curves
        // for (let i = 0; i < this.track.length; ++i) {
        // 	const start = this.trackPoints[i];
        // 	const end = this.trackPoints[(i + 1) % this.trackPoints.length];
        // 	const segment = new Segment2(start, end);
        // 	if (segment.pointDistance2(this.car.pos) < TRACK_RADIUS * TRACK_RADIUS) {
        // 		return false;
        // 	}
        // }
        // return true;
        return false;
    };
    MainScene.prototype.wallBumperCollision = function (bumper) {
        for (var _i = 0, _a = this.wallsNear(bumper.pos); _i < _a.length; _i++) {
            var wall = _a[_i];
            var r = bumper.radius + wall.radius;
            var dx = bumper.pos.x - wall.pos.x;
            var dy = bumper.pos.y - wall.pos.y;
            var d2 = dx * dx + dy * dy;
            if (d2 != 0.0 && d2 < r * r) {
                this.car.speed = -(1.0 - WALL_BOUNCE_LOSS) * this.car.speed;
                var d = Math.sqrt(d2);
                var factor = (r - d) / d;
                this.car.pos.x += dx * factor;
                this.car.pos.y += dy * factor;
            }
        }
    };
    MainScene.prototype.draw = function (_timestamp) {
        var _this = this;
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
        var frontRight = new Vec2(x + frontOffset * this.car.heading.plus(frontAngleOffset).cos(), y + frontOffset * this.car.heading.plus(frontAngleOffset).sin());
        var frontLeft = new Vec2(x + frontOffset * this.car.heading.minus(frontAngleOffset).cos(), y + frontOffset * this.car.heading.minus(frontAngleOffset).sin());
        var backLeft = new Vec2(x + backOffset * this.car.heading.plus(Math.PI + backAngleOffset).cos(), y + backOffset * this.car.heading.plus(backAngleOffset + Math.PI).sin());
        var backRight = new Vec2(x + backOffset * this.car.heading.plus(Math.PI - backAngleOffset).cos(), y + backOffset * this.car.heading.minus(backAngleOffset - Math.PI).sin());
        drawBumper(this.car.frontBumper);
        drawBumper(this.car.backBumper);
        var wheelRadius = 8.0;
        drawWheel(frontRight, this.car.heading.plus(this.car.steering), wheelRadius, Math.PI / 6.0);
        drawWheel(frontLeft, this.car.heading.plus(this.car.steering), wheelRadius, Math.PI / 6.0);
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
        window.requestAnimationFrame(function (timestamp) {
            _this.draw(timestamp);
        });
    };
    MainScene.prototype.drawTrack = function (radius, style) {
        ctx.beginPath();
        ctx.strokeStyle = style;
        var start = this.track.spline[0].start;
        ctx.moveTo(start.x, start.y);
        for (var _i = 0, _a = this.track.spline; _i < _a.length; _i++) {
            var curve = _a[_i];
            ctx.bezierCurveTo(curve.cp1.x, curve.cp1.y, curve.cp2.x, curve.cp2.y, curve.end.x, curve.end.y);
            ctx.lineWidth = 2 * radius;
            ctx.stroke();
        }
        // Draw Bezier curve "frame".
        ctx.lineWidth = 1;
        var even = true;
        for (var _b = 0, _c = this.track.spline; _b < _c.length; _b++) {
            var curve = _c[_b];
            ctx.strokeStyle = even ? "red" : "white";
            even = !even;
            ctx.beginPath();
            ctx.moveTo(curve.start.x, curve.start.y);
            ctx.lineTo(curve.cp1.x, curve.cp1.y);
            ctx.lineTo(curve.cp2.x, curve.cp2.y);
            ctx.lineTo(curve.end.x, curve.end.y);
            ctx.stroke();
        }
    };
    return MainScene;
}());
function drawWheel(pos, angle, radius, angleOffset) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(pos.x + radius * angle.plus(angleOffset).cos(), pos.y + radius * angle.plus(angleOffset).sin());
    ctx.lineTo(pos.x + radius * angle.minus(angleOffset).cos(), pos.y + radius * angle.minus(angleOffset).sin());
    ctx.lineTo(pos.x + radius * angle.plus(angleOffset + Math.PI).cos(), pos.y + radius * angle.plus(angleOffset - Math.PI).sin());
    ctx.lineTo(pos.x + radius * angle.minus(angleOffset - Math.PI).cos(), pos.y + radius * angle.minus(angleOffset - Math.PI).sin());
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
// Disable context menu on right-click.
window.oncontextmenu = function () { return false; };
// Update loop
window.setInterval(function () {
    mainScene.update();
}, MS_PER_UPDATE);
// Render loop
window.requestAnimationFrame(function (timestamp) {
    mainScene.draw(timestamp);
});
