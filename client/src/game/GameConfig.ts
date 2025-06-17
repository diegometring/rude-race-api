import Phaser from "phaser";
import PreloadScene from "./scenes/PreloadScene";
import MainScene from "./scenes/MainScene";
import GameOverScene from "./scenes/GameOverScene";
import RaceFinishedScene from "./scenes/RaceFinishedScene";

const GameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game-container",
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false,

        }
    },
    pixelArt: true,
    scene: [PreloadScene, MainScene, GameOverScene, RaceFinishedScene]
};

export default GameConfig;
