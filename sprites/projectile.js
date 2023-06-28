class Projectile {
    static radius = 5;
    constructor({velocity, absolutePosition, id}) {
        this.absolutePosition = absolutePosition;
        this.velocity = velocity;
        this.playerId = id;
        this.radius = 5;
    }
    update () {
        this.absolutePosition.x += this.velocity.x;
        this.absolutePosition.y += this.velocity.y;
    }
}

module.exports = Projectile;