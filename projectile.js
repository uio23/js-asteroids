class Projectile {
    constructor({position, velocity, absolutePosition, id}) {
        this.position = position;
        this.absolutePosition = absolutePosition;
        this.velocity = velocity;
        this.radius = 5;
        this.playerId = id;
    }
    update () {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.absolutePosition.x += this.velocity.x;
        this.absolutePosition.y += this.velocity.y;
    }
}

module.exports = Projectile;