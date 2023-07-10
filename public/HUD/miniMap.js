class MiniMap {
    constructor({offset, width, miniMapScales}) {
        this.miniMapScales = miniMapScales;
        
        this.actualSize = this.miniMapScales[0];
        this.scale = width / this.actualSize.x

        this.size = {
            x: width,
            y: this.actualSize.y * this.scale
        }

        this.position = {
            x: canvas.width - (this.size.x + offset.x),
            y: offset.y
        }

        this.bg_color = '#000e18';
        this.border_color = '#176B87';
        this.border_width = 2;
    }

    updateActualSize(newActualSize) {
        this.actualSize = this.miniMapScales[newActualSize];
        this.scale = this.size.x / this.actualSize.x
        this.size.y = this.actualSize.y * this.scale
    }

    draw (ctx, player) {
        ctx.fillStyle = this.bg_color;
        ctx.strokeStyle = this.border_color;
        ctx.lineWidth = this.border_width;

        // Draw border for the display
        ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);

        // Draw the dark-blue mini-map inside border
        ctx.fillRect(
            this.position.x + this.border_width / 2, 
            this.position.y + this.border_width / 2, 
            this.size.x - this.border_width, 
            this.size.y - this.border_width
        );
        


        var playerX, playerY;

        if (this.actualSize == this.miniMapScales[1]) {
            playerX = player.absolutePosition.x * this.scale + this.position.x;
            playerY = player.absolutePosition.y * this.scale + this.position.y;
            
        } else {
            playerX = this.position.x + this.size.x / 2;
            playerY = this.position.y + this.size.y / 2;
        }

        let playerRadius = player.radius * this.scale;
         
        ctx.beginPath();
        ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    drawItem(item, position, player=false) {
        var itemX, itemY;
        var itemRadius = item.radius * this.scale;


        if (this.actualSize == this.miniMapScales[1]) {
            itemX = item.absolutePosition.x * this.scale + this.position.x;
            itemY = item.absolutePosition.y * this.scale + this.position.y;
        } else {
            if (Math.abs(position.x * this.scale) <= this.size.x / 2 && Math.abs(position.y * this.scale) <= this.size.y / 2) {
                itemX = (position.x * this.scale) + (this.position.x + this.size.x / 2) ;
                itemY = (position.y * this.scale) + (this.position.y + this.size.y / 2);
            } else {
                return
            }
        }


        ctx.beginPath();
        if (!player) {
            ctx.fillStyle = item.color;
            ctx.arc(itemX, itemY, itemRadius, 0, Math.PI * 2, false);
        } else {
            if (this.actualSize == this.miniMapScales[1]) {
                itemRadius = item.radius * 2 * this.scale;
            } 
            ctx.fillStyle = 'red';
            ctx.fillRect(itemX + itemRadius, itemY + itemRadius, itemRadius * 2, itemRadius * 2);
        }
        
        ctx.closePath();
        
        ctx.fill();
    }
}