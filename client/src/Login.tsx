import React, { useState } from 'react';

interface UserData {
  id: number;
  name: string;
  token: string;
}

// Props do componente, incluindo a função onLogin
interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome não pode ser vazio.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Fazendo a chamada à API que você já tem!
      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao conectar com o servidor.');
      }

      // O backend retornou sucesso, temos o usuário e o token!
      // Chamamos a função onLogin com todos os dados.
      onLogin({ id: data.id, name: data.name, token: data.token });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
      <h2>Insira seu nome para jogar</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome de piloto"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Jogar'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default Login;