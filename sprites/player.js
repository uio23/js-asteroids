const Projectile = require('./projectile');


class Player {
    static radius = 16;
    constructor({position, absolutePosition, velocity, id, username, color, gameConfiguration}) {
        this.position = position; // {x, y}
        this.absolutePosition = absolutePosition;
        this.velocity = velocity; // {x, y}
        this.accelerating = false;
        this.rotation = 0; // Radians
        this.rotation_speed = 0; // Radians
        this.radius = Player.radius;

        this.gameConfiguration = gameConfiguration;

        this.id = id;
        this.color = color;
        this.rcs = false;
        this.acceleration = 0.1;
        this.rotation_acceleration = 0.002;
        this.rcs_speed = 0.05;
        this.fullAmmo = 20;
        this.ammo = this.fullAmmo;
        this.username = username;
        this.coins = 0;
        this.radar_lo = {
          active: false,
          target_id: null,
          target_present: false,
          range: 300
        }
    }


    update(keys) {
        // Update absolute position by velocity
        this.absolutePosition.x += this.velocity.x; 
        this.absolutePosition.y += this.velocity.y;

        // If the rotation is/more than one revolaton, reset it to 0
        if (Math.abs(this.rotation) >= Math.PI * 2) this.rotation = 0;

        if (!this.target_id) {
          // Update rotation based on rotation speed change
          this.rotation += this.rotation_speed;
          if (keys.d.pressed) {
            this.turn('right');
          } else if (keys.a.pressed) {
            this.turn('left');
          } 
          else {
            this.decelerateTurn();
          }
        } 
        
        // Update player based on key states
        if (keys.r.toggled) {
          this.rcs = true;
        } else {
          this.rcs = false;
        }

        if (keys.w.pressed) {
          this.accelerating = true;
          this.accelerate();
        }
        else {
          this.accelerating = false;
          this.decelerate();
        }

        

        if (keys.l.toggled) {
          this.radar_lo.active = true;
        } else {
          this.radar_lo.target_id = null;
          this.radar_lo.active = false
        }
    }


    accelerate() {
      this.velocity.x += Math.cos(this.rotation) * this.acceleration;
      this.velocity.y +=  Math.sin(this.rotation)  * this.acceleration;
    }

    decelerate() {
      this.velocity.x *= this.gameConfiguration.friction;
      this.velocity.y *= this.gameConfiguration.friction;
    }

    turn(direction) {
      if (direction == 'right') {
        if (this.rcs) {
          this.rotation_speed = this.rcs_speed;
        } else {
          this.rotation_speed += this.rotation_acceleration;
        }
      } else if (direction == 'left') {
        if (this.rcs) {
          this.rotation_speed = -this.rcs_speed;
        } else {
          this.rotation_speed -= this.rotation_acceleration
        }
        
      }
    }

    decelerateTurn() {
      // If R.C.S is toggled stop rotation a lot more efficientley
      if (this.rcs) {
        this.rotation_speed *= this.gameConfiguration.rcs_friction;
      } 
      // Else use typical rotation friction
      else {
        this.rotation_speed *= this.gameConfiguration.rotational_friction;
      }
    }

    reload() {
      this.ammo = this.fullAmmo;
    }

    shoot() {
      // Create projectile at tip of spaceship, moving in its direction
        let projectile = new Projectile({
          velocity: {
            x: Math.cos(this.rotation) * this.gameConfiguration.projectile_speed + this.velocity.x,
            y: Math.sin(this.rotation) * this.gameConfiguration.projectile_speed + this.velocity.y
          },
          absolutePosition: {
            x: this.absolutePosition.x + Math.cos(this.rotation) * 30,
            y: this.absolutePosition.y + Math.sin(this.rotation) * 30
          },
          id: this.id
        })


        this.ammo -= 1;


        return projectile; 
    }
}

module.exports = Player;