class Artist {
    static drawPlayer(ctx, player, thisPlayer) {
        let distancesToPlayerX = player.absolutePosition.x - thisPlayer.absolutePosition.x;
        let distanceToViewX = distancesToPlayerX + (canvas.width / 2);
        let distancesToPlayerY = player.absolutePosition.y - thisPlayer.absolutePosition.y;
        let distanceToViewY =  distancesToPlayerY + (canvas.height / 2);
    
        ctx.save();
        ctx.translate(distanceToViewX, distanceToViewY);
        ctx.rotate(player.rotation);
    
        ctx.translate(-distanceToViewX, -distanceToViewY);
    
        
    
        // Create player's centre-circle path/shape & draw it
        ctx.beginPath();
        ctx.arc(distanceToViewX, distanceToViewY, 4, 0, Math.PI * 2, false);
        ctx.closePath();
    
        // Thick blue stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = player.color;
        ctx.stroke();
    
    
        // Create player's path (triangle) & draw it
        ctx.beginPath();
        ctx.moveTo(distanceToViewX + 30, distanceToViewY);
        ctx.lineTo(distanceToViewX - 10, distanceToViewY - 10);
        ctx.lineTo(distanceToViewX - 10, distanceToViewY + 10);
        ctx.closePath();
    
        // Thin white stroke
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    static drawThisPlayer(ctx, canvas, player) {
        // All draw-state changes will only affect strokes/fills up to 'restore' 
        ctx.save();

        
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


        ctx.restore();   

        // Inform user if their R.C.S is toggled
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        if (player.rcs) {
          ctx.fillText("R.C.S ON", canvas.width/2, canvas.height - 50);
        } else {
          ctx.fillText("R.C.S OFF", canvas.width/2, canvas.height - 50);
        }
    }

    static drawBoost (ctx, boost, position) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, boost.radius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = boost.color;
        ctx.fill();
    }

    static drawProjectile (ctx, projectile, position) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, projectile.radius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
    }
}