import React, { useMemo, useState } from 'react';
import type { User } from '../types';

interface SyncBgModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const getFileExtensionFromMimeType = (dataUrl: string): string => {
    const mimeType = dataUrl.match(/data:image\/([^;]+);/)?.[1];
    return mimeType === 'jpeg' ? 'jpg' : mimeType || 'jpg';
};

export const SyncBgModal: React.FC<SyncBgModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const { prompt } = useMemo(() => {
    if (!isOpen || !currentUser.preferences?.customBackgroundUrl?.startsWith('data:image')) {
      return { prompt: '' };
    }

    const dataUrl = currentUser.preferences.customBackgroundUrl;
    const extension = getFileExtensionFromMimeType(dataUrl);
    const fileName = `uploads/backgrounds/${currentUser.id}.${extension}`;
    const serverUrl = `/${fileName}`;

    const payload = {
      filesToCreate: {
        [fileName]: dataUrl
      },
      updateUserPreferences: {
        userId: currentUser.id,
        preferences: {
          customBackgroundUrl: serverUrl
        }
      }
    };

    const finalPrompt = `Por favor, salve a imagem de fundo do usuário no servidor e atualize suas preferências. Crie o arquivo de imagem e adicione uma entrada em 'USER_PREFERENCE_OVERRIDES' no arquivo 'services/api.ts'.\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    
    return { prompt: finalPrompt };
  }, [isOpen, currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-2xl mx-4 border border-border-color">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Sincronizar Imagem de Fundo</h2>
        <p className="text-text-secondary mb-2">Para salvar permanentemente sua nova imagem de fundo no servidor, siga estes passos:</p>
        <ol className="text-text-secondary mb-6 list-decimal list-inside space-y-1">
            <li>Clique no botão "Copiar Código" abaixo.</li>
            <li>Inicie uma nova conversa com o assistente de IA.</li>
            <li>Cole o código e envie a mensagem para que as alterações sejam aplicadas.</li>
        </ol>
        <div className="relative">
             <textarea
                readOnly
                value={prompt}
                className="w-full h-64 p-4 font-mono text-xs bg-input-background border border-input-border rounded-md text-text-primary resize-none"
             />
             <button
                onClick={handleCopy}
                className="absolute top-3 right-3 px-3 py-1 text-xs rounded-md text-white bg-accent hover:bg-indigo-600"
            >
                {copySuccess ? 'Copiado!' : 'Copiar Código'}
            </button>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
