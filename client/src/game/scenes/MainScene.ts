import Phaser from "phaser";
import io from "socket.io-client";

interface ObstacleData {
    key: string;
    asset: string;
    width: number;
    height: number;
}

type Vehicle = Phaser.GameObjects.Container & { body: Phaser.Physics.Arcade.Body };

class MainScene extends Phaser.Scene {
    private socket!: SocketIOClient.Socket;
    private background!: Phaser.GameObjects.TileSprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private playerVehicle!: Vehicle;

    private playerSpeedX: number = 200;
    private slowDuration: number = 2000;

    private obstacles!: Phaser.Physics.Arcade.Group;
    private npcs!: Phaser.Physics.Arcade.Group;
    private finishLine!: Phaser.Physics.Arcade.Sprite;
    private barriers!: Phaser.Physics.Arcade.StaticGroup;
    private playerId: string = '';
    private username: string = 'Jogador Anônimo';

    private isSlowed: boolean = false;

    safeDistance = 200; // Distância mínima (em pixels) de outros NPCs
    maxAttempts = 5;   // Tentativas máximas para encontrar um local seguro

    private normalBackgroundSpeed: number = 4;
    private slowBackgroundSpeed: number = 1;

    private normalObstacleSpeed: number = this.normalBackgroundSpeed * 60;
    private slowObstacleSpeed: number = this.slowBackgroundSpeed * 60;

    private normalNpcSpeed: number = (this.normalBackgroundSpeed - 2) * 60;
    private boostedNpcSpeed: number = -80; 

    private backgroundScrollSpeed: number = this.normalBackgroundSpeed;

    private lastUpdate: number = 0;

    private obstacleTypes: ObstacleData[] = [
        { key: 'obstacle1', asset: 'assets/Obstacle/1.png', width: 107, height: 133 },
        { key: 'obstacle2', asset: 'assets/Obstacle/2.png', width: 104, height: 96 },
        { key: 'obstacle3', asset: 'assets/Obstacle/3.png', width: 68, height: 93 },
        { key: 'obstacle4', asset: 'assets/Obstacle/4.png', width: 76, height: 93 },
        { key: 'obstacle5', asset: 'assets/Obstacle/5.png', width: 93, height: 83 },
        { key: 'obstacle6', asset: 'assets/Obstacle/6.png', width: 134, height: 72 },
        { key: 'obstacle7', asset: 'assets/Obstacle/7.png', width: 185, height: 171 },
    ];
    private npcAssetKeys: { bodyKey: string, riderKey: string }[] = [];

    constructor() {
        super({ key: "MainScene" });
    }

    preload() {
        this.load.image("background", "assets/RoadTile/01/1.png");
        this.load.image("car", "assets/Motorcycle Body/1.png");
        this.load.image("rider", "assets/Riders/01/Riders01.png");
        this.load.image("finish_line", "assets/line.png");

        this.obstacleTypes.forEach(obs => {
            this.load.image(obs.key, obs.asset);
        });

        for (let i = 2; i <= 8; i++) {
            const bodyKey = `npcBody${i}`;
            const riderKey = `npcRider${i}`;
            this.npcAssetKeys.push({ bodyKey, riderKey });
            this.load.image(bodyKey, `assets/Motorcycle Body/${i}.png`);
            this.load.image(riderKey, `assets/Riders/0${i}/Riders0${i}.png`); 
        }

    }

    create() {
        // Lê o nome de usuário do registry do Phaser
        this.username = this.registry.get('username') || 'Jogador Anônimo';

        // Conexão com o socket
        this.socket = io("http://localhost:3001");
        this.socket.on("connect", () => {
            console.log(`Conectado ao servidor como ${this.username} (ID: ${this.socket.id})`);
            this.playerId = this.socket.id;
        });

        const { width, height } = this.cameras.main;
        this.background = this.add.tileSprite(width / 2, height / 2, 1026, 1798, "background");

        const playerMotorcycle = this.add.sprite(0, 0, 'car');
        const playerRider = this.add.sprite(0, -20, 'rider');
        this.playerVehicle = this.add.container(width / 2, height - 100, [playerMotorcycle, playerRider]) as Vehicle;
    
        this.physics.world.enable(this.playerVehicle);
        this.playerVehicle.body.setSize(40, 80);
        this.playerVehicle.body.setCollideWorldBounds(true);

        this.finishLine = this.physics.add.sprite(width / 2, 50, "finish_line")
            .setDisplaySize(width, 10)
            .setImmovable(true);
            
        this.setupBarriers(width, height);
        this.setupObstacles();
        this.setupNPCs();

        this.cursors = this.input.keyboard?.createCursorKeys() || {} as Phaser.Types.Input.Keyboard.CursorKeys;
    }

    private setupBarriers(width: number, height: number) {
        this.barriers = this.physics.add.staticGroup();
        this.barriers.create(50, height / 2, '').setSize(20, height).setVisible(false);
        this.barriers.create(width - 50, height / 2, '').setSize(20, height).setVisible(false);
        this.physics.add.collider(this.playerVehicle, this.barriers);
    }

    // Prepara e cria os obstáculos
    private setupObstacles() {
        this.obstacles = this.physics.add.group();
        this.physics.add.overlap(this.playerVehicle, this.obstacles, (vehicle, obstacle) => {
            this.handleObstacleOverlap(
                vehicle as Vehicle,
                obstacle as Phaser.Physics.Arcade.Sprite
            );
        });
        this.time.addEvent({ delay: 2000, callback: this.generateObstacle, callbackScope: this, loop: true });
    }

    // Prepara e cria os NPCs
    private setupNPCs() {
        this.npcs = this.physics.add.group();
        this.physics.add.collider(this.playerVehicle, this.npcs, (vehicle, npc) => {
            this.handleNpcCollision(
                vehicle as Phaser.Physics.Arcade.Sprite,
                npc as Phaser.Physics.Arcade.Sprite
            );
        });
        this.time.addEvent({ delay: 4000, callback: this.generateNPC, callbackScope: this, loop: true });
    }

    // Método para criar os obstáculos
    private generateObstacle() {
        for (let i = 0; i < this.maxAttempts; i++) {
            const potentialX = Phaser.Math.Between(100, this.cameras.main.width - 100);
            const potentialY = -50;
            let isSafe = true;

            // Verifica distância para todos os obstáculos
            this.obstacles.getChildren().forEach(obj => {
                const existingObj = obj as Phaser.Physics.Arcade.Sprite;
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, existingObj.x, existingObj.y);
                if (distance < this.safeDistance) isSafe = false;
            });

            // Verifica distância para todos os NPCs
            this.npcs.getChildren().forEach(obj => {
                const existingNpc = obj as Phaser.Physics.Arcade.Sprite;
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, existingNpc.x, existingNpc.y);
                if (distance < this.safeDistance) isSafe = false;
            });

                        if (isSafe) {
                // NOVO: Escolhe um tipo de obstáculo aleatório
                const randomObstacleData = Phaser.Math.RND.pick(this.obstacleTypes);
                const ySpeed = this.isSlowed ? this.slowObstacleSpeed : this.normalObstacleSpeed;

                const obstacle = this.obstacles.create(potentialX, potentialY, randomObstacleData.key)
                    .setDisplaySize(randomObstacleData.width, randomObstacleData.height)
                    .setVelocityY(ySpeed)
                    .setImmovable(true)
                    .setName(`${randomObstacleData.key}_${Date.now()}`);

                if (obstacle.body) {
                    // ALTERADO: Define a hitbox 30px menor e alinhada ao topo
                    const hitboxHeight = randomObstacleData.height - 30;
                    // O terceiro parâmetro 'false' alinha a hitbox ao topo/esquerda do sprite
                    obstacle.body.setSize(randomObstacleData.width, hitboxHeight, false);
                }
                return;
            }
        }

        console.log("Não foi possível encontrar um local seguro para gerar um obstáculo nesta rodada.");
    }


    // Método para criar os NPCs
    private generateNPC() {
        for (let i = 0; i < this.maxAttempts; i++) {
            const potentialX = Phaser.Math.Between(100, this.cameras.main.width - 100);
            const potentialY = -50;
            let isSafe = true;
            
            // Verifica distância para todos os NPCs
            this.npcs.getChildren().forEach(obj => {
                const existingNpc = obj as Phaser.Physics.Arcade.Sprite;
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, existingNpc.x, existingNpc.y);
                if (distance < this.safeDistance) isSafe = false;
            });

            // Verifica distância para todos os Obstáculos
            this.obstacles.getChildren().forEach(obj => {
                const existingObs = obj as Phaser.Physics.Arcade.Sprite;
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, existingObs.x, existingObs.y);
                if (distance < this.safeDistance) isSafe = false;
            });

            if (isSafe) {
                const randomNpcAssets = Phaser.Math.RND.pick(this.npcAssetKeys);
                
                // Pega a velocidade base (normal ou boosted)
                let ySpeed = this.isSlowed ? this.boostedNpcSpeed : this.normalNpcSpeed;

                const npcMotorcycle = this.add.sprite(0, 0, randomNpcAssets.bodyKey);
                const npcRider = this.add.sprite(0, -20, randomNpcAssets.riderKey);
                const npcVehicle = this.add.container(potentialX, potentialY, [npcMotorcycle, npcRider]) as Vehicle;
                
                this.npcs.add(npcVehicle);
                this.physics.world.enable(npcVehicle);
                npcVehicle.body.setSize(40, 80);
                npcVehicle.body.setVelocityY(ySpeed);
                npcVehicle.setName(`${randomNpcAssets.bodyKey}_${Date.now()}`);
                return;
            }

        }

        console.log("Não foi possível encontrar um local seguro para gerar um NPC nesta rodada.");
    }

    // Método para colisão com obstáculos
    private handleObstacleOverlap(playerVehicle: Vehicle, obstacle: Phaser.Physics.Arcade.Sprite) {
        if (this.isSlowed) return;

        this.isSlowed = true;
        this.cameras.main.shake(100, 0.01);
        (playerVehicle.list[0] as Phaser.GameObjects.Sprite).setAlpha(0.6); // Deixa a moto transparente
        (playerVehicle.list[1] as Phaser.GameObjects.Sprite).setAlpha(0.6); // Deixa o piloto transparente

        this.backgroundScrollSpeed = this.slowBackgroundSpeed;
        this.obstacles.getChildren().forEach(obj => (obj as Phaser.Physics.Arcade.Sprite).setVelocityY(this.slowObstacleSpeed));
        this.npcs.getChildren().forEach(obj => (obj as Vehicle).body.setVelocityY(this.boostedNpcSpeed));
        
        if (this.socket.connected) {
            this.socket.emit("collisionReport", {
                playerId: this.playerId,
                objectId: obstacle.name,
                type: "obstacle_slowdown"
            });
        }

        const tweenDuration = this.slowDuration * 0.75;
        const tweenDelay = this.slowDuration * 0.25;

        const onSlowdownComplete = () => {
            if (!this.isSlowed) return; // Previne múltiplas execuções

            this.isSlowed = false;
            (playerVehicle.list[0] as Phaser.GameObjects.Sprite).setAlpha(1);
            (playerVehicle.list[1] as Phaser.GameObjects.Sprite).setAlpha(1);
            
            // CORREÇÃO: Força TODOS os objetos a voltarem para a velocidade normal
            this.obstacles.getChildren().forEach(obj => (obj as Phaser.Physics.Arcade.Sprite).setVelocityY(this.normalObstacleSpeed));
            this.npcs.getChildren().forEach(obj => (obj as Vehicle).body.setVelocityY(this.normalNpcSpeed));
        };

        // Tween para a velocidade do fundo
        this.tweens.add({
            targets: this,
            backgroundScrollSpeed: this.normalBackgroundSpeed,
            duration: tweenDuration,
            delay: tweenDelay,
            ease: 'Sine.In'
        });

        // Tweens para os obstáculos e NPCs
        this.obstacles.getChildren().map(obj => {
            const spriteBody = (obj as Phaser.Physics.Arcade.Sprite).body;
            if (spriteBody) {
                this.tweens.add({
                    targets: spriteBody.velocity,
                    y: this.normalObstacleSpeed,
                    duration: tweenDuration,
                    delay: tweenDelay,
                    ease: 'Sine.In',
                    onComplete: onSlowdownComplete
                });
            }
        });
        
    }

    // Método para colisão com NPC
    private handleNpcCollision(car: Phaser.Physics.Arcade.Sprite, npc: Phaser.Physics.Arcade.Sprite) {
        this.cameras.main.shake(300, 0.02);
        this.scene.pause();
        this.showGameOver();

        if (this.socket.connected) {
            this.socket.emit("collisionReport", { playerId: this.playerId, objectId: npc.name, type: "npc" });
        }
    }

    private showGameOver() {
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "Fim de Jogo!", { fontSize: "32px", color: "#fff", backgroundColor: "#000" }).setOrigin(0.5);
    }

    private raceFinished() {
        this.physics.pause();
        this.playerVehicle.list.forEach(go => (go as Phaser.GameObjects.Sprite).setTint(0x00ff00));
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "CORRIDA CONCLUÍDA!", { fontSize: "32px", color: "#fff", backgroundColor: "#000" }).setOrigin(0.5);
    }

    update(time: number) {
        this.background.tilePositionY -= this.backgroundScrollSpeed;

        if (this.cursors.left?.isDown) {
            this.playerVehicle.body.setVelocityX(-this.playerSpeedX);
        } else if (this.cursors.right?.isDown) {
            this.playerVehicle.body.setVelocityX(this.playerSpeedX);
        } else {
            this.playerVehicle.body.setVelocityX(0);
        }

        this.cleanupObjects();

        if (!this.scene.isPaused('MainScene') && this.playerVehicle.y < this.finishLine.y + 20) {
            this.raceFinished();
        }

        if (time - this.lastUpdate > 100 && this.socket.connected) {
            this.lastUpdate = time;
            this.socket.emit("playerUpdate", {
                playerId: this.playerId,
                username: this.username,
                x: this.playerVehicle.x,
                y: this.playerVehicle.y,
                isSlowed: this.isSlowed 
            });
        }
    }

    private cleanupObjects() {
        [this.obstacles].forEach(group => {
            group.getChildren().forEach(obj => {
                const sprite = obj as Phaser.Physics.Arcade.Sprite;
                if (sprite.y > this.cameras.main.height + 100) {
                    sprite.destroy();
                }
            });
        });
    }
}

export default MainScene;