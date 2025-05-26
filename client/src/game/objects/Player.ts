import { Scene } from "phaser"
import Enemy from "./Enemy";

class Player extends Phaser.Physics.Arcade.Sprite {

    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    speed = 80
    animation: string = 'idle'

    constructor(scene: Scene, x: number, y: number, sprite: string) {
        super(scene, x, y, sprite)
        this.anims.play('player_1_idle')
        this.scene.physics.add.existing(this)
        this.scene.add.existing(this)
        this.scene.events.on('update', this.update, this)
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.setCollideWorldBounds(true);
        this.setDepth(2)
        this.setScale(2)
    }

    create() {
        this.setInteractive(true)
    }

    update(time: number): void {
        const { up, down, left, right, shift, space } = this.cursors


        if (shift.isDown) {
            this.speed = 120
        } else {
            this.speed = 80
        }

        let speed = this.speed

        if (
            (up.isDown && left.isDown)
            || (up.isDown && right.isDown)
            || (down.isDown && left.isDown)
            || (down.isDown && right.isDown)
        ) {
            speed = speed / 3.1416
        }

        let newAnimation = 'idle'

        if (up.isDown) {
            this.setVelocityY(-this.speed)
        } else if (down.isDown) {
            this.setVelocityY(this.speed)
        } else {
            this.setVelocityY(0)
        }

        if (left.isDown) {
            this.setVelocityX(-this.speed)
        } else if (right.isDown) {
            this.setVelocityX(this.speed)
        } else {
            this.setVelocityX(0)
        }

        if (this.body!.velocity.x > 0) {
            newAnimation = 'walk'
        } else if (this.body!.velocity.x < 0) {
            newAnimation = 'walk'
        } else if (this.body!.velocity.y > 0) {
            newAnimation = 'walk'
        } else if (this.body!.velocity.y < 0) {
            newAnimation = 'walk'
        } else {
            newAnimation = 'idle'
        }

        if (this.animation != newAnimation) {
            if (newAnimation == 'walk' && this.body!.velocity.x < 0) {
                this.setFlipX(true)
            } else if (newAnimation == 'walk') {
                this.setFlipX(false)
            }
            this.anims.play(`player_1_${newAnimation}`)

            this.animation = newAnimation
        }
    }

    public takeDamage(e: Enemy) {
        console.log('bateu ', e.name)
        this.scene.scene.pause('MainScene');
        if (!this.scene.scene.get('GameOverScene').scene.isActive())
            this.scene.scene.launch('GameOverScene');
    }


}

export default Player