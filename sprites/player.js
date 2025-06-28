import Projectile from "./projectile.js";

export default class Player {
	static radius = 16;
	static acceleration = 0.01;
	static rotation_acceleration = 0.0004;
	static rcs_acceleration = 0.5;
	static fullAmmo = 20;
	static coins = 0;
	static radarRange = 300;

	constructor({position, absolutePosition, id, username, color, gameConfiguration}) {
		// fields specified by game master
		this.position = position; // {x, y}
		this.absolutePosition = absolutePosition;
		this.id = id;
		this.username = username;
		this.color = color;
		this.gameConfiguration = gameConfiguration;


		// Fields specified by defaults
		this.radius = Player.radius;

		this.velocity = {h: 0, x: 0, y: 0}
		this.acceleration = Player.acceleration;
		this.accelerating = false;

		this.rotation = 0; // Radians
		this.rotation_velocity = 0;
		this.rotation_acceleration = Player.rotation_acceleration;
		this.breaking = false;

		this.rcs = {
			active: false,
			vertical:
			{
				thrust: 0,
				maxThrust: 0.005
			},
			horizontal:
			{
				thrust: 0,
				maxThrust: 0.005
			},
			rotational:
			{
				thrust: 0,
				maxThrust: 0.001
			}
		};

		this.fullAmmo = Player.fullAmmo;
		this.ammo = this.fullAmmo;

		this.coins = Player.coins;

		this.radar_lo = {
			active: false,
			target_id: null,
			target_present: false,
			range: Player.radarRange
		}
	}

	update(keys) {
		// Update player state based on key states

		// Acceleration
		this.accelerating = keys.w.pressed;
		// Deceleration
		this.breaking = keys.s.pressed && !this.accelerating;

		// Rotation
		if (keys.d.pressed) {
			this.rotation_direction = '1';
		} else if (keys.a.pressed) {
			this.rotation_direction = '-1';
		} else {
			this.rotation_direction = null;
		}

		// RCS
		this.rcs.active = keys.r.toggled;

		// Radar
		this.radar_lo.active = keys.l.toggled;


		// Update player velocities based on state
		// Acceleration
		if (this.accelerating) {
			this.accelerate();
		}

		// Rotation
		this.turn(this.rotation_direction);

		// RCS
		if (this.rcs.active) {
			this.applyRCS()
		}

		// Radar
		if (!this.radar_lo.active) {
			this.radar_lo.target_id = null;
		}

		// Update absolute position by velocity
		this.absolutePosition.x += this.velocity.x; 
		this.absolutePosition.y += this.velocity.y;

		// Update rotation by rotation velocity
		this.rotation += this.rotation_velocity;
		// If the rotation is/is more than one revolaton, set it to 0
		this.rotation = this.rotation % (Math.PI * 2);
	}

	fireThruster(thruster, velocity, to) {
		let diff = Math.abs(velocity) - Math.abs(to);
		thruster.thrust = diff > thruster.maxThrust ? Math.sign(velocity) * -1 * thruster.maxThrust : Math.sign(velocity) * -1 * diff;
	}

	applyRCS() {
		// If the player isn't rotating in the desired direction, break current rotation by rcs.rotation_breaks
		if ([-Math.sign(this.rotation_direction), null].includes(this.rotation_direction)) {
			this.fireThruster(this.rcs.rotational, this.rotation_velocity, 0);
			this.rotation_velocity += this.rcs.rotational.thrust;
		}

		// If the player isn't moving in the desired direction, break violating components of the current velocity
		// vector by rcs.horizonatl_breaks and rcs.vertical_breaks
		let h = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
		let desiredX = this.accelerating ? h * Math.cos(this.rotation) : this.velocity.x;

		let to;
		if (desiredX * this.velocity.x < 0 || this.breaking) {
			to = 0;
		}
		else if (Math.abs(desiredX) < Math.abs(this.velocity.x)) {
			to = desiredX;
		}
		else {
			to = this.velocity.x;
		}
		this.fireThruster(this.rcs.horizontal, this.velocity.x, to);
		this.velocity.x += this.rcs.horizontal.thrust;

		let desiredY = this.accelerating ? h * Math.sin(this.rotation) : this.velocity.y;

		if (desiredY * this.velocity.y < 0 || this.breaking) {
			to = 0;
		}
		else if (Math.abs(desiredY) < Math.abs(this.velocity.y)) {
			to = desiredY;
		}
		else {
			to = this.velocity.y;
		}
		this.fireThruster(this.rcs.vertical, this.velocity.y, to);
		this.velocity.y += this.rcs.vertical.thrust;
	}

	accelerate() {
		this.velocity.x += Math.cos(this.rotation) * this.acceleration;
		this.velocity.y += Math.sin(this.rotation)  * this.acceleration;
	}

	/*
	decelerate() {
		this.velocity.x *= this.gameConfiguration.friction;
		this.velocity.y *= this.gameConfiguration.friction;
	}
	*/

	turn(direction) {
		if (direction == '1') {
			this.rotation_velocity += this.rotation_acceleration;
		} else if (direction == '-1') {
			this.rotation_velocity -= this.rotation_acceleration
		}
	}

	/*
	decelerateTurn() {
		// If R.C.S is toggled stop rotation a lot more efficientley
		if (this.rcs) {
			this.rotation_velocity *= this.rcs_acceleration;
		} 
		// Else use typical rotation friction
		else {
			this.rotation_velocity *= this.gameConfiguration.rotational_friction;
		}
	}
	*/

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
			id:  this.id
		})


		this.ammo -= 1;


		return projectile; 
	}
}
