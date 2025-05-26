import { Scene } from "phaser"


class PlayerAttack extends Phaser.Physics.Arcade.Sprite {
    public power: number
    weapon: {
        sprite: string,
        moveTo: boolean
    }
    targetX: number
    targetY: number


    constructor(
        scene: Scene,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        weapon: {
            sprite: string,
            moveTo: boolean
        },
        id: number,
        power: number
    ) {
        super(scene, x, y, weapon.sprite)
        this.weapon = weapon
        this.targetX = targetX
        this.targetY = targetY
        this.setName(id.toString())
        this.scene.physics.add.existing(this)
        this.scene.add.existing(this)
        this.setCollideWorldBounds(true);
        this.power = power
        this.scene.events.on('update', this.update, this)

    }

    update(): void {
        if (this.weapon.moveTo && this.active) {
            this.scene.physics.moveTo(this, this.targetX, this.targetY, 200)
            this.setRotation(this.rotation + 10)
        }
    }

    create() {

    }
}

export default PlayerAttack