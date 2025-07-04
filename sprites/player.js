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
				effect: {
					x: 0,
					y: 0
				},
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
			this.calcRCS()

			this.rotation_velocity += this.rcs.rotationThruster.thrust;
			this.velocity.x += this.rcs.sideThrusters.effect.x;
			this.velocity.y += this.rcs.sideThrusters.effect.y;
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

	calcRCS() {
		// If the player isn't rotating in the desired direction, break current rotation by rcs.rotation_breaks
		if ([-Math.sign(this.rotation_direction), null].includes(this.rotation_direction)) {
			let diff = Math.abs(this.rotation_velocity) - 0;
			this.rcs.rotationThruster.thrust = diff > this.rcs.rotationThruster.maxThrust ? Math.sign(this.rotation_velocity) * -1 * this.rcs.rotationThruster.maxThrust : Math.sign(this.rotation_velocity) * -1 * diff;
		}

		// Enter complicated rcs side thruster stuff:

		// Remove thrust and do not recalc if the player is not accelerating
		if (!this.accelerating) {
			for (const thruster of this.rcs.sideThrusters.thrusters) {
				thruster.thrust = 0;
			}
			this.rcs.sideThrusters.effect.x = 0;
			this.rcs.sideThrusters.effect.y = 0;
			return;
		}

		// The desired x and y velocities are those of the velocity magnitude split to x and y by the direction of rotation
		// if the player is accelerating, otherwise it is whatever the current x and y velocity is
		let velocity_magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
		let desiredX = this.accelerating ? velocity_magnitude * Math.cos(this.rotation) : this.velocity.x;
		let desiredY = this.accelerating ? velocity_magnitude * Math.sin(this.rotation) : this.velocity.y;

		let excessX = this.velocity.x - desiredX;
		let excessY = this.velocity.y - desiredY;

		const excessXSign = Math.sign(excessX);
		const excessYSign = Math.sign(excessY);

		// If the breaking is in the right direction, don't recalc
		if (Math.sign(this.rcs.sideThrusters.effect.x) *-1 == excessXSign && Math.sign(this.rcs.sideThrusters.effect.y) *-1 == excessYSign) {
			return;
		}

		// The breaking thrusters should thrust in the direction opposite to that of the excesses
		let xThrustDirection = excessXSign * -1;
		let yThrustDirection = excessYSign * -1;
		// But do not accelerate either velocity
		// (acceleration is when the desired velocity is a greate absolute value of the same sign as that of the current velocity)
		if (Math.sign(this.velocity.x) != excessXSign) {
			xThrustDirection = 0;
		}
		if (Math.sign(this.velocity.y) != excessYSign) {
			yThrustDirection = 0;
		}

		// These varibles regulate the direction of the x and y velocity contraints in lp
		let boundX, boundY;

		// These become fixed bounds for a velocity value that should not change
		let boundTypeX = glpkS.GLP_DB;
		let boundTypeY = glpkS.GLP_DB;

		if (excessXSign > 0) {
			boundX = 0;
		}
		else if (excessXSign <= 0) {
			boundX = 1;
			if (excessXSign == 0) {
				boundTypeX = glpkS.GLP_FX;
			}
		}

		if (excessYSign > 0) {
			boundY = 0;
		}
		else if (excessYSign <= 0) {
			boundY = 1;
			if (excessYSign == 0) {
				boundTypeY = glpkS.GLP_FX;
			}
		}

		// Calculate the cos/sin ratios of all the rcs thrusters are their angles
		const sin0 = Math.sin(this.rcs.sideThrusters.thrusters[0].angle + this.rotation);
		const sin90 = Math.sin(this.rcs.sideThrusters.thrusters[1].angle + this.rotation);
		const sin180 = Math.sin(this.rcs.sideThrusters.thrusters[2].angle + this.rotation);
		const sin270 = Math.sin(this.rcs.sideThrusters.thrusters[3].angle + this.rotation);
		const cos0 = Math.cos(this.rcs.sideThrusters.thrusters[0].angle + this.rotation);
		const cos90 = Math.cos(this.rcs.sideThrusters.thrusters[1].angle + this.rotation);
		const cos180 = Math.cos(this.rcs.sideThrusters.thrusters[2].angle + this.rotation);
		const cos270 = Math.cos(this.rcs.sideThrusters.thrusters[3].angle + this.rotation);

		const res = glpkS.solve({
			name: 'ThursterLP',
			objective: {
				direction: glpkS.GLP_MAX,
				name: 'obj',
				// Maximize the velocity effect of each rcs side truster into the desired direction
				vars: [
					{ name: 'x0', coef: yThrustDirection * sin0 + xThrustDirection * cos0},
					{ name: 'x90', coef: yThrustDirection * sin90 + xThrustDirection * cos90},
					{ name: 'x180', coef: yThrustDirection * sin180 + xThrustDirection * cos180},
					{ name: 'x270', coef: yThrustDirection * sin270 + xThrustDirection * cos270},
				]
			},
			subjectTo: [
				// 0 / |excess x| <= the combined rcs thrusters' effect on x velocity <= 0 / -|excess x|
				// Insures that rcs's effect on the x velocity is within the desired range
				// This may instead be set to = 0 if excess x is 0
				{
					name: 'X velocity effect',
					vars: [
						{ name: 'x0', coef: cos0},
						{ name: 'x90', coef: cos90},
						{ name: 'x180', coef: cos180},
						{ name: 'x270', coef: cos270},
					],
					bnds: { type: boundTypeX, ub: boundX*Math.abs(excessX), lb: (boundX-1)*Math.abs(excessX)}
				},
				// 0 / |excess y| <= the combined rcs thrusters' effect on y velocity <= 0 / -|excess y|
				// Insures that rcs's effect on the y velocity is within the desired range
				// This may instead be set to = 0 if excess y is 0
				{
					name: 'Y velocity effect',
					vars: [
						{ name: 'x0', coef: sin0},
						{ name: 'x90', coef: sin90},
						{ name: 'x180', coef: sin180},
						{ name: 'x270', coef: sin270},
					],
					bnds: { type: boundTypeY, ub: boundY*Math.abs(excessY), lb: (boundY-1)*Math.abs(excessY)}
				},
			],
			// Each thruster's output is bound above by its maximum thrust
			bounds: [
				{ name: 'x0', type: glpkS.GLP_DB, ub: this.rcs.sideThrusters.maxThrust, lb: 0},
				{ name: 'x90', type: glpkS.GLP_DB, ub: this.rcs.sideThrusters.maxThrust, lb: 0},
				{ name: 'x180', type: glpkS.GLP_DB, ub: this.rcs.sideThrusters.maxThrust, lb: 0},
				{ name: 'x270', type: glpkS.GLP_DB, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
			]
		}, glpkS.GLP_MSG_ERR); // Only log errors

		// Debugging outputs
		/*
		console.log("\nShip is rotated: " + this.rotation);
		console.log("Current x velocity is: " + this.velocity.x);
		console.log("Desired x velocity is: " + desiredX);
		console.log("This means the x excess is " + excessX);
		console.log("Determined range of thrust: " + (excessXSign-1)*Math.abs(excessX) + " < x < " + excessXSign*Math.abs(excessX));
		console.log("Current y velocity is: " + this.velocity.y);
		console.log("Desired y velocity is: " + desiredY);
		console.log("This means the y excess is " + excessY);
		console.log("Determined range of thrust: " + (excessYSign-1)*Math.abs(excessY) + " < y < " + excessYSign*Math.abs(excessY));
		*/
		console.log(res.result.vars.x0);
		console.log(res.result.vars.x90);
		console.log(res.result.vars.x180);
		console.log(res.result.vars.x270);

		// Apply the calculated optimal thrust
		this.rcs.sideThrusters.thrusters[0].thrust = res.result.vars.x0;
		this.rcs.sideThrusters.thrusters[1].thrust = res.result.vars.x90;
		this.rcs.sideThrusters.thrusters[2].thrust = res.result.vars.x180;
		this.rcs.sideThrusters.thrusters[3].thrust = res.result.vars.x270;

		// Recalculate the effect of rcs on the velocity
		this.rcs.sideThrusters.effect.x = 0;
		this.rcs.sideThrusters.effect.y = 0;
		for (const thruster of this.rcs.sideThrusters.thrusters) {
			this.rcs.sideThrusters.effect.x += thruster.thrust * Math.cos(this.rotation + thruster.angle);	
			this.rcs.sideThrusters.effect.y += thruster.thrust * Math.sin(this.rotation + thruster.angle);	
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
