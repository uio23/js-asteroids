const gameConfiguration = require('./gameConfiguration');

class Player {
    constructor({position, velocity, id, username}) {
        this.position = position; // {x, y}
        this.absolutePosition = {x: gameConfiguration.width / 2, y: gameConfiguration.height / 2};
        this.velocity = velocity; // {x, y}
        this.rotation = 0; // Radians
        this.radius = 4;
        this.rotation_speed = 0; // Radians

        this.id = id;
        this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
        this.rcs = false;
        this.acceleration =  0.2;
        this.rotation_acceleration = 0.002;
        this.projectiles = [];
        this.fullAmmo = 20;
        this.ammo = this.fullAmmo;
        this.username = username;
        this.coins = 0;
    }


    update(keys) {
        // Update absolute position by velocity
        this.absolutePosition.x += this.velocity.x; 
        this.absolutePosition.y += this.velocity.y;

        // If the rotation is/more than one revolaton, reset it to 0
        if (Math.abs(this.rotation) >= Math.PI * 2) this.rotation = 0;
        // Update rotation based on rotation speed change
        this.rotation += this.rotation_speed;

        
        // Update player based on key states
        if (keys.r.toggled) {
          this.rcs = true;
        } else {
          this.rcs = false;
        }

        if (keys.w.pressed) {
          this.accelerate();
        }
        else {
          this.decelerate();
        }

        if (keys.d.pressed) {
          this.turn('right');
        } else if (keys.a.pressed) {
          this.turn('left');
        } 
        else {
          this.decelerateTurn();
        }
    }


    accelerate() {
      this.velocity.x += Math.cos(this.rotation) * this.acceleration;
      this.velocity.y +=  Math.sin(this.rotation)  * this.acceleration;
    }

    decelerate() {
      this.velocity.x *= gameConfiguration.friction;
      this.velocity.y *= gameConfiguration.friction;
    }

    turn(direction) {
      if (direction == 'right') {
        this.rotation_speed += this.rotation_acceleration;
      } else if (direction == 'left') {
        this.rotation_speed -= this.rotation_acceleration
      }
    }

    decelerateTurn() {
      // If R.C.S is toggled stop rotation a lot more efficientley
      if (this.rcs) {
        this.rotation_speed *= gameConfiguration.rcs_friction;
      } 
      // Else use typical rotation friction
      else {
        this.rotation_speed *= gameConfiguration.rotational_friction;
      }
      
      
      
      
    }
}

module.exports = Player;