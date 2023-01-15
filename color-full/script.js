var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var menu = document.querySelector("#menu");
var title = document.querySelector("#title");
var start = document.querySelector("#start");
var restart = document.querySelector("#restart");
var resume = document.querySelector("#resume");
var tutorial = document.querySelector("#tutorial");

var scale_x =  innerWidth / 1920;
var scale_y = innerHeight / 937;
var text_scale = (scale_x < scale_y) ? scale_x : scale_y;

canvas.width = innerWidth;
canvas.height = innerHeight;

var pause = true;

var color = ['#000000', '#00FFFF', '#FFFF00'];
var change_background = 0;

var player_collision = [0, 0, 0, 0];
var platform_y = canvas.height;
var platform_right_x = canvas.width;
var platform_left_x = 0;
var right_platform = false;
var left_platform = false;
var on_platform = false;
var life = 10;
var stage = 0;
var tutorial_start = false;
var enter_counter = 0;

var tutorial_text = [
	"Press 'A' or '<' to move LEFT...",
	"Press 'D' or '>' to move RIGHT...",
	"Hold 'W', '^', 'Spacebar' to JUMP...",
	"Press 'Shift' to see other platforms...",
	"Orange is spawn...",
	"Purple is a moving platform...",
	"Red takes away life...",
	"Reach the circle...",
];

function check_collision(player, object) {
    return player.x <= object.x + object.width &&
        player.x + player.width >= object.x &&
        player.y <= object.y + object.height &&
        player.y + player.height >= object.y;
}

function check_collision_circle(player, circle_x, circle_y, circle_r) {
    var dx = Math.abs(circle_x - (player.x + player.width / 2));
    var dy = Math.abs(circle_y - (player.y + player.height / 2));
    if(dx > circle_r + player.width / 2 || dy > circle_r + player.height / 2)
        return false;   
    if(dx <= player.width || dy <= player.height)
        return true;
    var dx = dx - player.width;
    var dy = dy - player.height;
    
    return Math.pow(dx, 2) + Math.pow(dy, 2) <= Math.pow(circle_r, 2);  
}

var Vel = 3.5, JumpTime = 40, OnAir = 5, JumpHeight = 5;

class Player {
    constructor(x, y, size, color) {
        this.x = x * scale_x;
        this.y = canvas.height - (y * scale_y);
        this.width = size * scale_x;
        this.height = size * scale_y;
        this.color = color;
        this.left = false;
        this.right = false;
        this.vel = Vel * scale_x;
        this.canJump = true;
        this.jumpTime = JumpTime;
        this.onAir = OnAir;
        this.jumpCounter = this.jumpTime + this.onAir + 1;
        this.jumpHeight = JumpHeight * scale_y;
    }
    run() {
        if (this.left && !this.right && this.x > platform_right_x)
            this.x -= this.vel;
        if (this.right && !this.left && this.x + this.width < platform_left_x)
            this.x += this.vel;
    }
    jump() {
        if (!this.canJump) {
            this.jumpCounter++;
            if (this.jumpCounter < this.jumpTime)
                this.y -= this.jumpHeight;
			if (this.y <= 0)
				this.jumpCounter = this.jumpTime + this.onAir + 1;
        }
    }
    gravity() {
        if (this.jumpCounter > this.jumpTime + this.onAir) {
            if (this.y + this.height >= platform_y)
                this.canJump = true; 
            if (this.y + this.height < platform_y)
                this.y += this.jumpHeight;
        }
    }
    draw() {
        this.run();
        this.jump();
        this.gravity();
		
        ctx.strokeStyle = color[(change_background + 1) % color.length];
        ctx.lineWidth = 2;
        ctx.fillStyle = this.color;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
		
		ctx.beginPath();
		ctx.arc(this.x + this.width / 3, this.y + this.height / 3, 3.5 * text_scale, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.closePath();
		
		ctx.beginPath();
		ctx.arc(this.x + this.width * 2 / 3, this.y + this.height / 3, 3.5 * text_scale, 0, 2 * Math.PI);
		ctx.stroke();
		ctx.closePath();
		
		ctx.beginPath();
		if (life >= 5) 
			ctx.arc(this.x + this.width / 2, this.y + this.height / 2 + 1 * text_scale, 5 * text_scale, 0, Math.PI);
		else if (life >= 3) {
			ctx.moveTo(this.x + 10 * text_scale, this.y + this.height - 15 * text_scale);
			ctx.lineTo(this.x + this.width - 10 * text_scale, this.y + this.height - 15 * text_scale);
		}
		else ctx.arc(this.x + this.width / 2, this.y + this.height / 2 + 8 * text_scale, 5 * text_scale, 0, Math.PI, 1);
		ctx.stroke();
		ctx.closePath();
    }
	
}

class Platform {
    constructor(x, y, width, height, color, type = "platform") {
        this.x = x * scale_x;
        this.y = canvas.height - (y * scale_y);
        this.width = width * scale_x;
        this.height = height * scale_y;
        this.start_x = this.x;
        this.start_y = this.y;
        this.color = color;
		this.type = type;
		this.obtained = false;
    }
    check_collision_direction() {
        if(check_collision(player, this) && !this.obtained) {
            var top = Math.abs(player.y + player.height - this.y);
            var bottom = Math.abs(player.y - this.y - this.height);
            var left = Math.abs(player.x + player.width - this.x);
            var right = Math.abs(player.x - this.x - this.width);
            var check = [top, bottom, left, right];
            if (Math.min.apply(Math, check) == top) // top 
                player_collision[0]++;
            else if (Math.min.apply(Math, check) == bottom) // bottom
                player_collision[1]++;
            else if (Math.min.apply(Math, check) == left) // left
                player_collision[2]++;
            else if (Math.min.apply(Math, check) == right) // right
                player_collision[3]++;
			if (this.type == "heal") {
				life += 5;
				this.obtained = true;
			}
        }
    }
    limit_movement() {
        if (player_collision[0] == 1 && !on_platform) {
            platform_y = this.y - 50;
            on_platform = true;
        }
        if (player_collision[0] == 0) 
            platform_y = canvas.height;
        if (player_collision[1] > 0) 
            if (player_collision[1] > 0 && player_collision[0] == 0) 
                player.jumpCounter = player.jumpTime + player.onAir + 1;
        if (player_collision[2] > 0)
            if (!left_platform && player_collision[2] == 1) {
                platform_left_x = this.x - 1;
                left_platform = true;
            }
        if (player_collision[2] == 0) 
            platform_left_x = canvas.width;
        if (player_collision[3] > 0)
            if (!right_platform && player_collision[3] == 1) {
                platform_right_x = this.x + this.width;
                right_platform = true;
            }
        if (player_collision[3] == 0)
            platform_right_x = 0;
    }
    draw() {
        this.check_collision_direction();
        this.limit_movement();
		if (this.type == "platform") {
        	ctx.fillStyle = this.color;
        	ctx.fillRect(this.x, this.y, this.width, this.height);
		}
		else if (this.type == "teleporter"){
			ctx.strokeStyle = this.color;
        	ctx.lineWidth = 2;
        	ctx.fillStyle = this.color;
        	ctx.strokeRect(this.x, this.y, this.width, this.height);
			ctx.strokeRect(this.x + (10 * scale_x), this.y + (10 * scale_y), this.width - (20 * scale_x), this.height - (20 * scale_y));
		}
		else if (this.type == "heal" && !this.obtained) {
			ctx.strokeStyle = this.color;
        	ctx.lineWidth = 2;
        	ctx.fillStyle = this.color;
			ctx.textAlign = "center";
        	ctx.strokeRect(this.x, this.y, this.width, this.height);
			ctx.fillText("+", (2 * this.x + this.width) / 2, (2 * this.y + this.height) / 2 + 15 * text_scale);
		}
    }
}

class Dead_zone {
    constructor(x, y, width, height) {
        this.x = x * scale_x;
        this.y = canvas.height - (y * scale_y);
        this.start_x = this.x;
        this.start_y = canvas.height - (y * scale_y);
        this.width = width * scale_x;
        this.height = height * scale_y;
        this.color = "red";
    }
    return_spawn() {
        if (check_collision(player, this)) {
            player.right = false;
            player.left = false;
            player.jumpCounter = player.jumpTime + player.onAir + 1;
            player.x = spawn[stage][0] * scale_x;
            player.y = canvas.height - (spawn[stage][1] * scale_y);
            if (!tutorial_start) 
                life--;
            if (life == 0)
                start_menu();
        }
    }
    draw() {
        this.return_spawn();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Slider {
    constructor(x, y, width, height, goal_x, goal_y, Speed_x, Speed_y, restTime) {
        this.x = x * scale_x;
        this.y = canvas.height - (y * scale_y);
        this.width = width * scale_x;
        this.height = height * scale_y;
        this.start_x = x * scale_x;
        this.start_y = canvas.height - (y * scale_y);
        this.goal_x = goal_x * scale_x;
        this.goal_y = canvas.height - (goal_y * scale_y);
        this.slideSpeed_x = Speed_x * scale_x;
        this.slideSpeed_y = Speed_y * scale_y;
        this.on_slider = false;
        this.reachGoal = false;
        this.Time = 0;
        this.restTime = restTime;
        this.color = "purple";
    }
    slide() {
        if (!this.reachGoal) {
            if (this.start_x < this.goal_x) 
                this.x += Math.abs(this.slideSpeed_x);
            else if (this.start_x > this.goal_x) 
                this.x -= Math.abs(this.slideSpeed_x);
            if (this.start_y < this.goal_y) 
                this.y += Math.abs(this.slideSpeed_y);
            else if (this.start_y > this.goal_y) 
                this.y -= Math.abs(this.slideSpeed_y);
            if (this.start_x < this.goal_x && this.x >= this.goal_x || this.start_x > this.goal_x && this.x <= this.goal_x)
                this.x = this.goal_x;
            if (this.start_y < this.goal_y && this.y >= this.goal_y || this.start_y > this.goal_y && this.y <= this.goal_y)
                this.y = this.goal_y;
            if (this.x == this.goal_x && this.y == this.goal_y) {
                this.Time++;
                if (this.Time % this.restTime == 0)
                    this.reachGoal = true;
            }
        }
        if (this.reachGoal) {
            if (this.start_x < this.goal_x) 
                this.x -= Math.abs(this.slideSpeed_x);
            else if (this.start_x > this.goal_x) 
                this.x += Math.abs(this.slideSpeed_x);
            if (this.start_y < this.goal_y) 
                this.y -= Math.abs(this.slideSpeed_y);
            else if (this.start_y > this.goal_y) 
                this.y += Math.abs(this.slideSpeed_y);
            if (this.start_x < this.goal_x && this.x <= this.start_x || this.start_x > this.goal_x && this.x >= this.start_x)
                this.x = this.start_x;
            if (this.start_y < this.goal_y && this.y <= this.start_y || this.start_y > this.goal_y && this.y >= this.start_y)
                this.y = this.start_y;
            if (this.x == this.start_x && this.y == this.start_y) {
                this.Time++;
                if (this.Time % this.restTime == 0)
                    this.reachGoal = false;
            }
        }
    }
    check_collision_direction() {
        if(check_collision(player, this)) {
            var top = Math.abs(player.y + player.height - this.y);
            var bottom = Math.abs(player.y - this.y - this.height);
            var left = Math.abs(player.x + player.width - this.x);
            var right = Math.abs(player.x - this.x - this.width);
            var check = [top, bottom, left, right];
            if (Math.min.apply(Math, check) == top) // top 
                player_collision[0]++;
            else if (Math.min.apply(Math, check) == bottom) // bottom
                player_collision[1]++;
            else if (Math.min.apply(Math, check) == left) // left
                player_collision[2]++;
            else if (Math.min.apply(Math, check) == right) // right
                player_collision[3]++;
        }
    }
    limit_movement() {
        if (player_collision[0] == 1 && !on_platform) {
            this.on_slider = true;
            platform_y = this.y - 1 * scale_y;
			on_platform = true;
        }
        if (player_collision[0] == 0) {
            platform_y = canvas.height;
            on_platform = false;
        }
        if (player_collision[1] > 0 && player_collision[0] == 0) 
            player.jumpCounter = player.jumpTime + player.onAir + 1;
        if (!left_platform && player_collision[2] == 1) {
            platform_left_x = this.x - 1;
            player.x = this.x - player.width + 1;
            left_platform = true;
        }
        if (player_collision[2] == 0) 
            platform_left_x = canvas.width - 1;
        if (player_collision[3] > 0)
            if (!right_platform && player_collision[3] == 1) {
                platform_right_x = this.x + this.width - 1;
                player.x = this.x + this.width - 1;
                right_platform = true;
            }
        if (player_collision[3] == 0)
            platform_right_x = 0;
        if (this.on_slider && this.Time % this.restTime == 0) {
            if (!this.reachGoal) {
                if (this.start_x < this.goal_x) player.x += Math.abs(this.slideSpeed_x);
                else if (this.start_x > this.goal_x) player.x -= Math.abs(this.slideSpeed_x);
                if (this.start_y < this.goal_y) player.y += Math.abs(this.slideSpeed_y);
                else if (this.start_y > this.goal_y) player.y -= Math.abs(this.slideSpeed_y);
                if (this.start_x < this.goal_x && this.x >= this.goal_x || this.start_x > this.goal_x && this.x <= this.goal_x)
                    player.x = this.goal_x;
                if (this.start_y < this.goal_y && this.y >= this.goal_y || this.start_y > this.goal_y && this.y <= this.goal_y) {
                    player.y = this.goal_y - player.height;
                    player.canJump = true;
                }
            }
            if (this.reachGoal) {
                if (this.start_x < this.goal_x) 
                    player.x -= Math.abs(this.slideSpeed_x);
                else if (this.start_x > this.goal_x) 
                    player.x += Math.abs(this.slideSpeed_x);
                if (this.start_y < this.goal_y) {
                    player.y -= Math.abs(this.slideSpeed_y);
                    player.canJump = true;
                }
                else if (this.start_y > this.goal_y) {
                    player.y += Math.abs(this.slideSpeed_y);
                    player.canJump = true;
                }
                if (this.start_x < this.goal_x && this.x <= this.start_x || this.start_x > this.goal_x && this.x >= this.start_x)
                    player.x = this.start_x;
                if (this.start_y < this.goal_y && this.y <= this.start_y || this.start_y > this.goal_y && this.y >= this.start_y)
                    player.y = this.start_y - player.height;
            }   
        }
    }
    draw() {
        this.on_slider = false; 
        this.check_collision_direction();
        this.limit_movement();
        this.slide();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Teleporter {
	constructor (circle_x, circle_y, circle_r, rect_x, rect_y, rect_width, rect_height, color) {
		this.circle_x = circle_x * scale_x;
		this.circle_y = canvas.height - (circle_y * scale_y);
		this.circle_r = (scale_x < scale_y) ? circle_r * scale_x : circle_r * scale_y;
		this.rect_x = rect_x;
		this.rect_y = rect_y;
		this.rect_width = rect_width;
		this.rect_height = rect_height;
		this.color = color;
		this.player_x = (2 * this.rect_x * scale_x + this.rect_width * scale_x) / 2;
		this.player_y = canvas.height - (rect_y * scale_y) - player.height;
	}
	enter_portal() {
		if (check_collision_circle(player, this.circle_x, this.circle_y, this.circle_r)) {
			player.x = this.player_x;
			player.y = this.player_y;
			player.right = false;
			player.left = false;
			player.canJump = false;
		}
	}
	draw() {
		this.enter_portal();
		ctx.strokeStyle = this.color;
		ctx.fillStyle = this.color;
		new Platform (this.rect_x, this.rect_y, this.rect_width, this.rect_height, this.color, "teleporter").draw();
		ctx.beginPath();
		ctx.arc(this.circle_x, this.circle_y, this.circle_r, 0, 2 * Math.PI);
        ctx.stroke();
		ctx.beginPath();
		ctx.arc(this.circle_x, this.circle_y, this.circle_r / 2, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

class Goal {
    constructor(x, y, r) {
        this.x = x * scale_x;
        this.y = canvas.height - (y * scale_y);
        this.start_x = x * scale_x;
        this.start_y = canvas.height - (y * scale_y);
        this.r = r * text_scale;
    }
    victory() {
        if (check_collision_circle(player, this.x, this.y, this.r)) {
			player.right = false;
			player.left = false;
			player.jumpCounter = player.jumpTime + player.onAir + 1;
            stage++;
            change_background = 0;
            tutorial_start = false;
            player.jumpCounter = player.jumpTime + player.onAir + 1;
            if (stage == platform_list.length) {
                add_text("CONGRATULATIONS!");
                start.innerHTML = "- Play Again -";
                start_menu();
            }
            if (stage < platform_list.length){
                player.x = spawn[stage][0] * scale_x;
                player.y = canvas.height - (spawn[stage][1] * scale_y);
            }
        }
    }
    draw() {
        this.victory();
		ctx.strokeStyle = color[(change_background + 1) % color.length];
		ctx.fillStyle = color[(change_background + 1) % color.length];
		ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
		ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }
}

var spawn = [
    [50, 200],
    [50, 200],
    [550, 700],
	[100, 200],
	[500, 800],
	[20, 700],
	[150, 700]
];

var player = new Player(spawn[stage][0], spawn[stage][1], 40, "red");


var platform_list = [
    [
        new Platform (40, 100, 100, 50, "orange"),
        new Platform (250, 100, 50, 50, color[2]),
        new Platform (500, 200, 50, 20, color[1]),
        new Platform (800, 80, 100, 50, color[0]),
        new Dead_zone (0, 25, canvas.width / scale_x, 25),
        new Slider(1000, 150, 100, 50, 1300, 300, 3, 3, 40),
        new Goal (1450, 350, 30),
    ],
    [
        new Platform (50, 100, 100, 50, "orange"),
        new Platform (300, 100, 100, 50, color[1]),
        new Platform (500, 200, 100, 50, color[0]),
        new Platform (700, 350, 100, 50, color[2]),
        new Dead_zone (0, 25, canvas.width / scale_x, 25),
        new Goal (600, 500, 30),
    ],
    [
        new Platform (500, 500, 100, 50, "orange"),
        new Slider (50, 200, 100, 10, 1200, 100, 3, 2, 30),
        new Dead_zone (650, 500, 1000, 20),
        new Dead_zone (0, 25, canvas.width / scale_x, 25),
        new Dead_zone (400, 200, 20, 80),
        new Dead_zone (1000, 200, 20, 80),
        new Goal (1400, 200, 30),
    ],
	[
		new Platform (50, 100, 100, 50, "orange"),
		new Slider (200, 100, 100, 50, 200, 400, 0, 3, 80),
		new Dead_zone (400, 300, 800, 20),
		new Slider (400, 400, 100, 20, 400, 200, 0, 3, 80),
		new Slider (600, 100, 100, 20, 600, 400, 0, 3, 160),
		new Dead_zone (750, 525, 10, 160),
		new Platform (800, 500, 100, 50, color[0]),
		new Platform (1100, 500, 100, 50, color[2]),
		new Dead_zone (0, 10, canvas.width / scale_x, 10),
		new Goal (1500, 500, 30)
	],
	[
		new Platform (450, 600, 100, 50, "orange"),
		new Dead_zone (0, 10, canvas.width / scale_x, 10),
		new Dead_zone (0, 500, 1000, 10),
		new Dead_zone (1000, 500, 10, 350),
		new Slider (600, 400, 50, 20, 600, 600, 0, 3, 100),
		new Slider (800, 400, 50, 20, 800, 600, 0, 3, 150),
		new Slider (1100, 400, 50, 20, 1100, 600, 0, 3, 200),
		new Dead_zone (1000, 300, 500, 10),
		new Teleporter (1300, 400, 20, 500, 200, 100, 20, "blue"),
		new Dead_zone (460, 325, 10, 100),
		new Goal (400, 400, 30),
	],
	[
		new Dead_zone (220, canvas.height / scale_y - (230 * scale_y), 10, canvas.height / scale_y - (230 * scale_y)),
		new Dead_zone (0, 750, 230, 10),
		new Dead_zone (0, 500, 225, 10),
		new Dead_zone (220, 400, 300, 10),
		new Dead_zone (220, 600, 1500, 10),
		new Dead_zone (1720, canvas.height / scale_y, 10, 500),
		new Dead_zone (800, 600, 10, 600),
		new Dead_zone (1010, canvas.height / scale_y, 10, 340),
		new Dead_zone (0, 10, canvas.width / scale_x, 10),
		new Dead_zone (1100, 200, 10, 200),
		new Dead_zone (1300, 600, 10, 200),
		new Teleporter (150, 700, 20, 250, 700, 100, 50, "green"),
		new Teleporter (150, 600, 20, 10, 400, 100, 50, "blue"),
		new Teleporter (900, 700, 20, 10, 400, 100, 50, "blue"),
		new Teleporter (1400, 700, 20, 10, 400, 100, 50, "blue"),
		new Teleporter (100, 100, 20, 1100, 800, 100, 50, color[1]),
		new Teleporter (1650, 250, 20, 1100, 800, 100, 50, color[1]),
		new Teleporter (100, 200, 20, 800, 850, 100, 50, color[0]),
		new Teleporter (265, 520, 20, 800, 850, 100, 50, color[0]),
		new Teleporter (1800, 300, 10, 800, 850, 100, 50, color[0]),
		new Teleporter (100, 300, 20, 300, 500, 100, 50, color[2]),
		new Teleporter (750, 800, 20, 300, 500, 100, 50, color[2]),
		new Teleporter (1850, 700, 10, 300, 500, 100, 50, color[2]),
		new Teleporter (400, 700, 20, 10, 600, 100, 50, "orange"),
		new Teleporter (1050, 300, 20, 10, 600, 100, 50, "orange"),
		new Teleporter (350, 300, 20, 850, 100, 100, 50, "pink"),
		new Teleporter (700, 500, 20, 850, 450, 100, 50, "white"),
		new Platform (700, 250, 50, 50, color[0]),
		new Platform (1500, 800, 100, 50, color[2]),
		new Platform (1200, 100, 100, 50, color[2]),
		new Platform (1400, 200, 100, 50, color[0]),
		new Slider (425, 200, 75, 20, 425, 500, 0, 3, 100),
		new Slider (550, 450, 75, 20, 550, 150, 0, 3, 100),
		new Slider (1800, 100, 50, 25, 1800, 700, 0, 3, 100),
		new Slider (1500, 700, 100, 20, 1800, 700, 3, 0, 1),
		new Platform (1350, 850, 50, 50, "lime", "heal"),
		new Goal (1820, 800, 30),
	],
	[
		new Platform (100, 600, 100, 50, "orange"),
		new Platform (300, 600, 50, 25, color[1]),
		new Platform (500, 450, 30, 10, color[0]),
		new Platform (125, 200, 40, 20, color[2]),
		new Platform (200, 125, 50, 25, color[1]),
		new Platform (400, 125, 50, 25, color[0]),
		new Platform (700, 200, 50, 25, color[2]),
		new Platform (1400, 800, 50, 25, color[0]),
		new Platform (1050, 100, 50, 25, color[2]),
		new Platform (1800, 200, 50, 25, color[1]),
		new Platform (1700, 350, 50, 25, color[0]),
		new Platform (1550, 400, 50, 25, color[2]),
		new Slider (400, 500, 50, 20, 400, 800, 0, 5, 50),
		new Slider (550, 800, 50, 25, 1200, 800, 6, 0, 100),
		new Slider (75, 325, 10, 50, 300, 325, 2, 0, 40),
		new Slider (25, 270, 50, 10, 25, 75, 0, 2, 40),
		new Slider (1100, 500, 100, 10, 1100, 600, 0, 3, 10),
		new Slider (1200, 600, 100, 10, 1200, 500, 0, 3, 10),
		new Slider (1300, 500, 100, 10, 1300, 600, 0, 3, 10),
		new Slider (1400, 600, 100, 10, 1400, 500, 0, 3, 10),
		new Slider (1500, 500, 100, 10, 1500, 600, 0, 3, 10),
		new Slider (600, 150, 40, 20, 500, 150, 3, 0, 40),
		new Slider (1200, 100, 40, 20, 1700, 100, 3, 0, 40),
		new Teleporter (650, 690, 20, 300, 800, 25, 25, "pink"),
		new Teleporter (850, 900, 20, 750, 650, 30, 30, "blue"),
		new Teleporter (50, 300, 20, 950, 850, 50, 20, color[1]),
		new Teleporter (850, 640, 20, 780, 400, 40, 20, color[2]),
		new Teleporter (1400, 340, 10, 780, 400, 40, 20, color[2]),
		new Teleporter (1300, 240, 10, 780, 400, 40, 20, color[2]),
		new Teleporter (1750, 440, 10, 780, 400, 40, 20, color[2]),
		new Teleporter (1500, 430, 10, 780, 400, 40, 20, color[2]),
		new Teleporter (1500, 250, 10, 780, 400, 40, 20, color[2]),
		new Teleporter (750, 550, 10, 950, 650, 100, 50, color[0]),
		new Teleporter (1600, 850, 20, 950, 450, 50, 25, "#c6e2ff"),
        new Teleporter (1700, 650, 20, 800, 250, 50, 20, "lightgrey"),
        new Teleporter (1200, 150, 10, 800, 250, 50, 20, "lightgrey"),
        new Teleporter (1400, 150, 10, 800, 250, 50, 20, "lightgrey"),
        new Teleporter (1600, 150, 10, 800, 250, 50, 20, "lightgrey"),
        new Teleporter (1400, 450, 10, 1800, 730, 50, 20, "green"),
        new Teleporter (1000, 250, 10, 1800, 730, 50, 20, "green"),
        new Teleporter (1200, 350, 10, 1800, 730, 50, 20, "green"),
        new Teleporter (1350, 320, 10, 1800, 730, 50, 20, "green"),
        new Teleporter (1100, 300, 10, 1800, 730, 50, 20, "green"),
        new Teleporter (1650, 500, 10, 1825, 475, 50, 25, "white"),
		new Dead_zone (0, 750, 1920, 10),
		new Dead_zone (500, 820, 10, 270),
		new Dead_zone (700, 750, 10, 400),
		new Dead_zone (0, 360, 700, 10),
		new Dead_zone (800, 600, 10, 100),
		new Dead_zone (900, 550, 1020, 10),
		new Dead_zone (710, 360, 200, 10),
		new Dead_zone (300, 200, 10, 100),
		new Dead_zone (75, 230, 20, 20),
		new Dead_zone (475, 200, 10, 75),
		new Dead_zone (1150, 150, 10, 80),
		new Dead_zone (0, 10, canvas.width / scale_x, 10),
		new Dead_zone (900, canvas.height / scale_y, 10, 950),
		new Goal (1850, 500, 10),
	]
];

var in_game = platform_list;

addEventListener("keydown", (event) => {
    if (!pause) {
        console.log(event.keyCode);
        if (event.keyCode === 65 || event.keyCode === 37) {
                player.right = false;
                player.left = true;
                player.vel = Vel * scale_x;
        }
        if (event.keyCode === 68 || event.keyCode === 39) {
                player.right = true;
                player.left = false;
                player.vel = Vel * scale_x;
        }
        if (event.keyCode === 87 || event.keyCode === 38 || event.keyCode === 32) {
            if (player.canJump) {
                if (player_collision[0] > 0) {
                    on_platform = false;
                    player.jumpCounter = 0;
                    player.canJump = false;
                }
            }
        }
        if (event.keyCode === 16) 
            change_background++;
        if (event.keyCode === 27) {
            event.preventDefault();
            paused();
        }
		if (event.keyCode === 13)
			enter_counter++;
    }
});

addEventListener("keyup", (event) => {
    if (!pause) {
		if (event.keyCode === 87 || event.keyCode === 38 || event.keyCode === 32) {
			player.jumpCounter = player.jumpTime + player.onAir + 1;
            player.canJump = false;
		}
        if (event.keyCode === 65 || event.keyCode === 37) {
            player.left = false;
        }
        if (event.keyCode === 68 || event.keyCode === 39) {
            player.right = false;
        }
        if (event.keyCode === 27)
            event.preventDefault();
    }
});

addEventListener("keypress", (event) => {
    if (event.keyCode === 27) 
        event.preventDefault();
});

function update_frame() {
    if (life > 0 && !pause) {
        ctx.fillStyle = color[change_background % 3] + "40";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        player_collision = [0, 0, 0, 0];
        on_platform = false;
        right_platform = false;
        left_platform = false;
        ctx.fillStyle = color[(change_background + 1) % 3];
		ctx.textAlign = "start";
		ctx.font = 50 * text_scale + "px Arial";
        if (!tutorial_start) {
            ctx.fillText(`Stage: ${stage} / ${platform_list.length - 1}`, 30  * scale_x, 80  * scale_y);
            ctx.fillText("Life: " + life, 30  * scale_x, 150  * scale_y);
        }
        if (tutorial_start) {
			if (enter_counter < tutorial_text.length) {
				ctx.font = 80 * text_scale + "px Arial";
				ctx.textAlign = "center";
            	ctx.fillText(tutorial_text[enter_counter], canvas.width / 2, 300  * scale_y);
				ctx.font = 40 * text_scale + "px Arial";
				ctx.fillText("Press 'Enter' to continue..." , canvas.width / 2, 450  * scale_y);
			}
        }
        player.draw();
        in_game[stage].forEach((platform) => {
            platform.draw();
        });
        ctx.fillStyle = color[(change_background + 1) % 3];
        window.setTimeout(() => {requestAnimationFrame(update_frame);}, 12);
    }
}


function start_menu() {
    menu.style.display = "flex";
    restart.style.display = "none";
    resume.style.display = "none";
    start.style.display = "block";
    tutorial.style.display = "block";
    pause = true;
    setTimeout(() => {
        ctx.fillStyle = color[0];
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, 0);
}

function start_game() {
    stage = 1;
	enter_counter = 0;
    pause = false;
    start.style.display = "none";
    tutorial.style.display = "none";
    menu.style.display = "none";
    resume.style.display = "block";
    restart.style.display = "block";
    var audio = new Audio("bgm.mp3").play();
	audio.loop = true;
    restarted();
}

function paused() {
    pause = true;
    add_text("PAUSED");
    start.innerHTML = "- Try Again... -";
    menu.style.display = "flex";
}

function resumed() {
    pause = false;
    menu.style.display = "none";
    update_frame();
}

function restarted() {
	in_game = platform_list;
    player.right = false;
    player.left = false;
    pause = false;
    menu.style.display = "none";
    player.x = spawn[stage][0] * scale_x;
    player.y = canvas.height - (spawn[stage][1] * scale_y);
    player.jumpCounter = player.jumpTime + player.onAir + 1;
    life = 10;
    enter_counter = 0;
    in_game[stage].forEach((platform) => {
        platform.x = platform.start_x;
        platform.y = platform.start_y;
    });
    update_frame();
}

function how_to_play() {
    stage = 0;
    pause = false;
    enter_counter = 0;
    start.style.display = "none";
    tutorial.style.display = "none";
    menu.style.display = "none";
    resume.style.display = "block";
    restart.style.display = "block";
    tutorial_start = true;
    restarted();
    var audio = new Audio("bgm.mp3").play();
    audio.loop = true;
}

function add_text(text) {
    title.innerHTML = "";
    for (let i = 0; i < text.length; i++)
        title.innerHTML += ("<span>" + text[i] + "</span>");
}

start_menu();

/* to-do list
    extra platforms
        temporary - shrinks after certain duration - pink
        triggered - appears when key is obtained
    create map
    paused window
        window scaling
    life
        heart
*/