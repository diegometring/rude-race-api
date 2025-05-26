import Phaser from "phaser";
import io from "socket.io-client";

class MainScene extends Phaser.Scene {
    private socket!: SocketIOClient.Socket;
    private background!: Phaser.GameObjects.TileSprite;
    private car!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private normalSpeed: number = 200;
    private slowSpeed: number = 50;
    private currentSpeed: number = 200;
    private slowDuration: number = 2000;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private npcs!: Phaser.Physics.Arcade.Group;
    private finishLine!: Phaser.Physics.Arcade.Sprite;
    private barriers!: Phaser.Physics.Arcade.StaticGroup;
    private playerId: string = '';
    private isSlowed: boolean = false;
    private lastUpdate: number = 0;

    constructor() {
        super({ key: "MainScene" });
    }

    init() {
        // Conecta ao servidor Socket.io (certifique-se que o servidor está rodando)
        this.socket = io("http://localhost:3001");

        this.socket.on("connect", () => {
            console.log("Conectado ao servidor Socket.io");
            this.playerId = this.socket.id;
        });
    }

    preload() {
        // Carrega assets - ATUALIZE OS CAMINHOS CONFORME SUA ESTRUTURA
        this.load.image("background", "assets/RoadTile/01/1.png");
        this.load.image("car", "assets/Motorcycle Body/1.png");
        this.load.image("obstacle", "assets/Obstacle/1.png");
        this.load.image("npc", "assets/NPCs/1.png");
        this.load.image("finish_line", "assets/line.png");
    }

    create() {
        const { width, height } = this.cameras.main;

        // Configuração do cenário
        this.background = this.add.tileSprite(width / 2, height / 2, width, height, "background");

        // Configuração do carro do jogador
        this.car = this.physics.add.sprite(width / 2, height - 100, "car")
            .setDisplaySize(50, 80)
            .setCollideWorldBounds(true);

        // Configuração da linha de chegada
        this.finishLine = this.physics.add.sprite(width / 2, 50, "finish_line")
            .setDisplaySize(width, 10)
            .setImmovable(true);

        // Configuração das barreiras laterais
        this.setupBarriers(width, height);

        // Configuração dos obstáculos (com overlap)
        this.setupObstacles();

        // Configuração dos NPCs (com collider normal)
        this.setupNPCs();

        // Configuração dos controles
        this.cursors = this.input.keyboard?.createCursorKeys() || {} as Phaser.Types.Input.Keyboard.CursorKeys;
    }

    private setupBarriers(width: number, height: number) {
        this.barriers = this.physics.add.staticGroup();

        // Barreira esquerda
        this.barriers.create(50, height / 2, '')
            .setSize(20, height)
            .setVisible(false);

        // Barreira direita
        this.barriers.create(width - 50, height / 2, '')
            .setSize(20, height)
            .setVisible(false);

        this.physics.add.collider(this.car, this.barriers);
    }

    private setupObstacles() {
        this.obstacles = this.physics.add.group();

        // Usamos overlap para permitir passar através dos obstáculos
        this.physics.add.overlap(this.car, this.obstacles, (car, obstacle) => {
            this.handleObstacleOverlap(
                car as Phaser.Physics.Arcade.Sprite,
                obstacle as Phaser.Physics.Arcade.Sprite
            );
        });

        // Gera obstáculos periodicamente
        this.time.addEvent({
            delay: 2000,
            callback: this.generateObstacle,
            callbackScope: this,
            loop: true
        });
    }

    private setupNPCs() {
        this.npcs = this.physics.add.group();

        // Mantemos collider normal para NPCs (colisão sólida)
        this.physics.add.collider(this.car, this.npcs, (car, npc) => {
            this.handleNpcCollision(
                car as Phaser.Physics.Arcade.Sprite,
                npc as Phaser.Physics.Arcade.Sprite
            );
        });

        // Gera NPCs periodicamente
        this.time.addEvent({
            delay: 4000,
            callback: this.generateNPC,
            callbackScope: this,
            loop: true
        });
    }

    private generateObstacle() {
        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const obstacle = this.obstacles.create(x, -50, "obstacle")
            .setVelocityY(100)
            .setImmovable(true)
            .setName(`obstacle_${Date.now()}`);
    }

    private generateNPC() {
        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const npc = this.npcs.create(x, -50, "npc")
            .setVelocityY(80)
            .setImmovable(true)
            .setName(`npc_${Date.now()}`);
    }

    private handleObstacleOverlap(car: Phaser.Physics.Arcade.Sprite, obstacle: Phaser.Physics.Arcade.Sprite) {
        if (this.isSlowed) return;

        // Efeitos visuais
        this.cameras.main.shake(100, 0.01);
        obstacle.setAlpha(0.6); // Obstáculo fica semi-transparente

        // Reduz a velocidade
        this.currentSpeed = this.slowSpeed;
        this.isSlowed = true;

        // Envia a colisão para o servidor
        if (this.socket.connected) {
            this.socket.emit("collisionReport", {
                playerId: this.playerId,
                objectId: obstacle.name,
                type: "obstacle"
            });
        }

        // Recupera a velocidade após o tempo definido
        this.time.delayedCall(this.slowDuration, () => {
            this.currentSpeed = this.normalSpeed;
            this.isSlowed = false;
            obstacle.setAlpha(1); // Volta a opacidade normal
        });
    }

    private handleNpcCollision(car: Phaser.Physics.Arcade.Sprite, npc: Phaser.Physics.Arcade.Sprite) {
        // Game over ao colidir com NPC
        this.cameras.main.shake(300, 0.02);
        this.scene.pause();
        this.showGameOver();

        if (this.socket.connected) {
            this.socket.emit("collisionReport", {
                playerId: this.playerId,
                objectId: npc.name,
                type: "npc"
            });
        }
    }

    private showGameOver() {
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "Fim de Jogo!",
            {
                fontSize: "32px",
                color: "#fff",
                backgroundColor: "#000"
            }
        ).setOrigin(0.5);
    }

    private raceFinished() {
        this.physics.pause();
        this.car.setTint(0x00ff00);

        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            "CORRIDA CONCLUÍDA!",
            { fontSize: "32px", color: "#fff", backgroundColor: "#000" }
        ).setOrigin(0.5);
    }

    update(time: number) {
        // Atualiza o fundo
        this.background.tilePositionY -= 2;

        // Controla o carro com a velocidade atual
        if (this.cursors.left?.isDown) {
            this.car.setVelocityX(-this.currentSpeed);
        } else if (this.cursors.right?.isDown) {
            this.car.setVelocityX(this.currentSpeed);
        } else {
            this.car.setVelocityX(0);
        }

        // Limpa objetos fora da tela
        this.cleanupObjects();

        // Verifica se a corrida terminou
        if (this.car.y < this.finishLine.y + 20) {
            this.raceFinished();
        }

        // Envia atualização de posição periodicamente
        if (time - this.lastUpdate > 100 && this.socket.connected) {
            this.lastUpdate = time;
            this.socket.emit("playerUpdate", {
                x: this.car.x,
                y: this.car.y,
                speed: this.currentSpeed
            });
        }
    }

    private cleanupObjects() {
        [this.obstacles, this.npcs].forEach(group => {
            group.getChildren().forEach(obj => {
                const sprite = obj as Phaser.Physics.Arcade.Sprite;
                if (sprite.y > this.cameras.main.height) {
                    sprite.destroy();
                }
            });
        });
    }
}

export default MainScene;