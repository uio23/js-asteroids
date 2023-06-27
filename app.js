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


const players = [];
const ammoBoosts = [];
const projectiles = [];

const playersToReward = []


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
  let randUsername = generateUsername({useRandomNumber: false});

  players.push(new Player({
    position: {x: 200 , y: 200}, 
    velocity: {x: 0, y: 0},
    id: socket.id,
    username: randUsername
  }));

  console.log(`\n\nnew player!`);
  console.log(players);
  console.log('\n\n')


  // Send all users game configurations data & updated player list
  socket.emit('config', {gameConfiguration: gameConfiguration, players: players});
  // Inform other game-instances of a new player
  socket.broadcast.emit('playerJoined', {message: randUsername + " joined!", messageColor: 'green'});
  

  // Center the user's player on the canvas
  socket.on('canvasCenter', canvasCenter => {
    players.forEach((player, index) => {
      if (player.id == socket.id) {
            player.position = canvasCenter;
        }
    });
  });

  
  // Update sprites' positions and statuses on every frame of user's game-instance
  socket.on('frame', keys => {
    // For every player...
    players.forEach((player, index) => {
      // If player is pending a reward, award it 
      if (playersToReward.includes(player.id)) {
        player.coins += gameConfiguration.bounty;
        playersToReward.splice(playersToReward.indexOf(player.id), 1);
      }


      // If player belongs to connected user...
      if (player.id == socket.id) {
        player.update(keys);


        // For every ammoBoost...
        for (let i = ammoBoosts.length - 1; i >= 0; i--) {
          const boost = ammoBoosts[i];
        
          
          // If the player is touching the boost...
          if (
          Math.abs(player.absolutePosition.x - boost.absolutePosition.x) <= player.radius + boost.radius && 
          Math.abs(player.absolutePosition.y - boost.absolutePosition.y) <= player.radius + boost.radius
          ) {
            // Fill player's ammo and remove ammo boost
            player.ammo = player.fullAmmo;
            ammoBoosts.splice(i, 1);
          }
        }


        // For ever projectile
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const projectile = projectiles[i];


          // Only update user player's projectiles
          if (projectile.playerId == player.id) {
            projectile.update();


            // Projectile garbage-collection
            if (
            projectile.absolutePosition.x + projectile.radius < 0 ||
            projectile.absolutePosition.x - projectile.radius > gameConfiguration.width ||
            projectile.absolutePosition.y - projectiles.radisu > gameConfiguration.height ||
            projectile.absolutePosition.y + projectile.radius < 0
            ) {
              projectiles.splice(i, 1);
            }
          } 

          // Check if foreign projectile hit user player
          else if (
          Math.abs(player.absolutePosition.x - projectile.absolutePosition.x) <= player.radius + projectile.radius && 
          Math.abs(player.absolutePosition.y - projectile.absolutePosition.y) <= player.radius + projectile.radius
          ) {
            // Punish user player,
            player.coins -= gameConfiguration.bounty;

            // save projectile's owner to reward later,
            playersToReward.push(projectile.playerId);

            // and delete projectile.
            projectiles.splice(i, 1);
          }
        }


        // Fire projectile if one hasn't been fired for space-press
        if (keys.space.pressed && !keys.space.used) {
          if (player.ammo > 0) {
            // Place projectile at tip of user player's spaceship, going in same direction
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


    // Broadcast updated sprite lists to all players
    socket.emit('sprites', {players: players, ammoBoosts: ammoBoosts, projectiles: projectiles});
  });


  // When user disconnects...
  socket.on('disconnect', () => {
    console.log(`\n\nplayer left...`);
    console.log(players);
    console.log('\n\n')

    
    for (let i = players.length - 1; i >= 0; i--) {
      const player = players[i];
      if (player.id == socket.id) {
        let data = {playersList: players, message: `${player.username} left...`, messageColor: 'red'}


        // Delete their player
        players.splice(i, 1);


        // Inform all other game instances of disconnection
        socket.broadcast.emit('playerLeft', data);
      }
    }
  });
});


server.listen(8080, () => {
  console.log('listening on port 8080');
});
