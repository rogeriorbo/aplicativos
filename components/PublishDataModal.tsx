import React, { useMemo, useState } from 'react';
import type { ApplicationLink } from '../types';

interface PublishDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  allApps: ApplicationLink[];
}

const getFileExtensionFromMimeType = (dataUrl: string): string => {
    const mimeType = dataUrl.match(/data:image\/([^;]+);/)?.[1];
    switch (mimeType) {
        case 'jpeg': return 'jpg';
        case 'png': return 'png';
        case 'gif': return 'gif';
        case 'svg+xml': return 'svg';
        default: return 'png';
    }
};

export const PublishDataModal: React.FC<PublishDataModalProps> = ({ isOpen, onClose, allApps }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const { prompt } = useMemo(() => {
    if (!isOpen) return { prompt: '' };

    // Deep copy to avoid mutating original state
    const publicApps = JSON.parse(JSON.stringify(allApps.filter(app => app.ownerId === 'default')));
    
    const filesToCreate: Record<string, string> = {};
    
    const newConfig = publicApps.map((app: ApplicationLink) => {
        if (app.iconUrl && app.iconUrl.startsWith('data:image/')) {
            const extension = getFileExtensionFromMimeType(app.iconUrl);
            const fileName = `uploads/icons/${app.id}.${extension}`;
            filesToCreate[fileName] = app.iconUrl;
            app.iconUrl = `/${fileName}`; // Update to relative server path
        }
        return app;
    });

    const payload = {
      filesToCreate,
      newPublicConfig: newConfig,
    };

    const finalPrompt = `Por favor, atualize o aplicativo com a seguinte configuração. Crie os arquivos de imagem especificados e atualize a configuração do dashboard público no arquivo 'services/api.ts'.\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    
    return { prompt: finalPrompt };
  }, [isOpen, allApps]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-2xl mx-4 transform transition-all scale-95 opacity-0 animate-fade-in-scale border border-border-color">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Publicar Alterações no Site</h2>
        <p className="text-text-secondary mb-2">Para salvar permanentemente suas alterações, incluindo novos ícones no servidor, siga estes passos:</p>
        <ol className="text-text-secondary mb-6 list-decimal list-inside space-y-1">
            <li>Clique no botão "Copiar Código" abaixo.</li>
            <li>Inicie uma nova conversa com o assistente de IA.</li>
            <li>Cole o código copiado e envie a mensagem.</li>
            <li>O assistente irá então fornecer os arquivos atualizados para você implantar em seu servidor.</li>
        </ol>
        <div className="relative">
             <textarea
                readOnly
                value={prompt}
                className="w-full h-64 p-4 font-mono text-xs bg-input-background border border-input-border rounded-md text-text-primary resize-none"
             />
             <button
                onClick={handleCopy}
                className="absolute top-3 right-3 px-3 py-1 text-xs rounded-md text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-accent"
            >
                {copySuccess ? 'Copiado!' : 'Copiar Código'}
            </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-slate-500 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};