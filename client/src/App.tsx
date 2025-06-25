import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameConfig from "./game/GameConfig";
import Login from "./Login";

// Interface para as props do componente Game
interface UserData {
  id: number;
  name: string;
  token: string;
}

interface GameProps {
  user: UserData; // Agora recebe o objeto de usuário completo
  onPlayAgain: () => void;
}

// Seu componente Game, agora recebendo a prop 'username'
const Game: React.FC<GameProps> = ({ user, onPlayAgain }) => {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({ ...GameConfig, parent: gameRef.current });
    
    // Passando o objeto de usuário inteiro para o Phaser
    game.registry.set('user', user);
    game.registry.set('onPlayAgain', onPlayAgain);

    return () => {
      game.destroy(true);
    };
  }, [user, onPlayAgain]);

  return <div ref={gameRef} id="game-container" />;
};

// Componente principal App
const App: React.FC = () => {
  // Estado para armazenar o objeto de usuário. null significa que não logou.
  const [user, setUser] = useState<UserData | null>(null);

  // Função que será chamada pelo componente Login com os dados da API
  const handleLogin = (userData: UserData) => {
    // Salva o token para uso futuro (opcional, mas boa prática)
    localStorage.setItem('jwt_token', userData.token);
    setUser(userData);
  };

  const handlePlayAgain = () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
  };

  return (
    <div className="app-container">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Game user={user} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
};

export default App;