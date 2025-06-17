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
    private raceDistance: number = 10000; // Distância total da corrida em "unidades"
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

        // Isso garante que o array NUNCA estará vazio quando generateNPC for chamado.
        for (let i = 2; i <= 8; i++) {
            const bodyKey = `npcBody${i}`;
            const riderKey = `npcRider${i}`;
            this.npcAssetKeys.push({ bodyKey, riderKey });
        }

    }

    preload() {
        this.obstacleTypes.forEach(obs => {
            this.load.image(obs.key, obs.asset);
        });
        this.npcAssetKeys.forEach(assets => {
            this.load.image(assets.bodyKey, `assets/Motorcycle Body/${assets.bodyKey.slice(-1)}.png`);
            this.load.image(assets.riderKey, `assets/Riders/0${assets.riderKey.slice(-1)}/Riders0${assets.riderKey.slice(-1)}.png`);
        });
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

        // Config da câmera
        const { width, height } = this.cameras.main;
        this.background = this.add.tileSprite(width / 2, height / 2, 1026, 1798, "background");

        //Linha de partida e chegada
        this.finishLine = this.physics.add.sprite(width / 2, -this.raceDistance, "finish_line").setOrigin(0.5, 0);
        this.startLine = this.add.sprite(width / 2, height - 173, "start_line").setOrigin(0.5, 0);

        // Veículo do jogador
        const playerMotorcycle = this.add.sprite(0, 0, 'car');
        const playerRider = this.add.sprite(0, -20, 'rider');
        this.playerVehicle = this.add.container(width / 2, height - 100, [playerMotorcycle, playerRider]) as Vehicle;
        this.physics.world.enable(this.playerVehicle);
        this.playerVehicle.body.setSize(40, 80);
        this.playerVehicle.body.setCollideWorldBounds(true);

        // Barra de vida
        this.hpBarBg = this.add.image(20, 20, 'hp_bar_bg').setOrigin(0, 0).setScrollFactor(0);
        this.hpBarFill = this.add.image(this.hpBarBg.x + 55, this.hpBarBg.y + 3, 'hp_bar_fill').setOrigin(0, 0).setScrollFactor(0);
        
        // Setup de objetos
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
        this.physics.add.collider(this.playerVehicle, this.npcs, (playerVehicle, npc) => {
            this.handleNpcCollision(
                playerVehicle as Vehicle,
                npc as Vehicle
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
                // Escolhe um tipo de obstáculo aleatório
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

        // Reduz a vida do jogador
        this.playerHealth -= 25; // ou qualquer outro valor
        this.updateHpBar();

        // Remove o obstáculo para não causar dano múltiplo
        obstacle.destroy();

        if (this.playerHealth <= 0) {
            this.scene.start('GameOverScene', { username: this.username });
            return;
        }

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

        // Tweens para os obstáculos
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
        
        // Tweens para os NPCs
        this.npcs.getChildren().map(obj => {
            const vehicleBody = (obj as Vehicle).body;
            if (vehicleBody) {
                this.tweens.add({
                    targets: vehicleBody.velocity,
                    y: this.normalNpcSpeed,
                    duration: tweenDuration,
                    delay: tweenDelay,
                    ease: 'Sine.In',
                    onComplete: onSlowdownComplete
                });
            }
        });
    }

    private updateHpBar() {
        const percentage = this.playerHealth / 100;
        this.hpBarFill.setDisplaySize(270 * percentage, 33);
    }

    // Método para colisão com NPC
    handleNpcCollision(_playerVehicle: Vehicle, npc: Vehicle) {
        this.cameras.main.shake(300, 0.02);
        this.scene.start('GameOverScene', { username: this.username });

        if (this.socket.connected) {
            this.socket.emit("collisionReport", { playerId: this.playerId, objectId: npc.name, type: "npc" });
        }
    }

    update(time: number, delta: number) {
        // Inicia o cronômetro quando o jogador inicia o movimento
        if (!this.raceStarted && (this.playerVehicle.body.velocity.x !== 0 || this.playerVehicle.body.velocity.y !== 0)) {
            this.raceStarted = true;
            this.raceStartTime = time;
        }

        // A velocidade do mundo agora depende se a corrida acabou
        if (this.raceDistance > 0) {
            const speed = this.backgroundScrollSpeed * (delta / 16.67); // Ajuste de velocidade por delta time
            this.background.tilePositionY -= speed;
            this.finishLine.y += speed; // Sincroniza a linha de chegada
            this.raceDistance -= speed;
        }

        // this.background.tilePositionY -= this.backgroundScrollSpeed;

        if (this.cursors.left?.isDown) {
            this.playerVehicle.body.setVelocityX(-this.playerSpeedX);
        } else if (this.cursors.right?.isDown) {
            this.playerVehicle.body.setVelocityX(this.playerSpeedX);
        } else {
            this.playerVehicle.body.setVelocityX(0);
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