const path = require("path");
const http = require('http');

const express = require('express');
const { Server } = require("socket.io");
const { generateUsername } = require('friendly-username-generator');

const Player = require('./player');
const AmmoBoost = require('./ammoBoost');
const Projectile = require('./projectile');

const gameConfiguration = require('./gameConfiguration');


const app = express();
const server = http.createServer(app);

const io = new Server(server);


app.use(express.static(path.join(__dirname, 'public')));


const players = []
const ammoBoosts = []
const projectiles = []

// Export as gameConfiguration property in future
const miniMapScales = [
    {
        x: gameConfiguration.width / 2,
        y: gameConfiguration.height / 2
    },
    {
        x: gameConfiguration.width,
        y: gameConfiguration.height
    }
]

var playerToReward = null;


// Spawn in 20 ammo boosts
for (let i = 1; i < 20; i++) {
  ammoBoosts.push(new AmmoBoost({
      x: Math.random() * gameConfiguration.width,
      y: Math.random() * gameConfiguration.height
  }));
}


// Serve up game page at any domain path
app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Handle connection to the server
io.on('connection', (socket) => {
  // Create a new player for the user 
  players.push(new Player({
    position: {x: 200 , y: 200}, 
    velocity: {x: 0, y: 0},
    id: socket.id,
    username: generateUsername({useRandomNumber: false});
  }));

  console.log(`\n\nnew player ${players[-1]}\n\n`);

  // Send all users universal configuration data & player list
  socket.emit('config', {gameConfiguration: gameConfiguration, miniMapScales: miniMapScales, players: players});
  // Inform other game-instances of a new player
  socket.broadcast.emit('playerJoined', {message: randUsername + " joined!", messageColor: 'green'});
  
  socket.on('canvasCenter', canvasCenter => {
    players.forEach((player, index) => {
        if (player.id == socket.id) {
            player.position = canvasCenter;
        }
    });
    });

    socket.on('frame', keys => {
        players.forEach((player, index) => {
            if (player.id == playerToReward) {
                player.coins += 20;
                playerToReward = null;
            }
            if (player.id == socket.id) {

                player.update();


                // Update R.C.S setting
                if (keys.r.toggled) {
                    player.rcs = true;
                } else {
                    player.rcs = false;
                }

                // Accelerate
                if (keys.w.pressed) {
                    player.accelerate();
                }
                // decelerate if not accelerating
                else {
                    player.decelerate();
                }

                // Turn
                if (keys.d.pressed) {
                    player.turn(1);
                } else if (keys.a.pressed) {
                    player.turn(0);
                } 
                // Decelerate turn if not turning
                else {
                    player.decelerateTurn();
                }


                for (let i = ammoBoosts.length - 1; i >= 0; i--) {
                    const boost = ammoBoosts[i];
        
        
                    if (Math.abs(player.absolutePosition.x - boost.absolutePosition.x) <= player.radius + boost.radius && 
                        Math.abs(player.absolutePosition.y - boost.absolutePosition.y) <= player.radius + boost.radius) {
                            player.ammo = player.fullAmmo;
                            ammoBoosts.splice(i, 1);
                    }
                }


                for (let i = projectiles.length - 1; i >= 0; i--) {
                    const projectile = projectiles[i];


                    // Manage own projectiles
                    if (projectile.playerId == player.id) {
                        projectile.update();


                        // Projectile garbage-collection
                        if (projectile.absolutePosition.x + projectile.radius < 0 ||
                            projectile.absolutePosition.x - projectile.radius > gameConfiguration.width ||
                            projectile.absolutePosition.y - projectiles.radisu > gameConfiguration.height ||
                            projectile.absolutePosition.y + projectile.radius < 0) {
                                projectiles.splice(i, 1);
                        }
                    } else if (Math.abs(player.absolutePosition.x - projectile.absolutePosition.x) <= player.radius + projectile.radius && 
                        Math.abs(player.absolutePosition.y - projectile.absolutePosition.y) <= player.radius + projectile.radius) {
                        player.coins -= 30;
                        playerToReward = projectile.playerId;
                        projectiles.splice(i, 1);
                    }
                }

                if (keys.space.pressed && !keys.space.used) {
                    if (player.ammo > 0) {
                        projectiles.push(new Projectile({
                            velocity: {
                                x: Math.cos(player.rotation) * gameConfiguration.projectile_speed + player.velocity.x,
                                y: Math.sin(player.rotation) * gameConfiguration.projectile_speed + player.velocity.y
                            },
                            absolutePosition: {
                                x: player.absolutePosition.x + Math.cos(player.rotation) * 30,
                                y: player.absolutePosition.y + Math.sin(player.rotation) * 30
                            },
                            id: player.id
                        }));
                        player.ammo -= 1;
                    }
                    
                }

            }
        });
    socket.emit('sprites', {players: players, ammoBoosts: ammoBoosts, projectiles: projectiles});
    
  });



  socket.on('disconnect', () => {
    console.log('player left...')
    for (let i = players.length - 1; i >= 0; i--) {
      if (players[i].id == socket.id) {
        let data = {playersList: players, message: `${players[i].username} left...`, messageColor: 'red'}
        players.splice(i, 1);
        socket.broadcast.emit('playerLeft', data);
      }
    }
  });
});


server.listen(8080, () => {
  console.log('listening on port 8080');
});
