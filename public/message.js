class Message {
    constructor(content) {
        this.content = content;
        this.position = {
            x: 20,
            y: canvas.height - 30
        }
        this.opacity = 0.9
    }

    draw () {
        // Display message text
        ctx.font = "21px sans-serif"; 
        ctx.textAlign = 'left'  
        ctx.fillStyle = `rgba(255, 0, 0, ${this.opacity})`;
        ctx.fillText(this.content, this.position.x, this.position.y);
    }

    update() {
        this.draw();

        
        // Move message up every frame and fade out
        this.position.y -= 0.6;
        this.opacity -= 0.01 * this.opacity;
    }
}