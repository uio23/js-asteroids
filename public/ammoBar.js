class AmmoBar {
    constructor ({position, size}) {
        this.positionX = position.x;
        this.originalY = position.y;

        this.width = size.width;
        this.fullHeight = size.height;

        this.color = 'green';
    }

    draw (ctx, player) {
        if (player.ammo >= 0.6) {
            this.color = 'green';
        } else if (player.ammo >= 0.4) {
            this.color = '#FDDA0D';
        } else if (player.ammo >= 0.2) {
            this.color = 'orange';
        } else {
            this.color = 'red';
        }

        ctx.fillStyle = this.color;

        let spent = player.ammo * this.fullHeight / player.fullAmmo;
        let y = this.originalY + spent;

        if (player.ammo > 0) { 
            ctx.fillRect(this.positionX, y, this.width, this.fullHeight - spent);
        } else {
            ctx.fillRect(this.positionX, this.fullHeight, this.width, 1);
        }

        // Show how much ammo is left
        ctx.font = "48px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(player.ammo, this.positionX + this.width/2, this.originalY + this.fullHeight /2);        
    }
}