import 'reflect-metadata';
import dotenv from 'dotenv';
import { createServer } from 'http'; 
import { Server, Socket } from 'socket.io'; 
import { AppDataSource } from './data-source';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

interface GameState {
  players: Record<string, Player>;
  enemies: Record<string, Enemy>;
}

interface Player {
  id: string;
  x: number;
  y: number;
  lastUpdate: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
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
  console.log(`Novo jogador conectado: ${socket.id}`);

  gameState.players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    lastUpdate: Date.now()
  };

  socket.emit('gameInit', {
    playerId: socket.id,
    gameState
  });

  socket.on('playerUpdate', (position: { x: number; y: number }) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id] = {
        ...gameState.players[socket.id],
        ...position,
        lastUpdate: Date.now()
      };

      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        position
      });
    }
  });

  socket.on('collisionReport', (collisionData: { playerId: string; enemyId: string }) => {
    const { playerId, enemyId } = collisionData;
    
    if (validateCollision(playerId, enemyId)) {
      io.emit('validCollision', {
        playerId,
        enemyId,
        timestamp: Date.now()
      });
    } else {
      socket.emit('invalidCollision', {
        message: 'Colisão inválida reportada'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

function validateCollision(playerId: string, enemyId: string): boolean {
  const player = gameState.players[playerId];
  const enemy = gameState.enemies[enemyId];
  
  if (!player || !enemy) return false;

  const distance = Math.sqrt(
    Math.pow(player.x - enemy.x, 2) + 
    Math.pow(player.y - enemy.y, 2)
  );

  return distance < 50;
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
    console.error('Erro na inicialização', error);
    process.exit(1);
  });