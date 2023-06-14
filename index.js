// Initialize game canvas
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');


// Set player-motion force magnitudes
const ACCELERATION = 0.2;
const ROTATIONAL_SPEED = 0.002;
const FRICTION = 0.97;
const ROTATION_FRICTION = 0.98;
const RCS_FRICTION = 0.85;


// Resize canvas to window dimentions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Fill canvas with black background
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);



class Player {
    constructor({position, velocity}) {
        this.position = position; // {x, y}
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

        // Update position based on velocity change
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Update rotation based on rotation speed change
        this.rotation += this.rotation_speed;


        // Calculate distances from center of spaceship relative to canvas x & y
        var pointADistance = Math.cos(this.rotation) * 30;
        var pointBDistance = Math.cos(Math.PI - this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);
        var pointCDistance = Math.cos(Math.PI + this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);

        // Re-spawn player on opposite edge of screen if player exits screen
        if (
            this.position.x + pointADistance  > canvas.width &&
            this.position.x - pointBDistance  > canvas.width && 
            this.position.x - pointCDistance  > canvas.width
            ) {
            this.position.x = 0 - Math.max(pointADistance, pointBDistance, pointCDistance);
        } else if (
            this.position.x + pointADistance  < 0 &&
            this.position.x - pointBDistance  < 0 && 
            this.position.x - pointCDistance  < 0
            ) {
                this.position.x = canvas.width + Math.min(pointADistance, pointBDistance, pointCDistance);
        }

        if (
            this.position.y + pointADistance  > canvas.height &&
            this.position.y - pointBDistance  > canvas.height && 
            this.position.y - pointCDistance  > canvas.height
            ) {
                console.log(pointADistance);
                console.log(pointBDistance)
                console.log(pointCDistance);
            this.position.y = 0 - Math.max(pointADistance, pointBDistance, pointCDistance);
        } else if (
            this.position.y + pointADistance  < 0 &&
            this.position.y - pointBDistance  < 0 && 
            this.position.y - pointCDistance  < 0
        ) {
            this.position.y = canvas.height - Math.min(pointADistance, pointBDistance, pointCDistance);
        }
    }
}


// Create still player in center of canvas
const player = new Player({
    position: {x: canvas.width / 2, y: canvas.height / 2}, 
    velocity: {x: 0, y: 0}
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
        case 'KeyR':
            keys.r.toggled = !keys.r.toggled;
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
    }
});
