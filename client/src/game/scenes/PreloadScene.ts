import Phaser from "phaser";
import { PlayerAnimation } from "../objects/animations/PlayerAnimation";
import { EnemyAnimation } from "../objects/animations/EnemyAnimation";
import { eventBus } from "../EventBus";

class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Fundo da barra de progresso
        const progressBarBg = this.add.graphics();
        progressBarBg.fillStyle(0x000000, 0.8);
        progressBarBg.fillRect(240, 270, 320, 50);

        // Barra de progresso
        const progressBar = this.add.graphics();
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        // Texto de "Carregando..."
        this.add.text(400, 240, 'Carregando...', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

        // --- CARREGAMENTO DE TODOS OS ASSETS ---

        // Cenário e UI
        this.load.image("background", "assets/RoadTile/01/1.png");
        this.load.image("start_line", "assets/RoadTile/Start.png");
        this.load.image("finish_line", "assets/RoadTile/Finish.png");
        this.load.image('hp_bar_bg', 'assets/UserInterface/HpBar01.png');
        this.load.image('hp_bar_fill', 'assets/UserInterface/HpBar02.png');
        
        // Veículo do Jogador
        this.load.image("car", "assets/Motorcycle Body/1.png");
        this.load.image("rider", "assets/Riders/01/Riders01.png");

        // Obstáculos
        this.load.image('obstacle1', 'assets/Obstacle/1.png');
        this.load.image('obstacle2', 'assets/Obstacle/2.png');
        this.load.image('obstacle3', 'assets/Obstacle/3.png');
        this.load.image('obstacle4', 'assets/Obstacle/4.png');
        this.load.image('obstacle5', 'assets/Obstacle/5.png');
        this.load.image('obstacle6', 'assets/Obstacle/6.png');
        this.load.image('obstacle7', 'assets/Obstacle/7.png');

        // NPCs
        for (let i = 2; i <= 8; i++) {
            this.load.image(`npcBody${i}`, `assets/Motorcycle Body/${i}.png`);
            this.load.image(`npcRider${i}`, `assets/Riders/0${i}/Riders0${i}.png`);
        }
    }

    create() {
        // Após carregar tudo, inicia a cena de Login
        this.scene.start('MainScene');
    }
}
export default PreloadScene;