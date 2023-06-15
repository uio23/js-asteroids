// Initialize game canvas
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');


// Set player-motion force magnitudes
const ACCELERATION = 0.1;
const ROTATIONAL_SPEED = 0.002;
const FRICTION = 0.97;
const ROTATION_FRICTION = 0.98;
const RCS_FRICTION = 0.85;

const PROJECTILE_SPEED = 25;

const projectiles = [];

const WIDTH = 4000;
const HEIGHT = 4000;

const OFFSET = 40;


// Resize canvas to window dimentions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Fill canvas with black background
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);


class Boost {
    constructor(absolutePosition) {
        this.absolutePosition = absolutePosition;
        this.radius = 20;
    }

    draw (position) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.radius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'green';
        ctx.fill();
    }
}

const boosts = []
for (let i = 0; i <= 10; i++) {
    boosts.push(new Boost({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT
    }));
}


class Player {
    constructor({position, velocity}) {
        this.position = position; // {x, y}
        this.absolutePosition = {x: 1000, y: 1000};
        this.velocity = velocity; // {x, y}
        this.rotation = 0; // Radians
        this.rotation_speed = 0; // Radians
    }


    draw() {
        // All draw-state changes will only affect strokes/fills up to 'restore' 
        ctx.save();

        
        // Translate canvas origin to center of player
        ctx.translate(this.position.x, this.position.y);

        // If the rotation is/more than one revolaton, reset it to 0
        if (Math.abs(this.rotation) >= Math.PI * 2) this.rotation = 0;

        // Rotate canvas by current rotation angle
        ctx.rotate(this.rotation);

        // Reset origin of canvas to top-right of window
        ctx.translate(-this.position.x, -this.position.y);


        // Create player's centre-circle path/shape & draw it
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 4, 0, Math.PI * 2, false);
        ctx.closePath();

        // Thick blue stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'blue';
        ctx.stroke();


        // Create player's path (triangle) & draw it
        ctx.beginPath();
        ctx.moveTo(this.position.x + 30, this.position.y);
        ctx.lineTo(this.position.x - 10, this.position.y - 10);
        ctx.lineTo(this.position.x - 10, this.position.y + 10);
        ctx.closePath();

        // Thin white stroke
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();


        ctx.restore();   
    }


    update() {
        this.draw();

       
        if (!(OFFSET >= this.absolutePosition.x + this.velocity.x || this.absolutePosition.x + this.velocity.x >= WIDTH - OFFSET)) {
            if ((this.absolutePosition.x + canvas.width / 2 >= WIDTH) || this.absolutePosition.x - canvas.width / 2 <= 0) {
                this.position.x += this.velocity.x;
            }
            this.absolutePosition.x += this.velocity.x; 
        } else {
            this.velocity.x = 0;
        }
        
        if (!(OFFSET >= this.absolutePosition.y + this.velocity.y || this.absolutePosition.y + this.velocity.y >= HEIGHT - OFFSET)) {
            if ((this.absolutePosition.y + canvas.height / 2 >= HEIGHT) || this.absolutePosition.y - canvas.height / 2 <= 0) {
                this.position.y += this.velocity.y;
            }
            this.absolutePosition.y += this.velocity.y; 
        } else {
            this.velocity.y = 0;
        }


        // Update rotation based on rotation speed change
        this.rotation += this.rotation_speed;


        // Calculate distances from center of spaceship relative to canvas x & y
        // var pointADistance = Math.cos(this.rotation) * 30;
        // var pointBDistance = Math.cos(Math.PI - this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);
        // var pointCDistance = Math.cos(Math.PI + this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);
       
        for (let i = boosts.length - 1; i >= 0; i--) {
            const boost = boosts[i];
            let distancesToPlayerX = boost.absolutePosition.x - this.absolutePosition.x;
            let distanceToViewX = distancesToPlayerX + (canvas.width / 2);
            let distancesToPlayerY = boost.absolutePosition.y - this.absolutePosition.y;
            let distanceToViewY =  distancesToPlayerY + (canvas.height / 2);


            boost.draw({x: distanceToViewX, y: distanceToViewY});

            if (keys.i.toggled) {
            ctx.fillStyle = "white";
            ctx.font = "24px sans-serif";   
            ctx.fillText(boost.absolutePosition.x, distanceToViewX, distanceToViewY);
            ctx.fillText(boost.absolutePosition.y , distanceToViewX, distanceToViewY + 40);
            }


            if (Math.abs(this.absolutePosition.x - boost.absolutePosition.x) <= 22.5 &&  Math.abs(this.absolutePosition.y - boost.absolutePosition.y) <= 12.5) {
                ammoBar.refill();
                boosts.splice(i, 1);
            }
           
        }


        if (keys.i.toggled) {
            ctx.font = "36px sans-serif";
            ctx.fillText(player.absolutePosition.x , 500, 100)
            ctx.fillText(player.absolutePosition.y , 500, 200)   
        }
    }
}


class Projectile {
    constructor({position, velocity}) {
        this.position = position;
        this.velocity = velocity;
        this.radius = 5;
    }

    draw () {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    update () {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}


class AmmoBar {
    constructor ({position, size, fill = 1, ammoWeight}) {
        this.position = position;
        this.size = {
            width: size.width,
            height: size.height
        }
        this.fullHeight = size.height;
        this.originalY = position.y;
        this.color = 'green';
        this.fill = fill;
        this.ammoWeight = ammoWeight;
    }

    draw () {
        if (this.fill >= 0.6) {
            this.color = 'green';
        } else if (this.fill >= 0.4) {
            this.color = '#FDDA0D';
        } else if (this.fill >= 0.2) {
            this.color = 'orange';
        } else {
            this.color = 'red';
        }
        ctx.fillStyle = this.color;

        if (this.fill >= this.ammoWeight) { 
            ctx.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
        } else {
            ctx.fillRect(this.position.x, this.position.y, this.size.width, 1);
        }

        // Show how much ammo is left
        ctx.font = "48px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(Math.round(this.fill/this.ammoWeight), this.position.x + this.size.width/2, this.originalY + this.fullHeight /2);
        
        
    }

    update () {
        this.fill = (this.fill - this.ammoWeight).toFixed(8);
        this.position.y = this.position.y +  (this.size.height - (this.fullHeight * this.fill));
        this.size.height = this.fullHeight * this.fill;
    }

    refill () {
        this.fill = 1;
        this.position.y = this.originalY;
        this.size.height = this.fullHeight;
    }
}




// Create still player in center of canvas
const player = new Player({
    position: {x: canvas.width / 2, y: canvas.height / 2}, 
    velocity: {x: 0, y: 0}
});


// Create an ammoBar with an ammo-weight of 2%
const ammoBar = new AmmoBar({
    position: {
        x: 20,
        y: 20
    },
    size: {
        width: 100,
        height: 200
    },
    ammoWeight: 0.005
});


// Define a key-map for control keys
const keys = {
    w: {
        pressed: false
    },
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    r: {
        toggled: false
    },
    f: {
        toggled: false
    },
    i: {
        toggled: false
    },
    space: {
        pressed: false
    }
}


// Define game loop...
function animate() {
    // Re-run function constantley
    window.requestAnimationFrame(animate);

    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    player.update();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.update();

        // Projectile garbage-collection
        if (projectile.position.x + projectile.radius < 0 ||
            projectile.position.x - projectile.radius > canvas.width ||
            projectile.position.y - projectiles.radisu > canvas.height ||
            projectile.position.y + projectile.radius < 0) {
            projectiles.splice(i, 1);
        }
    }


    ammoBar.draw();


    // ...based on key-map states...
    // Update player's rotation-speed
    if (keys.d.pressed) {
        player.rotation_speed += ROTATIONAL_SPEED;
    } else if (keys.a.pressed) {
        player.rotation_speed -= ROTATIONAL_SPEED;
    } 
    // If not turning
    else {
        // If R.C.S is toggled stop rotation a lot more efficientley
        if (keys.r.toggled) {
            player.rotation_speed *= RCS_FRICTION;
        } 
        // Else use typical rotation friction
        else {
            player.rotation_speed *= ROTATION_FRICTION;
        }
    }

    // Update player's velocity
    if (keys.w.pressed) {
        player.velocity.x += Math.cos(player.rotation) * ACCELERATION;
        player.velocity.y +=  Math.sin(player.rotation)  * ACCELERATION;
    }
    // Decrease velocity if not accelerating
    else {
        player.velocity.x *= FRICTION;
        player.velocity.y *= FRICTION;
    }
    if (keys.f.toggled) {
        if (ammoBar.fill >= ammoBar.ammoWeight) {
            projectiles.push(new Projectile({
                position: {
                    x: player.position.x + Math.cos(player.rotation) * 30,
                    y: player.position.y + Math.sin(player.rotation) * 30
                },
                velocity: {
                    x: Math.cos(player.rotation) * PROJECTILE_SPEED + player.velocity.x,
                    y: Math.sin(player.rotation) * PROJECTILE_SPEED + player.velocity.y
                }
            }));
            ammoBar.update();
        }
    }


    // Inform user if R.C.S is toggled
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    if (keys.r.toggled) {
        ctx.fillText("R.C.S ON", canvas.width/2, canvas.height -50);
    } else {
        ctx.fillText("R.C.S OFF", canvas.width/2, canvas.height -50);
    }

}


// Run animation game-loop
animate();


// Update key-map when a control key is pressed
window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW':
            keys.w.pressed = true;
            break;
        case 'KeyA':
            keys.a.pressed = true;
            break;
        case 'KeyD':
            keys.d.pressed = true;
            break;
        case 'Space':
            // Stop anoyying spacebar scroll
            event.preventDefault();

            if (ammoBar.fill >= ammoBar.ammoWeight && !keys.space.pressed) {
                keys.space.pressed = true;
                projectiles.push(new Projectile({
                    position: {
                        x: player.position.x + Math.cos(player.rotation) * 30,
                        y: player.position.y + Math.sin(player.rotation) * 30
                    },
                    velocity: {
                        x: Math.cos(player.rotation) * PROJECTILE_SPEED + player.velocity.x,
                        y: Math.sin(player.rotation) * PROJECTILE_SPEED + player.velocity.y
                    }
                }));
                ammoBar.update();
            }
            break;
        case 'KeyR':
            keys.r.toggled = !keys.r.toggled;
            break;
        case 'KeyF':
            keys.f.toggled = !keys.f.toggled;
            break;
        case 'KeyI':
            keys.i.toggled = !keys.i.toggled;
            break;
    }
});

// Update key-map when a control key is released
window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW':
            keys.w.pressed = false;
            break;
        case 'KeyA':
            keys.a.pressed = false;
            break;
        case 'KeyD':
            keys.d.pressed = false;
            break;
        case 'Space':
            keys.space.pressed = false;
            break;
    }
});

