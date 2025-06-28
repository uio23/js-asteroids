export default class Projectile {
    static radius = 5;

    constructor({velocity, absolutePosition, id}) {
        this.velocity = velocity;
        this.absolutePosition = absolutePosition;
        this.playerId = id;
        this.radius = Projectile.radius;
    }

    update () {
        this.absolutePosition.x += this.velocity.x;
        this.absolutePosition.y += this.velocity.y;
    }
}
