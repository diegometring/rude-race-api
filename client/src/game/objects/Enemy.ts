import { Scene } from "phaser"
import Player from "./Player"
import { eventBus } from "../EventBus"

class Enemy extends Phaser.Physics.Arcade.Sprite {
    hp = 100
    maxHp = 100
    p: Player
    speed = 60
    animation = 'walk'
    enemy: string
    scene: Scene
    label: Phaser.GameObjects.Text

    constructor(scene: Scene, x: number, y: number, sprite: string, p: Player, id: number) {
        super(scene, x, y, sprite)
        this.setName(id.toString())
        this.anims.play(`${sprite}_walk`)
        this.scene = scene
        this.scene.add.existing(this)
        this.scene.physics.add.existing(this)
        this.scene.events.on('update', this.update, this)
        this.p = p
        this.enemy = sprite
        this.label = scene.add.text(x, y, '100')

        this.speed = Phaser.Math.Between(10, 40)
    }

    create() {
        this.setCollideWorldBounds(true);
    }

    update(time: number) {

        this.label.setPosition(this.x, this.y).setText(this.hp.toString())

        if (!this.active) return

        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.p.x, this.p.y)
        if (distance > 2)
            this.scene.physics.moveTo(this, this.p.x, this.p.y, this.speed)
        else {
            this.setVelocity(0, 0)
        }

        let newAnimation = 'walk'

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
            if (newAnimation == 'walk' && this.body!.velocity.x < 0)
                this.setFlipX(true)
            else if (newAnimation == 'walk')
                this.setFlipX(false)

            this.anims.play(`${this.enemy}_${newAnimation}`)
            this.animation = newAnimation
        }

    }

    kill() {
        this.destroy(true)
        this.label.destroy(true)
        eventBus.emit('increase-score')
    }

    public takeDamage(power: number) {
        const newHP = this.hp - power


        const diff = this.hp - newHP

        if (diff > 0) {
            const l = this.scene.add.text(
                this.x,
                this.y - 20,
                diff.toString(),
                { color: '#00FF00' }
            )
            this.scene.tweens.add({
                targets: l,
                y: this.y - 50,
                duration: 1000,
                onComplete: () => l.destroy(true)
            })
        }


        if (newHP <= 0) {
            this.kill()
            return
        }



        this.hp = newHP
    }



}

export default Enemy