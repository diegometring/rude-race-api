import Phaser from 'phaser';

interface Score {
    username: string;
    time: number;
}

export class RaceFinishedScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RaceFinishedScene' });
    }

    create(data: { username: string, time: number }) {
        const { width, height } = this.cameras.main;

        this.add.text(width / 2, 50, 'CORRIDA CONCLUÍDA!', { 
            fontSize: '48px', color: '#00ff00' 
        }).setOrigin(0.5);

        this.add.text(width / 2, 120, `Seu tempo: ${data.time.toFixed(2)}s`, { 
            fontSize: '32px', color: '#ffffff' 
        }).setOrigin(0.5);

        // --- LÓGICA DO PLACAR DE LÍDERES ---
        const newScore: Score = { username: data.username, time: data.time };
        
        // 1. Pega os scores antigos do localStorage
        const highscoresRaw = localStorage.getItem('highscores');
        let highscores: Score[] = highscoresRaw ? JSON.parse(highscoresRaw) : [];

        // 2. Adiciona o novo score
        highscores.push(newScore);

        // 3. Ordena por tempo (menor para o maior)
        highscores.sort((a, b) => a.time - b.time);

        // 4. Mantém apenas os 10 melhores
        highscores = highscores.slice(0, 10);

        // 5. Salva de volta no localStorage
        localStorage.setItem('highscores', JSON.stringify(highscores));

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