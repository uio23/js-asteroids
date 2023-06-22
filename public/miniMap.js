class MiniMap {
    constructor({offset, width, miniMapScales}) {
        this.actualSize = miniMapScales[0];
        this.scale = width / this.actualSize.x
        this.size = {
            x: width,
            y: this.actualSize.y * this.scale
        }
        this.position = {
            x: canvas.width - (this.size.x + offset.x),
            y: offset.y
        }
        this.miniMapScales = miniMapScales;
    }

    updateActualSize(newActualSize) {
        this.actualSize = this.miniMapScales[newActualSize];
        this.scale = this.size.x / this.actualSize.x
        this.size.y = this.actualSize.y * this.scale
    }

    draw (ctx, player) {
        
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
        ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);


        var playerX, playerY;

        if (this.actualSize == this.miniMapScales[1]) {
            playerX = player.absolutePosition.x * this.scale + this.position.x;
            playerY = player.absolutePosition.y * this.scale + this.position.y;
        } else {
            playerX = this.position.x + this.size.x / 2;
            playerY = this.position.y + this.size.y / 2;
        }

        let playerRadius = player.radius * 12.5 * this.scale;

        ctx.beginPath();
        ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    drawItem(item, position) {
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
        ctx.arc(itemX, itemY, itemRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
    }
}