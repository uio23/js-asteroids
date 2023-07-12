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

    handleConnection(io, socket) {
        // Create a new player for the connected client 
        let username = generateUsername({useRandomNumber: false});
        let playerColor = '#' + Math.floor(Math.random()*16777215).toString(16);

        this.players.push(new Player({
            position: {x: 200 , y: 200}, 
            absolutePosition: {x: this.gameConfiguration.width / 2, y: this.gameConfiguration.height / 2},
            velocity: {x: 0, y: 0},
            id: socket.id,
            username: username,
            color: playerColor,
            gameConfiguration: this.gameConfiguration
        }));

        console.log(`\n\nnew player!`);
        console.log(this.players);
        console.log('\n\n')


        // Send all game-instances game configurations data & updated player list
        socket.emit('config', {gameConfiguration: this.gameConfiguration, players: this.players});
        // Inform all game-instances of a new player
        io.emit('message', {content: 'joined!', username: username, color: playerColor});


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
                        if (player.ammo > 0) {
                            this.projectiles.push(player.shoot());
                        }
                    }

                    //If radar lock-on, try lock onto closes player
                    if (player.radar_lo) {
                        if (!player.target_id) {
                            let x = Math.cos(player.rotation) * 200;
                            let y = Math.sin(player.rotation) * 200;
                            let ratio = y/x;

                            this.players.forEach((otherPlayer, index) => {
                                if (otherPlayer != player) {
                                    let distancesToPlayerX = otherPlayer.absolutePosition.x - player.absolutePosition.x;
                                    let distancesToPlayerY = otherPlayer.absolutePosition.y - player.absolutePosition.y;
                                    let distancesToPlayer = Math.sqrt(Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2));
                                    let a = 1 + Math.pow(ratio, 2);
                                    let b = (-2 * distancesToPlayerX) + (-2 * ratio * distancesToPlayerY);
                                    let c = (Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2) - Math.pow(Player.radius, 2));
                                    let discriminant = Math.pow(b, 2) - (4 * a * c);


                                    if (discriminant > 0 && distancesToPlayer <= player.range) {
                                        if ((x < 0 && distancesToPlayerX < 0) || (x > 0 && distancesToPlayerX > 0)) {
                                            player.target_id = otherPlayer.id;
                                            player.rotation_speed = 0;
                                        }
                                    }
                                    
                                }
                            });                            
                        }
                        let target_present = false;
                        this.players.forEach((otherPlayer, index) => {
                            if (otherPlayer.id == player.target_id) {
                                let distancesToPlayerX = otherPlayer.absolutePosition.x - player.absolutePosition.x;
                                let distancesToPlayerY = otherPlayer.absolutePosition.y - player.absolutePosition.y;
                                let distancesToPlayer = Math.sqrt(Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2));
                                let angle = Math.acos(distancesToPlayerX / distancesToPlayer);
                                // mirroring
                                if (distancesToPlayerY < 0) angle = -angle;
                                player.rotation = angle;

                                target_present = true;
                            }
                        });
                        if (player.target_id && !target_present) {
                            player.radar_lo = false;
                            player.target_id = null;
                        }
                    }


                    // Broadcast updated sprite lists to all players
                    socket.emit('sprites', {players: this.players, ammoBoosts: this.ammoBoosts, projectiles: this.projectiles});
                }
            });
        });


        socket.on('new message', (message) => {
            io.emit('message', message);
        });


        // When client disconnects...
        socket.on('disconnect', () => {
            for (let i = this.players.length - 1; i >= 0; i--) {
                const player = this.players[i];


                if (player.id == socket.id) {
                    // Delete their player
                    this.players.splice(i, 1);

                    
                    // Inform all other game-instances of disconnection
                    socket.broadcast.emit('message', {content: 'left...', username: player.username, color: player.color});


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