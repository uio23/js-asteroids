class AmmoBar {
    constructor ({offset, size}) {
        this.size = {
            x: size.x,
            y: size.y
        }

        this.position = {
            x: offset.x,
            y: offset.y
        }
        
        this.originalY = this.position.y;
        this.fullHeight = size.y;

        this.bg_color = 'green';
        this.border_color = '#176B87';
        this.border_width = 2;
    }

    draw (ctx, player) {
        if (player.ammo >= 15) {
            this.bg_color = 'green';
        } else if (player.ammo >= 10) {
            this.bg_color = '#FDDA0D';
        } else if (player.ammo >= 5) {
            this.bg_color = 'orange';
        } else {
            this.bg_color = 'red';
        }

        ctx.fillStyle = this.bg_color;

        this.size.y = player.ammo * this.fullHeight / player.fullAmmo;

        if (player.ammo > 0) { 
            this.position.y = this.originalY + (this.fullHeight - this.size.y);
            ctx.fillRect(
                this.position.x + this.border_width / 2, 
                this.position.y + this.border_width / 2, 
                this.size.x - this.border_width, 
                this.size.y - this.border_width 
            );
        } else {
            ctx.fillRect(this.position.x, this.originalY +  this.fullHeight -1, this.size.x, 1);
        }
        ctx.strokeStyle = this.border_color;
        ctx.lineWidth = this.border_width;
        ctx.strokeRect(this.position.x, this.originalY, this.size.x, this.fullHeight);

        // Show how much ammo is left
        ctx.font = "48px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(player.ammo, this.position.x + this.size.x/2, this.originalY + this.fullHeight /2);        
    }
}