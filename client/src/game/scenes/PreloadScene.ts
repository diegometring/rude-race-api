import Phaser from "phaser";
import { PlayerAnimation } from "../objects/animations/PlayerAnimation";
import { EnemyAnimation } from "../objects/animations/EnemyAnimation";
import { eventBus } from "../EventBus";

class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        this.load.image('Riders01', 'public/assets/Riders/01/Riders01.png'); // motorista
        this.load.image('1', 'public/assets/Motorcycle Body/1.png'); // moto
        this.load.image('2', 'public/assets/RoadTile/01/2.png'); // borda da pista
        this.load.image('background', 'public/assets/RoadTile/01/1.png');
        // Carregue outros recursos aqui
    }

    create() {
        this.scene.start('MainScene');
    }
}

export default PreloadScene;