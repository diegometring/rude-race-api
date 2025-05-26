

export class PlayerAnimation {

    constructor(scene: Phaser.Scene) {

        //key é o id da animção
        // generateFrame é o key do asset (image)
        scene.anims.create({
            key: 'player_1_walk',
            frames: scene.anims.generateFrameNumbers('player_1', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        scene.anims.create({
            key: 'player_1_idle',
            frames: scene.anims.generateFrameNumbers('player_1', { start: 1, end: 1 }),
            frameRate: 10,
            repeat: -1
        });



    }





}