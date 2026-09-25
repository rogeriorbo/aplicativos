import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'deiorbo@gmail.com' && password === 'Deio@2409') {
      setError('');
      onLoginSuccess();
    } else {
      setError('Credenciais inválidas. Por favor, tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full bg-secondary border border-slate-700 p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Déio Informática</h1>
          <p className="text-text-secondary mt-2">Acesso ao Painel de Administração</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-4 py-3 bg-slate-700 border border-slate-600 placeholder-slate-400 text-text-primary focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
              placeholder="Login (email)"
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="sr-only">Senha</label>
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full pl-4 pr-12 py-3 bg-slate-700 border border-slate-600 placeholder-slate-400 text-text-primary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
              placeholder="Senha"
            />
             <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute inset-y-0 right-0 pr-3 z-20 flex items-center text-slate-400 hover:text-accent transition-colors"
              aria-label={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
              title={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
            >
              {isPasswordVisible ? <EyeOffIcon className="w-5 h-5 text-accent" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent transition-colors"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};