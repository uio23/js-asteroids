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
				maxThrust: 0.01,
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

		// Only apply breaking
		if (Math.sign(this.velocity.x) != Math.sign(excessX)) {
			excessX = 0;
		}
		if (Math.sign(this.velocity.y) != Math.sign(excessY)) {
			excessY = 0;
		}

		let excessXSign, excessYSign;
		let typeX = glpkS.GLP_DB;
		let typeY = glpkS.GLP_DB;
		if (Math.sign(excessX) > 0) {
			excessXSign = 0;
		}
		else if (Math.sign(excessX) <= 0) {
			excessXSign = 1;
			if (excessX == 0) {
				typeY = glpkS.GLP_FX;
			}
		}
		if (Math.sign(excessY) > 0) {
			excessYSign = 0;
		}
		else if (Math.sign(excessY) <= 0) {
			excessYSign = 1;
			if (excessY == 0) {
				typeY = glpkS.GLP_FX;
			}
		}

		const sin0 = Math.sin(this.rcs.sideThrusters.thrusters[0].angle + this.rotation);
		const sin90 = Math.sin(this.rcs.sideThrusters.thrusters[1].angle + this.rotation);
		const sin180 = Math.sin(this.rcs.sideThrusters.thrusters[2].angle + this.rotation);
		const sin360 = Math.sin(this.rcs.sideThrusters.thrusters[3].angle + this.rotation);
		const cos0 = Math.cos(this.rcs.sideThrusters.thrusters[0].angle + this.rotation);
		const cos90 = Math.cos(this.rcs.sideThrusters.thrusters[1].angle + this.rotation);
		const cos180 = Math.cos(this.rcs.sideThrusters.thrusters[2].angle + this.rotation);
		const cos360 = Math.cos(this.rcs.sideThrusters.thrusters[3].angle + this.rotation);

		const res = glpkS.solve({
			name: 'ThursterLP',
			objective: {
				direction: glpkS.GLP_MAX,
				name: 'obj',
				vars: [
					{ name: 'x0', coef: Math.abs(sin0 + cos0)},
					{ name: 'x90', coef: Math.abs(sin90 + cos90)},
					{ name: 'x180', coef: Math.abs(sin180 + cos180)},
					{ name: 'x360', coef: Math.abs(sin360 + cos360)},
				]
			},
			subjectTo: [
				{
					name: 'cons1',
					vars: [
						{ name: 'x0', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons2',
					vars: [
						{ name: 'x90', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons3',
					vars: [
						{ name: 'x180', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons4',
					vars: [
						{ name: 'x360', coef: 1},
					],
					bnds: { type: glpkS.GLP_UP, ub: this.rcs.sideThrusters.maxThrust, lb: 0}
				},
				{
					name: 'cons5',
					vars: [
						{ name: 'x0', coef: sin0},
						{ name: 'x90', coef: sin90},
					],
					bnds: { type: typeY, ub: excessYSign*Math.abs(excessY), lb: (excessYSign-1)*Math.abs(excessY)}
				},
				{
					name: 'cons6',
					vars: [
						{ name: 'x180', coef: sin180},
						{ name: 'x360', coef: sin360},
					],
					bnds: { type: typeY, ub: excessYSign*Math.abs(excessY), lb: (excessYSign-1)*Math.abs(excessY)}
				},
				{
					name: 'cons7',
					vars: [
						{ name: 'x0', coef: cos0},
						{ name: 'x90', coef: cos90},
					],
					bnds: { type: typeX, ub: excessXSign*Math.abs(excessX), lb: (excessXSign-1)*Math.abs(excessY)}
				},
				{
					name: 'cons8',
					vars: [
						{ name: 'x180', coef: cos180},
						{ name: 'x360', coef: cos360},
					],
					bnds: { type: typeX, ub: excessXSign*Math.abs(excessX), lb: (excessXSign-1)*Math.abs(excessY)}
				}
			]
		}, glpkS.GLP_MSG_ERR);
		console.log("\nShip is rotated: " + this.rotation);
		console.log("Current x velocity is: " + this.velocity.x);
		console.log("Desired x velocity is: " + desiredX);
		console.log("This means the x excess is " + excessX);
		console.log("Determined range of thrust: " + (excessXSign-1)*Math.abs(excessX) + " < x < " + excessXSign*Math.abs(excessX));
		console.log("Current y velocity is: " + this.velocity.y);
		console.log("Desired y velocity is: " + desiredY);
		console.log("This means the y excess is " + excessY);
		console.log("Determined range of thrust: " + (excessYSign-1)*Math.abs(excessY) + " < y < " + excessYSign*Math.abs(excessY));
		console.log(res.result.vars.x0);
		console.log(res.result.vars.x90);
		console.log(res.result.vars.x180);
		console.log(res.result.vars.x360);

		this.rcs.sideThrusters.thrusters[0].thrust = res.result.vars.x0;
		this.rcs.sideThrusters.thrusters[1].thrust = res.result.vars.x90;
		this.rcs.sideThrusters.thrusters[2].thrust = res.result.vars.x180;
		this.rcs.sideThrusters.thrusters[3].thrust = res.result.vars.x360;

		for (const thruster of this.rcs.sideThrusters.thrusters) {
			this.velocity.x += thruster.thrust * Math.cos(thruster.angle + this.rotation);
			this.velocity.y += thruster.thrust * Math.sin(thruster.angle + this.rotation);
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
