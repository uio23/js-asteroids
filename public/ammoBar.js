class AmmoBar {
    constructor ({position, size}) {
        this.positionX = position.x;
        this.originalY = position.y;
        this.currentY = this.originalY;

        this.width = size.width;
        this.fullHeight = size.height;
        this.currentHeight = this.fullHeight;

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

        this.currentHeight = player.ammo * this.fullHeight / player.fullAmmo;

        if (player.ammo > 0) { 
            this.currentY = this.originalY + (this.fullHeight - this.currentHeight);
            ctx.fillRect(this.positionX, this.currentY, this.width, this.currentHeight);
        } else {
            ctx.fillRect(this.positionX, this.currentY, this.width, 1);
        }

        // Show how much ammo is left
        ctx.font = "48px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(player.ammo, this.positionX + this.width/2, this.originalY + this.fullHeight /2);        
    }
}