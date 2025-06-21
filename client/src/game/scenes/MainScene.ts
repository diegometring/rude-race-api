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
    private barriers!: Phaser.Physics.Arcade.StaticGroup;
    private playerId: string = '';
    private username: string = 'Jogador Anônimo';

    private isFinishSequenceActive: boolean = false;
    private finalTime: number = 0;
    private finalTimeRecorded: boolean = false;

    private obstacleTimer!: Phaser.Time.TimerEvent;
    private npcTimer!: Phaser.Time.TimerEvent;

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

    // Propriedades para a lógica da corrida
    private raceDistance: number = 5000; // Distância total da corrida em "unidades"
    private raceStarted: boolean = false;
    private raceStartTime: number = 0;
    private startLine!: Phaser.GameObjects.Sprite;
    private finishLine!: Phaser.GameObjects.Sprite;

    // Propriedades da barra de vida
    private playerHealth: number = 100;
    private hpBarBg!: Phaser.GameObjects.Image;
    private hpBarFill!: Phaser.GameObjects.Image;

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

        for (let i = 2; i <= 8; i++) {
            const bodyKey = `npcBody${i}`;
            const riderKey = `npcRider${i}`;
            this.npcAssetKeys.push({ bodyKey, riderKey });
        }
    }

    // O preload deve ficar em uma cena separada (PreloadScene)
    // Se você o tiver aqui, não tem problema, mas é uma boa prática separá-lo.
    preload() {}

    create() {
        // Reset de estado para múltiplos jogos
        this.isSlowed = false;
        this.raceStarted = false;
        this.isFinishSequenceActive = false;
        this.finalTimeRecorded = false;
        this.backgroundScrollSpeed = this.normalBackgroundSpeed;

        this.username = this.registry.get('username') || 'Jogador Anônimo';
        this.socket = io("http://localhost:3001");
        this.socket.on("connect", () => {
            console.log(`Conectado ao servidor como ${this.username} (ID: ${this.socket.id})`);
            this.playerId = this.socket.id;
        });

        const { width, height } = this.cameras.main;
        this.background = this.add.tileSprite(width / 2, height / 2, 1026, 1798, "background");

        this.finishLine = this.physics.add.sprite(width / 2, -this.raceDistance, "finish_line").setOrigin(0.5, 0);
        this.startLine = this.add.sprite(width / 2, height - 173, "start_line").setOrigin(0.5, 0);

        const playerMotorcycle = this.add.sprite(0, 0, 'car');
        const playerRider = this.add.sprite(0, -20, 'rider');
        this.playerVehicle = this.add.container(width / 2, height - 100, [playerMotorcycle, playerRider]) as Vehicle;
        this.physics.world.enable(this.playerVehicle);
        this.playerVehicle.body.setSize(40, 80);
        this.playerVehicle.body.setCollideWorldBounds(true);

        this.hpBarBg = this.add.image(20, 20, 'hp_bar_bg').setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hpBarFill = this.add.image(this.hpBarBg.x + 55, this.hpBarBg.y + 3, 'hp_bar_fill').setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        
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

    private setupObstacles() {
        this.obstacles = this.physics.add.group();
        this.physics.add.overlap(this.playerVehicle, this.obstacles, (vehicle, obstacle) => {
            this.handleObstacleOverlap(vehicle as Vehicle, obstacle as Phaser.Physics.Arcade.Sprite);
        });
        this.obstacleTimer = this.time.addEvent({ delay: 2000, callback: this.generateObstacle, callbackScope: this, loop: true, paused: true });
    }

    private setupNPCs() {
        this.npcs = this.physics.add.group();
        this.physics.add.collider(this.playerVehicle, this.npcs, (playerVehicle, npcVehicle) => {
            this.handleNpcCollision(playerVehicle as Vehicle, npcVehicle as Vehicle);
        });
        this.npcTimer = this.time.addEvent({ delay: 4000, callback: this.generateNPC, callbackScope: this, loop: true, paused: true });
    }

    private generateObstacle() {
        for (let i = 0; i < this.maxAttempts; i++) {
            const potentialX = Phaser.Math.Between(100, this.cameras.main.width - 100);
            const potentialY = -50;
            let isSafe = true;

            this.obstacles.getChildren().forEach(obj => {
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, (obj as Phaser.GameObjects.Sprite).x, (obj as Phaser.GameObjects.Sprite).y);
                if (distance < this.safeDistance) isSafe = false;
            });

            this.npcs.getChildren().forEach(obj => {
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, (obj as Vehicle).x, (obj as Vehicle).y);
                if (distance < this.safeDistance) isSafe = false;
            });

            if (isSafe) {
                const randomObstacleData = Phaser.Math.RND.pick(this.obstacleTypes);
                const ySpeed = this.isSlowed ? this.slowObstacleSpeed : this.normalObstacleSpeed;
                const obstacle = this.obstacles.create(potentialX, potentialY, randomObstacleData.key)
                    .setDisplaySize(randomObstacleData.width, randomObstacleData.height)
                    .setVelocityY(ySpeed)
                    .setImmovable(true)
                    .setName(`${randomObstacleData.key}_${Date.now()}`);

                if (obstacle.body) {
                    const hitboxHeight = randomObstacleData.height - 30;
                    obstacle.body.setSize(randomObstacleData.width, hitboxHeight, false);
                }
                return;
            }
        }
    }

    private generateNPC() {
        for (let i = 0; i < this.maxAttempts; i++) {
            const potentialX = Phaser.Math.Between(100, this.cameras.main.width - 100);
            const potentialY = -50;
            let isSafe = true;
            
            this.npcs.getChildren().forEach(obj => {
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, (obj as Vehicle).x, (obj as Vehicle).y);
                if (distance < this.safeDistance) isSafe = false;
            });

            this.obstacles.getChildren().forEach(obj => {
                const distance = Phaser.Math.Distance.Between(potentialX, potentialY, (obj as Phaser.GameObjects.Sprite).x, (obj as Phaser.GameObjects.Sprite).y);
                if (distance < this.safeDistance) isSafe = false;
            });

            if (isSafe) {
                const randomNpcAssets = Phaser.Math.RND.pick(this.npcAssetKeys);
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
    }

    private handleObstacleOverlap(playerVehicle: Vehicle, obstacle: Phaser.Physics.Arcade.Sprite) {
        if (this.isSlowed) return;

        this.playerHealth -= 25;
        this.updateHpBar();
        obstacle.destroy();

        if (this.playerHealth <= 0) {
            this.scene.start('GameOverScene', { username: this.username });
            return;
        }

        this.isSlowed = true;
        this.cameras.main.shake(100, 0.01);
        (playerVehicle.list[0] as Phaser.GameObjects.Sprite).setAlpha(0.6);
        (playerVehicle.list[1] as Phaser.GameObjects.Sprite).setAlpha(0.6);

        this.backgroundScrollSpeed = this.slowBackgroundSpeed;
        this.obstacles.getChildren().forEach(obj => (obj as Phaser.Physics.Arcade.Sprite).setVelocityY(this.slowObstacleSpeed));
        this.npcs.getChildren().forEach(obj => (obj as Vehicle).body.setVelocityY(this.boostedNpcSpeed));
        
        if (this.socket.connected) { /* ... */ }

        const tweenDuration = this.slowDuration * 0.75;
        const tweenDelay = this.slowDuration * 0.25;

        const onSlowdownComplete = () => {
            if (!this.isSlowed) return;
            this.isSlowed = false;
            (playerVehicle.list[0] as Phaser.GameObjects.Sprite).setAlpha(1);
            (playerVehicle.list[1] as Phaser.GameObjects.Sprite).setAlpha(1);
            
            this.obstacles.getChildren().forEach(obj => (obj as Phaser.Physics.Arcade.Sprite).setVelocityY(this.normalObstacleSpeed));
            this.npcs.getChildren().forEach(obj => (obj as Vehicle).body.setVelocityY(this.normalNpcSpeed));
        };

        this.tweens.add({ targets: this, backgroundScrollSpeed: this.normalBackgroundSpeed, duration: tweenDuration, delay: tweenDelay, ease: 'Sine.In' });

        this.obstacles.getChildren().forEach(obj => {
            if ((obj as Phaser.Physics.Arcade.Sprite).body) {
                this.tweens.add({ targets: (obj as Phaser.Physics.Arcade.Sprite).body!.velocity, y: this.normalObstacleSpeed, duration: tweenDuration, delay: tweenDelay, ease: 'Sine.In' });
            }
        });
        
        this.npcs.getChildren().forEach(obj => {
            if ((obj as Vehicle).body) {
                this.tweens.add({ targets: (obj as Vehicle).body.velocity, y: this.normalNpcSpeed, duration: tweenDuration, delay: tweenDelay, ease: 'Sine.In', onComplete: onSlowdownComplete });
            }
        });
    }

    private updateHpBar() {
        const percentage = Math.max(0, this.playerHealth / 100);
        this.hpBarFill.setDisplaySize(270 * percentage, 33);
    }

    handleNpcCollision(_playerVehicle: Vehicle, npc: Vehicle) {
        this.cameras.main.shake(300, 0.02);
        this.scene.start('GameOverScene', { username: this.username });
        if (this.socket.connected) {
            this.socket.emit("collisionReport", { playerId: this.playerId, username: this.username, objectId: npc.name, type: "npc" });
        }
    }

    private startFinishSequence() {
        this.obstacleTimer.remove();
        this.npcTimer.remove();
        this.backgroundScrollSpeed = 0;
        this.obstacles.getChildren().forEach(obj => (obj as Phaser.Physics.Arcade.Sprite).setVelocity(0, 0));
        this.npcs.getChildren().forEach(obj => (obj as Vehicle).body.setVelocityY(this.normalNpcSpeed / -2));
        this.playerVehicle.body.setVelocityY(-350);
    }

    update(time: number, delta: number) {

        if (this.cursors.left?.isDown) {
            this.playerVehicle.body.setVelocityX(-this.playerSpeedX);
        } else if (this.cursors.right?.isDown) {
            this.playerVehicle.body.setVelocityX(this.playerSpeedX);
        } else {
            this.playerVehicle.body.setVelocityX(0);
        }

        // Inicia o cronômetro quando o jogador inicia o movimento
        if (!this.raceStarted && this.playerVehicle.body.velocity.x !== 0) {
            this.raceStarted = true;
            this.raceStartTime = time;

            this.obstacleTimer.paused = false;
            this.npcTimer.paused = false;
        }

        if (this.raceStarted) {
        // --- LÓGICA DE MOVIMENTO DO MUNDO (ANTES DA SEQUÊNCIA FINAL) ---
            if (!this.isFinishSequenceActive) {
                if (this.raceDistance > 0) {
                    const speed = this.backgroundScrollSpeed * (delta / 16.67);
                    this.background.tilePositionY -= speed;
                    this.finishLine.y += speed;
                    this.startLine.y += speed; // A linha de largada continua se movendo para trás
                    this.raceDistance -= speed;
                }

                // --- GATILHO DA SEQUÊNCIA FINAL ---
                if (this.finishLine.y > 0) {
                    this.isFinishSequenceActive = true;
                    this.startFinishSequence();
                }
            }

            // --- CONDIÇÕES DE FIM DE CORRIDA ---
            if (this.isFinishSequenceActive) {
                // 5. Verifica se o jogador cruzou a linha para PARAR O TIMER
                if (!this.finalTimeRecorded && Phaser.Geom.Intersects.RectangleToRectangle(this.playerVehicle.getBounds(), this.finishLine.getBounds())) {
                    this.finalTimeRecorded = true;
                    this.finalTime = (time - this.raceStartTime) / 1000;
                }
            
                // 6. Verifica se o jogador saiu da tela para MUDAR DE CENA
                if (this.playerVehicle.y < -this.playerVehicle.height) {
                    this.scene.start('RaceFinishedScene', { 
                        username: this.username, 
                        time: this.finalTime 
                    });
                }
            }
        }

        this.cleanupObjects();

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

        // Verifica se cruzou a linha de chegada
        if (this.playerVehicle.y < this.finishLine.y + this.finishLine.height) {
            const raceTotalTime = (time - this.raceStartTime) / 1000; // Tempo em segundos
            this.scene.start('RaceFinishedScene', { 
                username: this.username, 
                time: raceTotalTime 
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