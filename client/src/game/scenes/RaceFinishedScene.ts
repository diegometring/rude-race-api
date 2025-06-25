import Phaser from 'phaser';

interface Score {
    username: string;
    time: number;
}

export class RaceFinishedScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RaceFinishedScene' });
    }

    create(data: { username: string, time: number, highscores: any[] }) {
        const { width, height } = this.cameras.main;

        this.add.text(width / 2, 50, 'CORRIDA CONCLUÍDA!', { 
            fontSize: '48px', color: '#00ff00' 
        }).setOrigin(0.5);

        this.add.text(width / 2, 120, `Seu tempo: ${data.time.toFixed(2)}s`, { 
            fontSize: '32px', color: '#ffffff' 
        }).setOrigin(0.5);

        const highscores = data.highscores;

        // --- EXIBIÇÃO DO PLACAR ---
        this.add.text(width / 2, 200, 'Top 10 Melhores Tempos', { 
            fontSize: '28px', color: '#ffff00' 
        }).setOrigin(0.5);

        highscores.forEach((score, index) => {
            const yPos = 250 + (index * 30);
            const text = `${index + 1}. ${score.username} - ${score.time.toFixed(2)}s`;
            this.add.text(width / 2, yPos, text, { 
                fontSize: '20px', color: '#ffffff' 
            }).setOrigin(0.5);
        });


        const playAgainButton = this.add.text(width / 2, height - 50, 'Jogar Novamente', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#555555',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        playAgainButton.on('pointerdown', () => {
            const onPlayAgainCallback = this.registry.get('onPlayAgain');
            if (onPlayAgainCallback) {
                onPlayAgainCallback();
            } else {
                this.scene.start('MainScene', { username: data.username });
            }
        });
    }
}

export default RaceFinishedScene;