// Initialize game canvas
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Resize canvas to window dimentions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Fill canvas with black background
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);


var socket = io.connect('localhost:3000');


var players = [];
var ammoBoosts = [];
var projectiles = [];
var thisPlayer = {};
var thisPlayerId;
var miniMapScales = [];
const messages = [];
var miniMap;
var ammoBar;



socket.on('playerJoined', message => {
    messages.push(new Message(message));
});

socket.on('playerLeft', data => {
    players = data.playersList;
    messages.push(new Message(data.message));
});

socket.on('sprites', sprites => {
    players = sprites.players;
    ammoBoosts = sprites.ammoBoosts;
    projectiles = sprites.projectiles;

    players.forEach(player => {
        if (player.id == thisPlayerId) {
            thisPlayer = player;
        }
    });
});

socket.on('connect', () => {
    thisPlayerId = socket.id;
    socket.emit('canvasCenter', {x: canvas.width / 2, y: canvas.height / 2});
});

socket.on('config', config => {
    gameConfiguration = config.gameConfiguration;
    miniMapScales = config.miniMapScales;
    players = config.players;

    players.forEach(player => {
        if (player.id == thisPlayerId) {
            thisPlayer = player;
        }
    });

    


    miniMap = new MiniMap({
        offset: {x: 50, y: 50},
        width: canvas.width / 5,
        miniMapScales: miniMapScales
    })
    
    // Create an ammoBar with an ammo-weight of 2%
    ammoBar = new AmmoBar({
        position: {
            x: 20,
            y: 20
        },
        size: {
            width: 100,
            height: 200
        }
    });
    
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
    space: {
        pressed: false,
        used: false
    },
    r: {
        toggled: false
    },
    digit: {
        value: 0
    },
    digitChange: true
}


// Define game loop...
function animate() {
    // Re-run function constantley
    window.requestAnimationFrame(animate);


    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('frame', keys);
    if (keys.space.pressed) {
        keys.space.used = true;
    }
    



    miniMap.draw(ctx, thisPlayer);
    ammoBar.draw(ctx, thisPlayer);

    
    

    // Update mini-map scale
    if (keys.digitChange) {
        keys.digitChange = false;
        miniMap.updateActualSize(keys.digit.value);
    }
    

    // Loop to draw players
    for (let i = players.length - 1; i >= 0; i--) { 
        const player = players[i];
        if (player.id != thisPlayer.id) {
            Artist.drawPlayer(ctx, player, thisPlayer);
        } else {
            Artist.drawThisPlayer(ctx, canvas, player);
        }
    }
    

    for (let i = ammoBoosts.length - 1; i >= 0; i--) {
        const boost = ammoBoosts[i];


        let distancesToPlayerX = boost.absolutePosition.x - thisPlayer.absolutePosition.x;
        let distanceToViewX = distancesToPlayerX + (canvas.width / 2);

        let distancesToPlayerY = boost.absolutePosition.y - thisPlayer.absolutePosition.y;
        let distanceToViewY =  distancesToPlayerY + (canvas.height / 2);

        // Only draw the boost if it would be visible to the player
        if (Math.abs(distanceToViewX) + boost.radius <= canvas.width &&
            Math.abs(distanceToViewY) + boost.radius <= canvas.height) {
                Artist.drawBoost(ctx, boost, {x: distanceToViewX, y: distanceToViewY});
        }
        miniMap.drawItem(boost, {x: distancesToPlayerX, y:distancesToPlayerY});

    }
    

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = ammoBoosts[i];


        let distancesToPlayerX = projectile.absolutePosition.x - thisPlayer.absolutePosition.x;
        let distanceToViewX = distancesToPlayerX + (canvas.width / 2);

        let distancesToPlayerY = projectile.absolutePosition.y - thisPlayer.absolutePosition.y;
        let distanceToViewY =  distancesToPlayerY + (canvas.height / 2);

        // Only draw the boost if it would be visible to the player
        if (Math.abs(distanceToViewX) + projectile.radius <= canvas.width &&
            Math.abs(distanceToViewY) + projectile.radius <= canvas.height) {
                Artist.drawProjectile(ctx, projectile, {x: distanceToViewX, y: distanceToViewY})
            
        }        
    }
    

    // Loop to draw messages
    for (let i = messages.length - 1; i >= 0; i--) { 
        const message = messages[i];


        if (message.opacity > 0) {
            message.update();
        } else {
            messages.splice(i, 1);
        }
    }  
    

}



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

            if (!keys.space.pressed) {
                keys.space.pressed = true;
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
        case 'Digit1':
            keys.digit.value = 0;

            keys.digitChange = true;
            break;
        case 'Digit2':
            keys.digit.value = 1;

            keys.digitChange = true;
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
            keys.space.used = false;
            break;
    }
});






// Run animation game-loop
animate();
