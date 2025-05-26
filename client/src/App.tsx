import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameConfig from "./game/GameConfig";

const Game: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({ ...GameConfig, parent: gameRef.current });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} id="game-container" />;
};

export default Game;
