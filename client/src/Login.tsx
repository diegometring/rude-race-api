import React, { useState } from 'react';

// A interface define as props que nosso componente receberá.
// Neste caso, ele recebe uma função para ser chamada no login.
interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Impede o recarregamento da página
    const trimmedName = name.trim();
    if (trimmedName) {
      onLogin(trimmedName); // Chama a função do componente pai
    } else {
      alert('Por favor, digite seu nome!');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Bem-vindo à Corrida</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite seu nome para começar"
          autoFocus
        />
        <button type="submit">Iniciar Corrida</button>
      </form>
    </div>
  );
};

export default Login;