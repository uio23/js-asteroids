const gameConfiguration = require('./gameConfiguration');

class Player {
    constructor({position, velocity, id}) {
        this.position = position; // {x, y}
        this.absolutePosition = {x: gameConfiguration.width / 2, y: gameConfiguration.height / 2};
        this.velocity = velocity; // {x, y}
        this.rotation = 0; // Radians
        this.radius = 4;
        this.rotation_speed = 0; // Radians

        this.id = id;
        this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
        this.rcs = false;
        this.acceleration =  0.1;
        this.rotation_acceleration = 0.002;
        this.projectiles = [];
        this.fullAmmo = 20;
        this.ammo = this.fullAmmo;
    }


    update() {
        // Update absolute position by velocity
        this.absolutePosition.x += this.velocity.x; 
        this.absolutePosition.y += this.velocity.y;

        // If the rotation is/more than one revolaton, reset it to 0
        if (Math.abs(this.rotation) >= Math.PI * 2) this.rotation = 0;
        // Update rotation based on rotation speed change
        this.rotation += this.rotation_speed;


        // Calculate distances from center of spaceship relative to canvas x & y
        //var pointADistance = Math.cos(this.rotation) * 30;
        //var pointBDistance = Math.cos(Math.PI - this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);
        //var pointCDistance = Math.cos(Math.PI + this.rotation + 2.35619) * Math.sqrt(Math.pow(10, 2)*2);
      
        // Messes up absolute position for now...
        //if (!(OFFSET >= this.absolutePosition.x + this.velocity.x || this.absolutePosition.x + this.velocity.x >= WIDTH - OFFSET)) {
        //if ((this.absolutePosition.x + canvas.width / 2 >= WIDTH) || this.absolutePosition.x - canvas.width / 2 <= 0) {
        //this.position.x += this.velocity.x;
        //}
        //this.absolutePosition.x += this.velocity.x; 
        //}else {
        //this.velocity.x = 0;
        //}   
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
      if (direction) {
        this.rotation_speed += this.rotation_acceleration;
      } else {
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