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

		// Enter complicated rcs side thruster stuff

		let velocity_magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

		// The desired x and y velocities are those of the velocity magnitude split to x and y by the direction of rotation
		// if the player is accelerating, otherwise it is whatever the current x and y velocity is
		let desiredX = this.accelerating ? velocity_magnitude * Math.cos(this.rotation) : this.velocity.x;
		let desiredY = this.accelerating ? velocity_magnitude * Math.sin(this.rotation) : this.velocity.y;

		let excessX = this.velocity.x - desiredX;
		let excessY = this.velocity.y - desiredY;

		let sinX, cosX = 0;
		let sinY, cosY = 0;
		let thruster, thrust, directionalSimilarity;
		let closestDS = 0;

		// Only apply breaking
		// If the x excess has a different sign to the current x velocity, 
		// i.e. the magnitued of the desired x is greater than that of the current x, and is of the same sign,
		// then moving closer to the desired x would be acceleration and should not happen.
		// ...also no change needs to occure if the desired x velocity is the current x velovity
		let thrusterToUseX;
		if (Math.sign(excessX) != Math.sign(this.velocity.x)) {
			excessX = 0;
		}

		if (excessX != 0) {
			// Determine the best thruster to break with
			
			for (let thrusterI in this.rcs.sideThrusters.thrusters) {
				thruster = this.rcs.sideThrusters.thrusters[thrusterI];
				// This is what this thruster would add to the x velocity
				thrust = Math.cos(thruster.angle + this.rotation);	

				directionalSimilarity = (thrust - (Math.sign(excessX) * 1))**2;
				if (directionalSimilarity > closestDS) {
					closestDS = directionalSimilarity;
					thrusterToUseX = thruster;
				}
			}
			
			// calculate the ration of trust the most aligned thruster would provide 
			sinX = Math.sin(thrusterToUseX.angle + this.rotation);
			cosX = Math.cos(thrusterToUseX.angle + this.rotation);
		}

		// Same thing for the excess y velocity
		// Reset closest directional similarity
		closestDS = 0;
		if (Math.sign(excessY) != Math.sign(this.velocity.y)) {
			excessY = 0;
		}
		let thrusterToUseY;
		if (excessY != 0) {
			// Determine the best thruster to break with
			for (let thrusterI in this.rcs.sideThrusters.thrusters) {
				thruster = this.rcs.sideThrusters.thrusters[thrusterI];
				// This is what this thruster would add to the x velocity
				thrust = Math.sin(thruster.angle + this.rotation);	

				directionalSimilarity = (thrust - (Math.sign(excessY) * 1))**2;
				if (directionalSimilarity > closestDS) {
					closestDS = directionalSimilarity;
					thrusterToUseY = thruster;
				}
			}
			
			// calculate the ration of trust the most aligned thruster would provide 
			sinY = Math.sin(thrusterToUseY.angle + this.rotation);
			cosY = Math.cos(thrusterToUseY.angle + this.rotation);
		}

		// Maximize xm*|sin(x) + cos(x)| + ym*|sin(y) + cos(y)| 
		// subject to:
		// 0 <= xm*sin(x) + ym*sin(y) <= |excessX|
		// 0 <= xm*cos(x) + ym*cos(y) <= |excessY|

		// the thruster ratios are those of the best thrusters to cancel their respective velocities,
		// so this formula will maximize the useful breakage at any point without adverse effects

		// Specifies the direction that each velocity should grow to from 0
		// positive excess x? then we should grow our breaking velocity down to the excess from 0
		let excessXSign = Math.sign(excessX)  >= 0 ? 0 : 1;
		let excessYSign = Math.sign(excessY) >= 0 ? 0 : 1;
		let typeY = excessY == 0 ? glpkS.GLP_FX : glpkS.GLP_DB;
		let typeX = excessX == 0 ? glpkS.GLP_FX : glpkS.GLP_DB;
		const res = glpkS.solve({
			name: 'ThursterLP',
			objective: {
				direction: glpkS.GLP_MAX,
				name: 'obj',
				vars: [
					{ name: '1m', coef: Math.abs(sinX) + Math.abs(cosX)},
					{ name: 'ym', coef: Math.abs(sinY) + Math.abs(cosY)}
				]
			},
			subjectTo: [
				{
					name: 'cons1',
					vars: [
						{ name: 'xm', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons2',
					vars: [
						{ name: 'ym', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons3',
					vars: [
						{ name: 'xm', coef: sinX},
						{ name: 'ym', coef: sinY},
					],
					bnds: { type: typeY, ub: excessYSign*Math.abs(excessY), lb: (excessYSign-1)*Math.abs(excessY)}
				},
				{
					name: 'cons4',
					vars: [
						{ name: 'xm', coef: cosX},
						{ name: 'ym', coef: cosY},
					],
					bnds: { type: typeX, ub: excessXSign*Math.abs(excessX), lb: (excessXSign-1)*Math.abs(excessX)}
				},
			]
		}, glpkS.GLP_MSG_ERR);
		if (desiredY != this.velocity.y && res.result.vars.ym == 0) {
		console.log("Current x velocity is: " + this.velocity.x);
		console.log("Desired x velocity is: " + desiredX);
		console.log("This means the x excess is " + excessX);
		console.log("Determined range of thrust: " + (excessXSign-1)*Math.abs(excessX) + " < x < " + excessXSign*Math.abs(excessX));
		if (thrusterToUseX) {
			console.log("Selecting thruster " + thrusterToUseX.angle + " at angle " + (this.rotation + thrusterToUseX.angle));
			console.log("The maximum effect of this thruster is" + 0.1*Math.cos(thrusterToUseX.angle +this.rotation));
			console.log("LP found that the best thrust for this thruster is: " + res.result.vars.xm);
			console.log("This means the x effect of this thruster is " + res.result.vars.xm*Math.cos(thrusterToUseX.angle +this.rotation));
		}
		console.log("Current y velocity is: " + this.velocity.y);
		console.log("Desired y velocity is: " + desiredY);
		console.log("This means the y excess is " + excessY);
		console.log("Determined range of thrust: " + (excessYSign-1)*Math.abs(excessY) + " < y < " + excessYSign*Math.abs(excessY));
		console.log("Ship is rotated: " + this.rotation);
		if (thrusterToUseY) {
			console.log("Selecting thruster " + thrusterToUseY.angle + " at angle " + (this.rotation + thrusterToUseY.angle));
			console.log("The maximum effect of this thruster is" + 0.1*Math.sin(thrusterToUseY.angle +this.rotation));
			console.log("LP found that the best thrust for this thruster is: " + res.result.vars.ym);
			console.log("This means the y effect of this thruster is " + res.result.vars.ym*Math.sin(thrusterToUseY.angle +this.rotation));
		}

		}

		for (let i in this.rcs.sideThrusters.thrusters) {
			let t = this.rcs.sideThrusters.thrusters[i];
			t.thrust = 0;
		}
		if (thrusterToUseX) {
			thrusterToUseX.thrust = res.result.vars.xm;
			this.velocity.x += thrusterToUseX.thrust * Math.cos(thrusterToUseX.angle + this.rotation);
			this.velocity.y += thrusterToUseX.thrust * Math.sin(thrusterToUseX.angle + this.rotation);
		}
		
		if (thrusterToUseY) {
			thrusterToUseY.thrust = res.result.vars.ym;
			this.velocity.x += thrusterToUseY.thrust * Math.cos(thrusterToUseY.angle + this.rotation);
			this.velocity.y += thrusterToUseY.thrust * Math.sin(thrusterToUseY.angle + this.rotation);
		}
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
