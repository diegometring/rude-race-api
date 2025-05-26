

export class EnemyAnimation {

    constructor(scene: Phaser.Scene) {

        //key é o id da animção
        // generateFrame é o key do asset (image)
        scene.anims.create({
            key: 'enemy_1_walk',
            frames: scene.anims.generateFrameNumbers('enemy_1', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        }); 
        scene.anims.create({
            key: 'enemy_2_walk',
            frames: scene.anims.generateFrameNumbers('enemy_2', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        }); 



    }





}