const { generateUsername } = require('friendly-username-generator');

const Player = require('./sprites/player');
const AmmoBoost = require('./sprites/ammoBoost');
const Projectile = require('./sprites/projectile');


class GameMaster {
    constructor (gameConfiguration) {
        this.gameConfiguration = gameConfiguration;

        this.players = [];
        this.ammoBoosts = [];
        this.projectiles = [];

        this.playersToReward = [];


        // Spawn in 20 ammo boosts
        for (let i = 1; i < 20; i++) {
            this.ammoBoosts.push(new AmmoBoost({
                x: Math.random() * this.gameConfiguration.width - AmmoBoost.radius,
                y: Math.random() * this.gameConfiguration.height - AmmoBoost.radius
            }));
        }
    }

    handleConnection(socket) {
        // Create a new player for the connected client 
        let username = generateUsername({useRandomNumber: false});

        this.players.push(new Player({
            position: {x: 200 , y: 200}, 
            absolutePosition: {x: this.gameConfiguration.width / 2, y: this.gameConfiguration.height / 2},
            velocity: {x: 0, y: 0},
            id: socket.id,
            username: username,
            gameConfiguration: this.gameConfiguration
        }));

        console.log(`\n\nnew player!`);
        console.log(this.players);
        console.log('\n\n')


        // Send all game-instances game configurations data & updated player list
        socket.emit('config', {gameConfiguration: this.gameConfiguration, players: this.players});
        // Inform other game-instances of a new player
        socket.broadcast.emit('playerJoined', {message: `${username} joined!`, messageColor: 'green'});


        // When client's specs recieved, center their player in their window
        socket.on('clientSpecs', clientSpecs => {
            var windowCenter = {x: clientSpecs.windowSize.x / 2, y: clientSpecs.windowSize.y / 2};

            this.players.forEach((player, index) => {
                if (player.id == socket.id) {
                    player.position = windowCenter;
                }
            });
        });


        // Update sprites' positions and statuses on every frame of client's game-instance
        socket.on('frame', keys => {
            this.players.forEach((player, index) => {
                // If player is pending a reward, award it 
                if (this.playersToReward.includes(player.id)) {
                    player.coins += this.gameConfiguration.bounty;
                    this.playersToReward.splice(this.playersToReward.indexOf(player.id), 1);
                }


                // If player belongs to connected client...
                if (player.id == socket.id) {
                    player.update(keys);


                    // Proccess any interection client player has with any ammo boosts
                    this.updateBoosts(player);


                    // Manage client player's projectiles and interaction with foreign projectiles
                    this.updateProjectiles(player);



                    // Shoot projectile if one hasn't been fired for space-press
                    if (keys.space.pressed && !keys.space.used) {
                        this.projectiles.push(player.shoot());
                    }


                    // Broadcast updated sprite lists to all players
                    socket.emit('sprites', {players: this.players, ammoBoosts: this.ammoBoosts, projectiles: this.projectiles});
                }
            });
        });


        // When client disconnects...
        socket.on('disconnect', () => {
            for (let i = this.players.length - 1; i >= 0; i--) {
                const player = this.players[i];


                if (player.id == socket.id) {
                    // Prepare disconnection data to broadcast
                    let data = {playersList: this.players, message: `${player.username} left...`, messageColor: 'red'}


                    // Delete their player
                    this.players.splice(i, 1);


                    // Inform all other game-instances of disconnection
                    socket.broadcast.emit('playerLeft', data);


                    console.log(`\n\nplayer left...`);
                    console.log(this.players);
                    console.log('\n\n')
                }
            }
        });
    }

    updateBoosts(player) {
        for (let i = this.ammoBoosts.length - 1; i >= 0; i--) {
            const boost = this.ammoBoosts[i];
          
            
            // If the player is touching the boost...
            if (
            Math.abs(player.absolutePosition.x - boost.absolutePosition.x) <= player.radius + AmmoBoost.radius && 
            Math.abs(player.absolutePosition.y - boost.absolutePosition.y) <= player.radius + AmmoBoost.radius
            ) {
                // Fill player's ammo and remove ammo boost
                player.reload();
                this.ammoBoosts.splice(i, 1);
            }
        }
    }

    updateProjectiles(player) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
  
  
            // Only update client player's projectiles
            if (projectile.playerId == player.id) {
                projectile.update();
  
  
                // Projectile garbage-collection
                if (
                projectile.absolutePosition.x + Projectile.radius < 0 ||
                projectile.absolutePosition.x - Projectile.radius > this.gameConfiguration.width ||
                projectile.absolutePosition.y - Projectile.radius > this.gameConfiguration.height ||
                projectile.absolutePosition.y + Projectile.radius < 0
                ) {
                    this.projectiles.splice(i, 1);
                }
            } 
            // Check if foreign projectile hit client player
            else if (
            Math.abs(player.absolutePosition.x - projectile.absolutePosition.x) <= Player.radius + Projectile.radius && 
            Math.abs(player.absolutePosition.y - projectile.absolutePosition.y) <= Player.radius + Projectile.radius
            ) {
                // Penalize user player,
                player.coins -= this.gameConfiguration.bounty;
  
                // save projectile's owner to reward later,
                this.playersToReward.push(projectile.playerId);
  
                // and delete projectile.
                this.projectiles.splice(i, 1);
            }
        }
    }
}


module.exports = GameMaster;