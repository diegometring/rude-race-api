import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameConfig from "./game/GameConfig"; // Mantenha seu GameConfig
import Login from "./Login"; // Importe o novo componente

// Interface para as props do componente Game
interface GameProps {
  username: string;
  onPlayAgain: () => void;
}

// Seu componente Game, agora recebendo a prop 'username'
const Game: React.FC<GameProps> = ({ username, onPlayAgain }) => {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // Inicia o jogo com a configuração
    const game = new Phaser.Game({ ...GameConfig, parent: gameRef.current });
    
    // Usa o Registry para passar dados para as cenas do Phaser
    game.registry.set('username', username);
    game.registry.set('onPlayAgain', onPlayAgain);

    return () => {
      game.destroy(true);
    };
    // Adicione username à lista de dependências do useEffect
  }, [username, onPlayAgain]);

  return <div ref={gameRef} id="game-container" />;
};


// Componente principal App
const App: React.FC = () => {
  // Estado para armazenar o nome de usuário. null significa que não logou ainda.
  const [username, setUsername] = useState<string | null>(null);

  // Função que será chamada pelo componente Login
  const handleLogin = (name: string) => {
    setUsername(name);
  };

  const handlePlayAgain = () => {
    setUsername(null);
  };


  return (
    <div className="app-container">
      {/* Renderização condicional: se não há username, mostra o Login. Senão, mostra o Jogo. */}
      {!username ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Game username={username} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
};

export default App;