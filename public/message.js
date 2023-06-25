class Message {
    constructor(content, contentColor) {
        this.content = content;
        this.position = {
            x: 20,
            y: canvas.height - 30
        }
        this.opacity = 0.9
        this.contentColor = contentColor;
    }

    draw () {
        switch (this.contentColor) {
            case 'green':
                this.color = `rgba(0, 255, 0, ${this.opacity})`;
                console
                break;
            case 'red':
                this.color = `rgba(255, 0, 0, ${this.opacity})`;
                break;
            case 'blue':
                this.color = `rgba(0, 0, 255, ${this.opacity})`;
                break;
            default:
                this.color = `rgba(255, 255, 255, ${this.opacity})`;
                break;
        }

        // Display message text
        ctx.font = "21px sans-serif"; 
        ctx.textAlign = 'left';
        ctx.fillStyle = this.color;
        ctx.fillText(this.content, this.position.x, this.position.y);
    }

    update() {
        this.draw();

        
        // Move message up every frame and fade out
        this.position.y -= 0.6;
        this.opacity -= 0.01 * this.opacity;
    }
}