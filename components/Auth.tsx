import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface AuthProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string, nickname: string) => Promise<boolean>;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLoginView) {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Email ou senha inválidos.');
      }
    } else {
      if (!nickname.trim()) {
        setError('O apelido é obrigatório.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
       if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      const success = await onRegister(email, password, nickname);
      if (!success) {
        setError('Este email já está em uso.');
      }
    }
  };
  
  const toggleView = () => {
      setIsLoginView(!isLoginView);
      setError('');
      setEmail('');
      setNickname('');
      setPassword('');
      setConfirmPassword('');
      setIsPasswordVisible(false);
      setIsConfirmPasswordVisible(false);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-transparent px-4 py-12">
      <div className="max-w-md w-full bg-card-background backdrop-blur-sm border border-border-color p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Déio Informática</h1>
          <p className="text-text-secondary mt-2">
            {isLoginView ? 'Acesso ao Painel de Administração' : 'Crie sua Conta de Administrador'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLoginView && (
             <div>
                <label htmlFor="nickname" className="sr-only">Apelido / Nome</label>
                <input id="nickname" name="nickname" type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-4 py-3 bg-input-background border border-input-border placeholder-text-secondary text-text-primary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                placeholder="Apelido / Nome" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-4 py-3 bg-input-background border border-input-border placeholder-text-secondary text-text-primary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
              placeholder="Email" />
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
              className="appearance-none rounded-md relative block w-full pl-4 pr-12 py-3 bg-input-background border border-input-border placeholder-text-secondary text-text-primary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
              placeholder="Senha" 
            />
            <button 
              type="button" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
              className="absolute inset-y-0 right-0 pr-3 z-20 flex items-center text-text-secondary hover:text-accent focus:outline-none transition-colors" 
              aria-label={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
              title={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
            >
              {isPasswordVisible ? (
                <EyeOffIcon className="w-5 h-5 text-accent" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {!isLoginView && (
            <div className="relative">
                <label htmlFor="confirm-password" className="sr-only">Confirmar Senha</label>
                <input 
                  id="confirm-password" 
                  name="confirm-password" 
                  type={isConfirmPasswordVisible ? 'text' : 'password'} 
                  autoComplete="new-password" 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full pl-4 pr-12 py-3 bg-input-background border border-input-border placeholder-text-secondary text-text-primary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  placeholder="Confirmar Senha" 
                />
                <button 
                  type="button" 
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} 
                  className="absolute inset-y-0 right-0 pr-3 z-20 flex items-center text-text-secondary hover:text-accent focus:outline-none transition-colors" 
                  aria-label={isConfirmPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                  title={isConfirmPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                >
                  {isConfirmPasswordVisible ? (
                    <EyeOffIcon className="w-5 h-5 text-accent" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent transition-colors">
              {isLoginView ? 'Entrar' : 'Registrar'}
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={toggleView} className="font-medium text-sm text-accent hover:text-indigo-400">
                {isLoginView ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Faça login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};