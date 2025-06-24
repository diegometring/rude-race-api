import Phaser from 'phaser';

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data: { username: string }) {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2 - 50, 'GAME OVER', { 
            fontSize: '64px', 
            color: '#ff0000' 
        }).setOrigin(0.5);

        const restartButton = this.add.text(width / 2, height / 2 + 50, 'Tentar Novamente', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#555555',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        restartButton.on('pointerdown', () => {
            const onPlayAgainCallback = this.registry.get('onPlayAgain');

            if (onPlayAgainCallback) {
                onPlayAgainCallback();
            } else {
                this.scene.start('MainScene', { username: data.username });
            }

        });
    }
}

export default GameOverScene;