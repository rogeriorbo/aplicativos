import React, { useState, useEffect } from 'react';
import type { User, UserUpdatePayload } from '../types';
import { EyeIcon, EyeOffIcon } from './icons';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserUpdatePayload) => Promise<void>;
  userToEdit: User | null;
  allUsers: User[];
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, userToEdit, allUsers }) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [shouldResetPassword, setShouldResetPassword] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email);
      setNickname(userToEdit.nickname);
    } else {
      setEmail('');
      setNickname('');
    }
    setPassword('');
    setError('');
    setShouldResetPassword(false);
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !nickname) {
      setError('Email e Apelido não podem estar vazios.');
      return;
    }
    
    if (allUsers.some(u => u.email === email && u.id !== userToEdit?.id)) {
        setError('Este email já está em uso por outro usuário.');
        return;
    }

    if (shouldResetPassword && (!password || password.length < 6)) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    
    const payload: UserUpdatePayload = {};
    if (email !== userToEdit?.email) {
        payload.email = email;
    }
    if (nickname !== userToEdit?.nickname) {
        payload.nickname = nickname;
    }
    if (shouldResetPassword && password) {
        payload.password = password;
    }

    if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração foi feita.');
        return;
    }

    try {
        await onSave(payload);
        onClose();
    } catch(e) {
        setError('Ocorreu um erro ao salvar. Tente novamente.');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-40 transition-opacity duration-300">
      <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-lg mx-4 transform transition-all scale-95 opacity-0 animate-fade-in-scale border border-border-color">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Editar Usuário</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="user-nickname" className="block text-sm font-medium text-text-secondary mb-2">Apelido / Nome</label>
                <input type="text" id="user-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                <input type="email" id="user-email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>

            <div className="space-y-2">
                 <label className="flex items-center">
                    <input
                    type="checkbox"
                    checked={shouldResetPassword}
                    onChange={(e) => {
                        setShouldResetPassword(e.target.checked);
                        if (!e.target.checked) setPassword(''); // Clear password if unchecked
                    }}
                    className="h-4 w-4 rounded border-input-border bg-input-background text-accent focus:ring-accent"
                    />
                    <span className="ml-2 text-sm text-text-secondary">Redefinir senha</span>
                </label>

                {shouldResetPassword && (
                    <div className="relative animate-fade-in-down">
                        <label htmlFor="user-password" className="block text-sm font-medium text-text-secondary mb-2">Nova Senha</label>
                        <input id="user-password" type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-4 pr-11 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                        <button 
                          type="button" 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                          className="absolute inset-y-0 right-0 top-7 pr-3 z-20 flex items-center text-text-secondary hover:text-accent transition-colors"
                          aria-label={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                          title={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                        >
                          <span className="sr-only">{isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}</span>
                          {isPasswordVisible ? <EyeOffIcon className="w-5 h-5 text-accent" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </div>
          
           {error && <p className="text-red-400 text-sm">{error}</p>}
           
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent transition-colors">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
       <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};