import 'reflect-metadata';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AppDataSource } from './data-source';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lastUpdate: number;
}

interface GameState {
  players: Record<string, GameObject>;
  dynamicObjects: Record<string, GameObject>;
}

interface CollisionData {
  playerId: string;
  objectId: string;
  type: 'npc' | 'obstacle';
  player: GameObject;
  object: GameObject;
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const gameState: GameState = {
  players: {},
  dynamicObjects: {}
};

io.on('connection', (socket: Socket) => {
  console.log(`[connection] Novo jogador conectado: ${socket.id}`);

  // Adiciona jogador com dimensões padrão
  gameState.players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 200), // Initial random position for testing
    y: Math.floor(Math.random() * 200), // Initial random position for testing
    width: 40,  // Largura padrão do jogador
    height: 80, // Altura padrão do jogador
    lastUpdate: Date.now()
  };

  // Envia estado inicial com dimensões
  socket.emit('gameInit', {
    playerId: socket.id,
    gameState
  });
  // Broadcast new player to others
  socket.broadcast.emit('playerJoined', gameState.players[socket.id]);


  // Atualizações de posição com dimensões
  socket.on('playerUpdate', (data: { x: number; y: number; width?: number; height?: number }) => {
    if (gameState.players[socket.id]) {
      const oldPlayerData = gameState.players[socket.id];
      gameState.players[socket.id] = {
        id: socket.id, // Ensure id is always present
        x: data.x !== undefined ? data.x : oldPlayerData.x,
        y: data.y !== undefined ? data.y : oldPlayerData.y,
        width: data.width !== undefined ? data.width : oldPlayerData.width,
        height: data.height !== undefined ? data.height : oldPlayerData.height,
        lastUpdate: Date.now()
      };

      // Log da posição do jogador no servidor
      //console.log(`[playerUpdate] Jogador ${socket.id} atualizou posição: X=${gameState.players[socket.id].x}, Y=${gameState.players[socket.id].y}`);

      // Envia atualização para outros jogadores
      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        // Send the full player object or just the changed data
        playerData: gameState.players[socket.id]
      });
    } else {
      console.warn(`[playerUpdate] Received update for unknown player: ${socket.id}`);
    }
  });

  // Atualizações de NPCs
  socket.on('enemyUpdate', (enemies: GameObject[]) => {
    if (!Array.isArray(enemies)) {
      console.error('[enemyUpdate] Received non-array data for enemies.');
      return;
    }
    enemies.forEach(enemy => {
      if (enemy && typeof enemy.id === 'string' &&
        typeof enemy.x === 'number' && typeof enemy.y === 'number' &&
        typeof enemy.width === 'number' && typeof enemy.height === 'number') {
        gameState.dynamicObjects[enemy.id] = { ...enemy, lastUpdate: Date.now() };
      } else {
        console.warn('[enemyUpdate] Received malformed enemy data:', enemy);
      }
    });

    // Envia para todos os jogadores (consider sending only diffs or if changed)
    io.emit('enemiesMoved', gameState.dynamicObjects); // Send the updated enemies map or the array
  });

  // Relatório de colisão aprimorado
  socket.on('collisionReport', (collisionData: CollisionData) => {
    const { playerId, objectId, type, player, object } = collisionData;

    if (!playerId || !objectId || !type || !player || !object || typeof player.x !== 'number' || typeof object.x !== 'number') {
      console.error(`[collisionReport] Dados de colisão malformados recebidos de ${socket.id}`);
      socket.emit('invalidReport', { message: 'Dados de colisão inválidos.' });
      return;
    }

    console.log(`[collisionReport] Recebido relatório de colisão de ${playerId} com ${objectId} (tipo: ${type})`);

    if (checkAABBCollision(player, object)) {
      console.log(`[collisionReport] Colisão VÁLIDA entre ${playerId} e ${objectId}.`);

      if (type === 'obstacle') {
        socket.emit('collisionResult', {
          outcome: 'slowdown',
          objectId: objectId,
          damage: 25 // Dano definido pelo servidor
        });
        delete gameState.dynamicObjects[objectId];
        io.emit('objectDestroyed', { objectId });
      } else if (type === 'npc') {
        socket.emit('collisionResult', {
          outcome: 'gameOver',
          objectId: objectId
        });
      }
    } else {
      console.warn(`[collisionReport] Discrepância. Cliente ${playerId} reportou colisão com ${objectId} que FALHOU na validação do servidor.`);
      socket.emit('collisionResult', { outcome: 'invalid', objectId: objectId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] Jogador desconectado: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Detecção de colisão AABB (Axis-Aligned Bounding Box)
function checkAABBCollision(obj1: GameObject, obj2: GameObject): boolean {
  // Although checks are added at the call site, an internal guard can make this function more robust
  // if it were to be called from other places without pre-validation.
  // For this specific error, the issue is obj1 (player) being undefined when passed from collisionReport.
  if (!obj1 || !obj2) {
    // This should ideally not be reached if call sites validate inputs.
    console.error("[checkAABBCollision] FATAL: Called with undefined GameObject(s). This indicates a bug in the calling code.");
    return false;
  }
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

// Função de validação antiga (mantida para compatibilidade, mas consider reviewing its usage)
// This function uses server's current gameState, not client-provided state at time of collision.
function validateCollision(playerId: string, objectId: string): boolean {
  const player = gameState.players[playerId];
  const dynamicObject = gameState.dynamicObjects[objectId];

  // This correctly checks if they exist in the current server state
  if (!player || !dynamicObject) {
    console.warn(`[validateCollision] Player (${playerId}) or DynamicObject (${objectId}) not found in current server state.`);
    return false;
  }

  return checkAABBCollision(player, dynamicObject);
}

AppDataSource.initialize()
  .then(() => {
    console.log('Banco de dados conectado com sucesso');
    httpServer.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`WebSocket disponível em ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro na inicialização do AppDataSource:', error);
    process.exit(1);
  });