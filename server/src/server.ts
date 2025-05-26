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
  enemies: Record<string, GameObject>;
}

interface CollisionData {
  playerId: string;
  enemyId: string;
  player: GameObject; // This is obj1 in checkAABBCollision
  enemy: GameObject;  // This is obj2 in checkAABBCollision
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
  enemies: {}
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
      console.log(`[playerUpdate] Jogador ${socket.id} atualizou posição: X=${gameState.players[socket.id].x}, Y=${gameState.players[socket.id].y}`);

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
        gameState.enemies[enemy.id] = { ...enemy, lastUpdate: Date.now() };
      } else {
        console.warn('[enemyUpdate] Received malformed enemy data:', enemy);
      }
    });
    
    // Envia para todos os jogadores (consider sending only diffs or if changed)
    io.emit('enemiesMoved', gameState.enemies); // Send the updated enemies map or the array
  });

  // Relatório de colisão aprimorado
  socket.on('collisionReport', (collisionData: CollisionData) => {
    // Destructure with care, as properties might be missing if client sends malformed CollisionData
    const { playerId, enemyId, player, enemy } = collisionData || {};

    // **CRITICAL FIX STARTS HERE**
    // Validate the data received from the client to prevent crashes
    if (!collisionData || !playerId || !enemyId || !player || !enemy) {
      console.error(
        `[collisionReport] Received incomplete or malformed collisionData. ` +
        `PlayerID: ${playerId}, EnemyID: ${enemyId}. ` +
        `Player: ${JSON.stringify(player)}, Enemy: ${JSON.stringify(enemy)}`
      );
      socket.emit('invalidCollision', {
        message: 'Collision report failed: Critical player, enemy, or ID data missing from the report sent by client.'
      });
      return; // Stop processing if essential objects or IDs are missing
    }

    // Further validation: Check if player and enemy objects have the required properties.
    // This ensures they are truly GameObject-like before use.
    if (
      typeof player.x !== 'number' || typeof player.y !== 'number' || 
      typeof player.width !== 'number' || typeof player.height !== 'number' ||
      typeof enemy.x !== 'number' || typeof enemy.y !== 'number' || 
      typeof enemy.width !== 'number' || typeof enemy.height !== 'number'
    ) {
      console.error(
        `[collisionReport] Received malformed GameObject data: player or enemy object is missing required properties. ` +
        `PlayerID: ${playerId}, EnemyID: ${enemyId}. ` +
        `Player: ${JSON.stringify(player)}, Enemy: ${JSON.stringify(enemy)}`
      );
      socket.emit('invalidCollision', {
        message: 'Collision report failed: Player or enemy data is incomplete or properties are malformed.'
      });
      return; // Stop processing if properties are missing or types are wrong
    }
    // **CRITICAL FIX ENDS HERE**
    
    // Update positions in the game state using the client-provided data.
    // This assumes the client's view of the objects at the time of collision is authoritative for this check.
    // Consider if these objects should always exist in server's gameState or if client can report new ones.
    if (gameState.players[playerId]) {
        gameState.players[playerId] = { ...player, lastUpdate: Date.now() }; // Ensure lastUpdate is set
    } else {
        console.warn(`[collisionReport] Player with ID ${playerId} not found in server state. Client sent: ${JSON.stringify(player)}. Trusting client data for now.`);
        gameState.players[playerId] = { ...player, lastUpdate: Date.now() }; // Or handle as error
    }

    if (gameState.enemies[enemyId]) {
        gameState.enemies[enemyId] = { ...enemy, lastUpdate: Date.now() }; // Ensure lastUpdate is set
    } else {
        console.warn(`[collisionReport] Enemy with ID ${enemyId} not found in server state. Client sent: ${JSON.stringify(enemy)}. Trusting client data for now.`);
        gameState.enemies[enemyId] = { ...enemy, lastUpdate: Date.now() }; // Or handle as error
    }

    // Now, player and enemy are confirmed to be valid GameObject-like structures.
    if (checkAABBCollision(player, enemy)) {
      io.emit('validCollision', {
        playerId,
        enemyId,
        timestamp: Date.now(),
        position: { // Send back the positions that were validated
          playerX: player.x,
          playerY: player.y,
          enemyX: enemy.x,
          enemyY: enemy.y
        }
      });
      
      console.log(`[collisionReport] Colisão VÁLIDA detectada e emitida entre ${playerId} e ${enemyId}`);
    } else {
      // This case means the client reported a collision, but the server's AABB check 
      // with the *client-provided data* did not confirm it.
      socket.emit('invalidCollision', {
        message: 'Server-side AABB check did not confirm the client-reported collision using the provided object states.'
      });
      console.log(`[collisionReport] Discrepância: Cliente reportou colisão entre ${playerId} e ${enemyId}, mas a verificação AABB no servidor (com dados do cliente) FALHOU.`);
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
function validateCollision(playerId: string, enemyId: string): boolean {
  const player = gameState.players[playerId];
  const enemy = gameState.enemies[enemyId];
  
  // This correctly checks if they exist in the current server state
  if (!player || !enemy) {
    console.warn(`[validateCollision] Player (${playerId}) or Enemy (${enemyId}) not found in current server state.`);
    return false;
  }

  return checkAABBCollision(player, enemy);
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