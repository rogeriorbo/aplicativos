import React, { useState, useEffect } from 'react';
import type { ApplicationLink, User } from '../types';
import { ImageIcon, SpinnerIcon, CheckIcon, SparklesIcon, StarIcon } from './icons';
import { getFastFaviconUrl, suggestAppName, getDomainFromUrl } from '../services/favicon';
import { AppFavicon } from './AppFavicon';

interface AppFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: Omit<ApplicationLink, 'ownerId' | 'type'> & {
    ownerId?: string;
    type?: 'app' | 'youtube_video';
    category?: string;
    isPinned?: boolean;
  }) => Promise<void>;
  appToEdit: ApplicationLink | null;
  currentUser: User | null;
}

const CATEGORY_SUGGESTIONS = [
  'Geral',
  'Sistemas Internos',
  'Ferramentas',
  'Comunicação',
  'Finanças',
  'Mídia & Vídeos',
];

export const AppFormModal: React.FC<AppFormModalProps> = ({ isOpen, onClose, onSave, appToEdit, currentUser }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState('Geral');
  const [isPinned, setIsPinned] = useState(false);
  const [linkType, setLinkType] = useState<'app' | 'youtube_video'>('app');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAutoFavicon, setIsAutoFavicon] = useState(true);

  // Derived auto favicon
  const domain = getDomainFromUrl(url);
  const autoFavicon = url.trim() ? getFastFaviconUrl(url, name) : '';

  useEffect(() => {
    if (appToEdit) {
      setName(appToEdit.name);
      setUrl(appToEdit.url);
      setDescription(appToEdit.description || '');
      setIconUrl(appToEdit.iconUrl);
      setCategory(appToEdit.category || 'Geral');
      setIsPinned(!!appToEdit.isPinned);
      setLinkType(appToEdit.type || 'app');
      setIsAutoFavicon(!appToEdit.iconUrl || appToEdit.iconUrl.includes('google.com/s2/favicons') || appToEdit.iconUrl.includes('duckduckgo.com'));
    } else {
      setName('');
      setUrl('');
      setDescription('');
      setIconUrl(undefined);
      setCategory('Geral');
      setIsPinned(false);
      setLinkType('app');
      setIsAutoFavicon(true);
    }
    setError('');
    setIsSaving(false);
    setShowSuccess(false);
  }, [appToEdit, isOpen]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);

    // Auto-suggest name if name is currently empty or matches previous auto-suggestion
    if (!name.trim()) {
      const suggested = suggestAppName(newUrl);
      if (suggested) {
        setName(suggested);
      }
    }

    // Auto-update iconUrl if using auto-favicon mode
    if (isAutoFavicon && newUrl.trim()) {
      setIconUrl(getFastFaviconUrl(newUrl, name));
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconUrl(reader.result as string);
        setIsAutoFavicon(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseAutoFavicon = () => {
    if (url.trim()) {
      const autoUrl = getFastFaviconUrl(url, name);
      setIconUrl(autoUrl);
      setIsAutoFavicon(true);
    }
  };

  const getYouTubeVideoId = (testUrl: string): string | null => {
    try {
      const urlObj = new URL(testUrl);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('watch')) {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
    } catch {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
      const match = testUrl.match(regex);
      return match ? match[1] : null;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || showSuccess) return;

    if (!name || !url) {
      setError('Nome e Link são campos obrigatórios.');
      return;
    }
    if (linkType === 'app') {
      try {
        let validUrl = url.trim();
        if (!/^https?:\/\//i.test(validUrl)) {
          validUrl = 'https://' + validUrl;
          setUrl(validUrl);
        }
        new URL(validUrl);
      } catch {
        setError('Formato de URL inválido para aplicativo. Use https://exemplo.com');
        return;
      }
    } else if (linkType === 'youtube_video') {
      if (!getYouTubeVideoId(url)) {
        setError('URL de vídeo do YouTube inválida. Use o link completo do vídeo.');
        return;
      }
    }
    setError('');
    setIsSaving(true);

    // If iconUrl is empty and domain exists, automatically assign the fast Favicon
    const finalIconUrl = iconUrl || (domain ? getFastFaviconUrl(url, name) : undefined);

    try {
      await onSave({
        id: appToEdit ? appToEdit.id : crypto.randomUUID(),
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        iconUrl: finalIconUrl,
        ownerId: appToEdit?.ownerId,
        type: linkType,
        category: category.trim() || 'Geral',
        isPinned,
      });

      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao salvar. Tente novamente.');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayIcon = iconUrl || (domain ? autoFavicon : undefined);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-40 transition-opacity duration-300 p-4">
      <div className="relative bg-card-background rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xl mx-auto transform transition-all border border-border-color max-h-[90vh] overflow-y-auto">
        <div
          className={`absolute inset-0 bg-card-background/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl z-10 transition-opacity duration-300 ${
            showSuccess ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckIcon className="w-10 h-10 text-emerald-400" />
          </div>
          <p className="text-xl font-semibold text-text-primary">Salvo com Sucesso!</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            {appToEdit ? 'Editar Atalho / Aplicativo' : 'Adicionar Novo Atalho'}
          </h2>
          {domain && (
            <span className="inline-flex items-center gap-1 text-[11px] text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full font-medium">
              <SparklesIcon className="w-3.5 h-3.5" />
              Favicon Automático
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* URL with automatic extraction */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-text-secondary mb-1.5">
              Link (URL) *
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="ex: https://github.com ou https://meusistema.com"
              className="w-full px-4 py-2.5 bg-input-background border border-input-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            {domain && (
              <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1.5">
                <span>Domínio: <strong className="text-text-primary">{domain}</strong></span>
              </p>
            )}
          </div>

          {/* Name & Icon Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-2 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Nome do Aplicativo *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome exibido no card"
                  className="w-full px-4 py-2 bg-input-background border border-input-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Categoria / Pasta
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="ex: Geral, Sistemas, Ferramentas..."
                    className="flex-1 px-4 py-2 bg-input-background border border-input-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Icon Preview with Auto-Favicon */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <span className="text-xs font-medium text-text-secondary mb-2">Favicon Original</span>
              <div className="w-16 h-16 rounded-xl bg-input-background border border-input-border flex items-center justify-center overflow-hidden mb-2 shadow-inner">
                {url.trim() || iconUrl ? (
                  <AppFavicon
                    url={url}
                    name={name || 'Preview'}
                    iconUrl={iconUrl}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-500" />
                )}
              </div>

              {domain && (
                <button
                  type="button"
                  onClick={() => {
                    const original = getFastFaviconUrl(url, name);
                    setIconUrl(original);
                    setIsAutoFavicon(true);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/30 mb-1.5 flex items-center gap-1 transition-colors"
                  title="Obter o Favicon Original do site via Google S2 HD"
                >
                  <SparklesIcon className="w-3 h-3" />
                  Favicon Original
                </button>
              )}

              <label
                htmlFor="icon-upload"
                className="cursor-pointer text-[11px] text-slate-300 hover:text-white hover:underline text-center"
              >
                Upload Manual
                <input
                  id="icon-upload"
                  name="icon-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleIconChange}
                />
              </label>

              {iconUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setIconUrl(undefined);
                    setIsAutoFavicon(false);
                  }}
                  className="mt-1 text-[10px] text-rose-400 hover:underline"
                >
                  Limpar Ícone
                </button>
              )}
            </div>
          </div>

          {/* Pin to Quick Access Checkbox */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <StarIcon className="w-5 h-5 text-amber-400" filled={isPinned} />
              <div>
                <label htmlFor="isPinned" className="text-xs font-semibold text-text-primary block cursor-pointer">
                  Fixar no Acesso Rápido (Favorito)
                </label>
                <span className="text-[11px] text-text-secondary">
                  Ficará destacado no topo do dashboard para acesso instantâneo.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded text-accent focus:ring-accent bg-slate-900 border-slate-700 cursor-pointer"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1.5">
              Descrição (Opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve descrição do que este link ou sistema faz..."
              className="w-full px-4 py-2 bg-input-background border border-input-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Link Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Tipo de Link</label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="linkType"
                  value="app"
                  checked={linkType === 'app'}
                  onChange={() => setLinkType('app')}
                  className="h-4 w-4 text-accent focus:ring-accent border-input-border bg-input-background"
                />
                <span className="ml-2 text-sm text-text-primary">Aplicativo / Site</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="linkType"
                  value="youtube_video"
                  checked={linkType === 'youtube_video'}
                  onChange={() => setLinkType('youtube_video')}
                  className="h-4 w-4 text-accent focus:ring-accent border-input-border bg-input-background"
                />
                <span className="ml-2 text-sm text-text-primary">Vídeo do YouTube</span>
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || showSuccess}
              className="px-5 py-2 rounded-xl text-sm font-medium text-text-primary bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || showSuccess}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center min-w-[120px] disabled:opacity-50"
            >
              {isSaving ? <SpinnerIcon className="w-5 h-5" /> : 'Salvar Atalho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
