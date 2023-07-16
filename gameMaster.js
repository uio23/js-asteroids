const { generateUsername } = require('friendly-username-generator');

const Player = require('./sprites/player');
const AmmoBoost = require('./sprites/ammoBoost');
const Projectile = require('./sprites/projectile');


class GameMaster {
    constructor (gameConfiguration, io) {
        this.gameConfiguration = gameConfiguration;
        this.io = io;

        this.players = [];
        this.ammoBoosts = [];
        this.projectiles = [];


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
        this.io.emit('message', {content: 'joined!mon', username: username, color: playerColor});


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
                    if (player.radar_lo.active) {
                        if (!player.radar_lo.target_id) {
                            let ccw_rotation = -player.rotation;
                            let x = Math.cos(ccw_rotation);
                            let y = Math.sin(ccw_rotation);
                            let gradient = y / x;


                            this.players.forEach((otherPlayer, index) => {
                                if (otherPlayer != player && otherPlayer.radar_lo.target_id != player.id) {
                                    let distancesToPlayerX = otherPlayer.absolutePosition.x - player.absolutePosition.x;
                                    // Concider up positive - (cartesian)
                                    let distancesToPlayerY = player.absolutePosition.y - otherPlayer.absolutePosition.y;

                                    // This is an absolute distance
                                    let distancesToPlayer = Math.sqrt(Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2));


                                    // If the other player is within range
                                    if ((distancesToPlayer + Player.radius) <= player.radar_lo.range) {
                                        // Find discriminant of a simultanious equation with the 
                                        // player's lazer/line & other player's hitbox/circle
                                        let a = 1 + Math.pow(gradient, 2);
                                        let b = (-2 * distancesToPlayerX) + (-2 * gradient * distancesToPlayerY);
                                        let c = (Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2) - Math.pow(Player.radius, 2));
                                        let discriminant = Math.pow(b, 2) - (4 * a * c);


                                        // If there's a real solution to the simultanious equation
                                        if (discriminant > 0) {
                                            // If the player's nose is pointing at other player
                                            // (not back)
                                            if (x * distancesToPlayerX > 0) {
                                                player.radar_lo.target_id = otherPlayer.id;
                                                player.rotation_speed = 0;
                                            }  
                                        }
                                    }
                                }
                            });                            
                        }
                        player.radar_lo.target_present = false;
                        this.players.forEach((otherPlayer, index) => {
                            if (otherPlayer.id == player.radar_lo.target_id) {
                                let angle;
                                let time_to_target;
                                let future_distance_x;
                                let future_distance_y;
                                let future_distance_to_player;
                                let new_angle;
                                let distancesToPlayerX = otherPlayer.absolutePosition.x - player.absolutePosition.x;
                                let distancesToPlayerY = player.absolutePosition.y - otherPlayer.absolutePosition.y;
                                let distancesToPlayer = Math.sqrt(Math.pow(distancesToPlayerX, 2) + Math.pow(distancesToPlayerY, 2));

                                angle = Math.acos(distancesToPlayerX / distancesToPlayer);
                                if (distancesToPlayerY < 0) angle = -angle;     
                                time_to_target = distancesToPlayerX / (Math.cos(angle) * this.gameConfiguration.projectile_speed + player.velocity.x);
                                if (player.accelerating) {
                                future_distance_x = distancesToPlayerX + (otherPlayer.velocity.x * time_to_target + 0.5 * Math.pow(time_to_target, 2) * Math.cos(-otherPlayer.rotation) * otherPlayer.acceleration);
                                future_distance_y = distancesToPlayerY + (-otherPlayer.velocity.y * time_to_target + 0.5 * Math.pow(time_to_target, 2) * Math.sin(-otherPlayer.rotation) * otherPlayer.acceleration);
                                } else {
                                    future_distance_x = distancesToPlayerX + (time_to_target * otherPlayer.velocity.x * Math.pow(this.gameConfiguration.friction, time_to_target));
                                    future_distance_y = distancesToPlayerY + (time_to_target * -otherPlayer.velocity.y * Math.pow(this.gameConfiguration.friction, time_to_target));
                                }
                                future_distance_to_player = Math.sqrt(Math.pow(future_distance_x, 2) + Math.pow(future_distance_y, 2));
                                console.log(`x: ${future_distance_x - distancesToPlayerX}, y: ${future_distance_y - distancesToPlayerY}`);
                                new_angle = Math.acos(future_distance_x / future_distance_to_player);
                                if (future_distance_y < 0) new_angle = -new_angle;    

                                player.rotation = -new_angle;


                                player.radar_lo.target_present = true;
                            }
                        });
                        if (player.radar_lo.target_id && !player.radar_lo.target_present) {
                            player.radar_lo.target_id = null;
                        }
                    }


                    // Broadcast updated sprite lists to all players
                    socket.emit('sprites', {players: this.players, ammoBoosts: this.ammoBoosts, projectiles: this.projectiles});
                }
            });
        });


        socket.on('new message', (message) => {
            this.io.emit('message', message);
        });


        // When client disconnects...
        socket.on('disconnect', () => {
            for (let i = this.players.length - 1; i >= 0; i--) {
                const player = this.players[i];


                if (player.id == socket.id) {
                    // Delete their player
                    this.players.splice(i, 1);

                    
                    // Inform all other game-instances of disconnection
                    socket.broadcast.emit('message', {content: 'left...mon', username: player.username, color: player.color});


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
  
                // Reward projectile owner
                this.players.forEach((otherPlayer, index) => {
                    if (otherPlayer.id == projectile.playerId) {
                        otherPlayer.coins += this.gameConfiguration.bounty;

                        // Announce the event
                        this.io.emit('message', {content: `shot down [${player.username}]mon`, username: otherPlayer.username, color: otherPlayer.color});
                    }
                });
                                
                // Delete projectile.
                this.projectiles.splice(i, 1);

                // Place user player at spawn
                player.absolutePosition.x = this.gameConfiguration.width / 2;
                player.absolutePosition.y = this.gameConfiguration.height / 2;

                
            }
        }
    }
}


module.exports = GameMaster;