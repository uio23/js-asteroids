class Artist {
	static drawPlayer(ctx, player, position, op) {
		ctx.save();
		ctx.translate(position.x, position.y);
		ctx.rotate(player.rotation);

		ctx.translate(-position.x, -position.y);



		// Create player's centre-circle path/shape & draw it
		ctx.beginPath();
		ctx.arc(position.x, position.y, player.radius, 0, Math.PI * 2, false);
		ctx.closePath();

		// Thick blue stroke
		ctx.lineWidth = 2;
		ctx.strokeStyle = player.color;
		ctx.stroke();


		// Create player's path (triangle) & draw it
		ctx.beginPath();
		ctx.moveTo(position.x + 30, position.y);
		ctx.lineTo(position.x - 10, position.y - 10);
		ctx.lineTo(position.x - 10, position.y + 10);
		ctx.closePath();

		// Thin white stroke
		if (op) {
			ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
		} else {
			ctx.strokeStyle = 'white';
		}
		ctx.lineWidth = 1;
		ctx.stroke();


		if (player.radar_lo.active) {
			ctx.beginPath();
			ctx.moveTo(position.x + 30, position.y);
			ctx.lineTo(position.x + player.radar_lo.range, position.y);
			ctx.closePath();


			if (player.radar_lo.target_id) {
				ctx.strokeStyle = '#B31312';
			} else {
				ctx.strokeStyle = '#EA906C';
			}


			ctx.lineWidth = 1;
			ctx.stroke();
		}


		ctx.restore();


		ctx.font = "24px sans-serif";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.fillText(player.username, position.x, position.y - 30);
	}

	static drawThisPlayer(ctx, canvas, player) {
		// All draw-state changes will only affect strokes/fills up to 'restore' 
		ctx.save();

		// Draw the magnitude of each rcs side thruster as a triangle, scaled by 6000
		let thrusterXleft, thrusterXright, thrusterYleft, thrusterYright;
		for (let thruster of player.rcs.sideThrusters.thrusters) {
			thrusterXleft = thruster.thrust * 6000 * Math.cos(thruster.angle + player.rotation + 10);
			thrusterYleft = thruster.thrust * 6000 * Math.sin(thruster.angle + player.rotation + 10);
			thrusterXright = thruster.thrust * 6000 * Math.cos(thruster.angle + player.rotation - 10);
			thrusterYright = thruster.thrust * 6000 * Math.sin(thruster.angle + player.rotation - 10);
			console.log(thruster.thrust);

			ctx.beginPath();
			ctx.moveTo(player.position.x, player.position.y);
			ctx.lineTo(player.position.x + thrusterXleft, player.position.y + thrusterYleft);
			ctx.lineTo(player.position.x + thrusterXright, player.position.y + thrusterYright);
			ctx.closePath();
			// Yellowish red
			ctx.strokeStyle = '#E3DE61';
			ctx.lineWidth = 1;
			ctx.stroke();
		}

		// Draw the direction and magnitude of the players velocity, scaled by 50
		ctx.beginPath();
		ctx.moveTo(player.position.x, player.position.y);
		ctx.lineTo(player.position.x + player.velocity.x*50, player.position.y + player.velocity.y*50);
		// Blue
		ctx.strokeStyle = '#006A71';
		ctx.lineWidth = 1;
		ctx.stroke();


		// Translate canvas origin to center of player
		ctx.translate(player.position.x, player.position.y);

		// Rotate canvas by current rotation angle
		ctx.rotate(player.rotation);

		// Reset origin of canvas to top-right of window
		ctx.translate(-player.position.x, -player.position.y);


		// Create player's centre-circle path/shape & draw it
		ctx.beginPath();
		ctx.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2, false);
		ctx.closePath();

		// Thick blue stroke
		ctx.lineWidth = 2;
		ctx.strokeStyle = player.color;
		ctx.stroke();


		// Create player's path (triangle) & draw it
		ctx.beginPath();
		ctx.moveTo(player.position.x + 30, player.position.y);
		ctx.lineTo(player.position.x - 10, player.position.y - 10);
		ctx.lineTo(player.position.x - 10, player.position.y + 10);
		ctx.closePath();

		// Thin white stroke
		ctx.strokeStyle = 'white';
		ctx.lineWidth = 1;
		ctx.stroke();


		if (player.radar_lo.active) {
			ctx.beginPath();
			ctx.moveTo(player.position.x + 30, player.position.y);
			ctx.lineTo(player.position.x + player.radar_lo.range - 30, player.position.y);
			ctx.closePath();


			if (player.radar_lo.target_id) {
				ctx.strokeStyle = '#B31312';
			} else {
				ctx.strokeStyle = '#EA906C';
			}


			ctx.lineWidth = 1;
			ctx.stroke();
		}


		ctx.restore();   

		// Inform user if their R.C.S is toggled
		ctx.font = "24px sans-serif";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		if (player.rcs.active) {
			ctx.fillText("R.C.S ON", canvas.width/2, canvas.height - 50);
		} else {
			ctx.fillText("R.C.S OFF", canvas.width/2, canvas.height - 50);
		}


		ctx.textAlign = "right";
		ctx.fillText(player.username, canvas.width - 20, canvas.height - 20);
		ctx.textAlign = "left";
		ctx.fillText(`Coins: ${player.coins}`, 25, 250);
	}

	static drawBoost (ctx, boost, position, op=false) {
		ctx.beginPath();
		if (op) {
			ctx.fillStyle = `rgba(0, 255, 0, 0.2)`;
		} else {
			ctx.fillStyle = 'green';
		}
		ctx.arc(position.x, position.y, boost.radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	}

	static drawProjectile (ctx, projectile, position, op=false) {
		ctx.beginPath();
		if (op) {
			ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
		} else {
			ctx.fillStyle = 'white';
		}
		ctx.arc(position.x, position.y, projectile.radius, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
	}
}
