import Projectile from "./projectile.js";
import glpk from "glpk.js";
const glpkS = glpk();

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
			rotationThruster: {
				maxThrust: 0.001,
				thrust: 0
			},
			sideThrusters: {
				maxThrust: 0.005,
				thrusters: [
					{
						angle: 0,
						thrust: 0
					},
					{
						angle: Math.PI / 2,
						thrust: 0
					},
					{
						angle: Math.PI,
						thrust: 0
					},
					{
						angle: Math.PI * 3/2,
						thrust: 0
					},
				]
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
		this.rotation = (this.rotation +(Math.PI*2)) % (Math.PI * 2);
	}

	fireThruster(thruster, velocity, to) {
		let diff = Math.abs(velocity) - Math.abs(to);
		thruster.thrust = diff > thruster.maxThrust ? Math.sign(velocity) * -1 * thruster.maxThrust : Math.sign(velocity) * -1 * diff;
	}

	applyRCS() {
		// If the player isn't rotating in the desired direction, break current rotation by rcs.rotation_breaks
		if ([-Math.sign(this.rotation_direction), null].includes(this.rotation_direction)) {
			this.fireThruster(this.rcs.rotationThruster, this.rotation_velocity, 0);
			this.rotation_velocity += this.rcs.rotationThruster.thrust;
		}

		// If the player isn't moving in the desired direction, break violating components of the current velocity
		// vector by rcs.horizonatl_breaks and rcs.vertical_breaks
		let h = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

		let desiredX = this.accelerating ? h * Math.cos(this.rotation) : this.velocity.x;
		let xDiff = this.velocity.x - desiredX;
		let desiredY = this.accelerating ? h * Math.sin(this.rotation) : this.velocity.y;
		let yDiff = this.velocity.y - desiredY;
		// Only apply breaking
		let xXeffect, xYeffect = 0;
		let yXeffect, yYeffect = 0;
		if (Math.sign(xDiff) == Math.sign(this.velocity.x) && xDiff != 0) {
			// Determine the best thruster to break with
			let xThrust, difff, thrusterToUse;
			let closestDiff = 2;
			for (let thrusterI in this.rcs.sideThrusters.thrusters) {
				let thruster = this.rcs.sideThrusters.thrusters[thrusterI];
				xThrust = Math.cos(thruster.angle + this.rotation);	
				difff = (Math.sign(xDiff) * 1) + (Math.sign(xThrust) * 1);
				if (difff < closestDiff) {
					closestDiff = difff;
					thrusterToUse = thruster;
				}
			}
			xXeffect = Math.cos(thrusterToUse.angle + this.rotation);
			xYeffect = Math.sin(thrusterToUse.angle + this.rotation);
		}
		if (Math.sign(yDiff) == Math.sign(this.velocity.y) && yDiff != 0) {
			let yThrust, yThrusterToUse, difff;
			let closestDiff = 2;
			for (let thrusterI in this.rcs.sideThrusters.thrusters) {
				let thruster = this.rcs.sideThrusters.thrusters[thrusterI];
				yThrust = Math.sin(thruster.angle + this.rotation);	
				difff = (Math.sign(yDiff) * 1) + (Math.sign(yThrust) * 1);
				if (difff < closestDiff) {
					closestDiff = difff;
					yThrusterToUse = thruster;
				}
			}
			yXeffect = Math.cos(yThrusterToUse.angle + this.rotation);
			yYeffect = Math.sin(yThrusterToUse.angle + this.rotation);
		}
		// Solve LP
		const options = {
			msglev: glpkS.GLP_MSG_OFF,
			presol: true,
			cb: {
				call: progress => {

				},
				each: 1
			}
		};
		let xb;
		if (yDiff > 0) {
			xb = glpkS.GLP_UP;
		}
		else if (yDiff < 0) {
			xb = glpkS.GLP_LO;
		}
		else {
			xb = glpkS.GLP_FX;
		}
		let yb;
		if (xDiff > 0) {
			yb = glpkS.GLP_UP;
		}
		else if (xDiff < 0) {
			yb = glpkS.GLP_LO;
		}
		else {
			yb = glpkS.GLP_FX;
		}

		const res = glpkS.solve({
			name: 'ThursterLP',
			objective: {
				direction: glpkS.GLP_MAX,
				name: 'obj',
				vars: [
					{ name: 'x1', coef: Math.abs(xXeffect)},
					{ name: 'x2', coef: Math.abs(yYeffect)}
				]
			},
			subjectTo: [
				{
					name: 'cons1',
					vars: [
						{ name: 'x1', coef: 1},
					],
					bnds: { type: glpkS.GLP_DB, ub: Math.abs(xDiff) % this.rcs.sideThrusters.maxThrust, lb: (-1*Math.abs(xDiff)) % this.rcs.sideThrusters.maxThrust * -1 }
				},
				{
					name: 'cons2',
					vars: [
						{ name: 'x2', coef: 1},
					],
					bnds: { type: glpkS.GLP_DB, ub: Math.abs(yDiff) % this.rcs.sideThrusters.maxThrust, lb: (-1*Math.abs(yDiff)) % this.rcs.sideThrusters.maxThrust * -1  }
				},
				{
					name: 'cons3',
					vars: [
						{ name: 'x1', coef: xYeffect},
					],
					bnds: { type: xb, ub: 0, lb: 0 }
				},
				{
					name: 'cons4',
					vars: [
						{ name: 'x2', coef: yXeffect},
					],
					bnds: { type: yb, ub: 0, lb: 0 }
				}
			]
		}, options);

		//console.log(res.result.vars.x1);
		//console.log(res.result.vars.x2);
		let xEffect = xXeffect * res.result.vars.x1 + yXeffect * res.result.vars.x2;
		let yEffect = xYeffect * res.result.vars.x1 + yYeffect * res.result.vars.x2;
		console.log(xEffect);
		console.log(yEffect);
		//this.velocity.x -= xEffect;
		//this.velocity.y -= yEffect;

		/*
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
		*/
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
