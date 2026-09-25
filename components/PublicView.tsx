import React, { useState, useMemo, useEffect } from 'react';
import type { ApplicationLink, User } from '../types';
import {
  ExternalLinkIcon,
  GlobeAltIcon,
  StarIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  ListBulletIcon,
  SearchIcon,
  SparklesIcon,
} from './icons';
import { PlaylistCard } from './PlaylistCard';
import { api } from '../services/api';
import { getDomainFromUrl } from '../services/favicon';
import { AppFavicon } from './AppFavicon';
import { SystemStatusBadge } from './SystemStatusBadge';
import { DashboardHeaderWidget } from './DashboardHeaderWidget';
import { CommandPaletteModal } from './CommandPaletteModal';

interface PublicViewProps {
  apps: ApplicationLink[];
  currentUser?: User | null;
  onUpdateApp?: (updatedApp: ApplicationLink) => Promise<void>;
}

type ViewMode = 'grid' | 'compact' | 'list';

/* Normal Card Component */
const AppCardNormal: React.FC<{
  app: ApplicationLink;
  index: number;
  onTogglePin?: (app: ApplicationLink) => void;
}> = ({ app, index, onTogglePin }) => {
  const domain = getDomainFromUrl(app.url);

  return (
    <div
      className="bg-card-background backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md border border-slate-700/70 hover:border-accent/90 transform hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full group relative"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <div className="p-2.5 flex flex-col flex-grow">
        {/* Top Header Row with Icon on left and Status/Pin on right */}
        <div className="flex items-center justify-between mb-1.5 gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <AppFavicon
              url={app.url}
              name={app.name}
              iconUrl={app.iconUrl}
              className="w-5 h-5 object-contain"
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <SystemStatusBadge url={app.url} />
            {onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin(app);
                }}
                className={`p-0.5 rounded transition-colors ${
                  app.isPinned
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/80 opacity-0 group-hover:opacity-100'
                }`}
                title={app.isPinned ? 'Desafixar do Acesso Rápido' : 'Fixar no Acesso Rápido'}
              >
                <StarIcon className="w-3 h-3" filled={app.isPinned} />
              </button>
            )}
          </div>
        </div>

        {/* Title and Category - High contrast, clearly visible name */}
        <div className="mb-1 min-h-[2.25rem] flex flex-col justify-center">
          <h3
            className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-accent transition-colors break-words"
            title={app.name}
          >
            {app.name}
          </h3>
          {app.category && (
            <span className="text-[9px] uppercase font-semibold tracking-wider text-accent block mt-0.5 truncate">
              {app.category}
            </span>
          )}
        </div>

        {/* Description */}
        <p
          className="text-[11px] text-text-secondary mb-2 flex-grow line-clamp-1"
          title={app.description || domain || 'Acesse para mais detalhes.'}
        >
          {app.description || domain || 'Acesse para mais detalhes.'}
        </p>

        {/* Compact Launch Button */}
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            api.recordLinkClick(app.id, app.name, app.url, app.ownerId);
          }}
          className="mt-auto inline-flex items-center justify-center px-2 py-1 text-[11px] font-semibold rounded-md text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-sm group-hover:shadow"
        >
          Acessar
          <ExternalLinkIcon className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

/* Compact Card Component (Launchpad style) */
const AppCardCompact: React.FC<{
  app: ApplicationLink;
  index: number;
  onTogglePin?: (app: ApplicationLink) => void;
}> = ({ app, index, onTogglePin }) => {
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        api.recordLinkClick(app.id, app.name, app.url, app.ownerId);
      }}
      className="bg-card-background backdrop-blur-sm rounded-lg p-2 border border-slate-700/70 hover:border-accent hover:shadow-accent/20 transform hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center text-center group relative h-full"
      style={{ animationDelay: `${index * 20}ms` }}
    >
      {/* Top Pin/Status */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
        <SystemStatusBadge url={app.url} />
        {app.isPinned && <StarIcon className="w-2.5 h-2.5 text-amber-400" filled />}
      </div>

      <div className="w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center overflow-hidden mb-1.5 group-hover:scale-105 transition-transform shadow-inner">
        <AppFavicon
          url={app.url}
          name={app.name}
          iconUrl={app.iconUrl}
          className="w-5 h-5 object-contain"
        />
      </div>

      <span
        className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight break-words w-full group-hover:text-accent transition-colors min-h-[1.75rem] flex items-center justify-center"
        title={app.name}
      >
        {app.name}
      </span>
      {app.category && (
        <span className="text-[9px] text-text-secondary truncate w-full mt-0.5">
          {app.category}
        </span>
      )}
    </a>
  );
};

/* List Row Component */
const AppCardList: React.FC<{
  app: ApplicationLink;
  index: number;
  onTogglePin?: (app: ApplicationLink) => void;
}> = ({ app, index, onTogglePin }) => {
  const domain = getDomainFromUrl(app.url);

  return (
    <div
      className="bg-card-background backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/70 hover:border-accent/80 flex items-center justify-between gap-4 transition-all hover:bg-slate-800/40"
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0">
          <AppFavicon
            url={app.url}
            name={app.name}
            iconUrl={app.iconUrl}
            className="w-6 h-6 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={app.name}>
              {app.name}
            </span>
            {app.category && (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-accent border border-slate-700/80 hidden sm:inline-block">
                {app.category}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary truncate max-w-md">
            {app.description || domain || app.url}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0">
        <SystemStatusBadge url={app.url} showLabel />
        {onTogglePin && (
          <button
            onClick={() => onTogglePin(app)}
            className={`p-1.5 rounded-lg transition-colors ${
              app.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
            }`}
            title={app.isPinned ? 'Desafixar' : 'Fixar'}
          >
            <StarIcon className="w-4 h-4" filled={app.isPinned} />
          </button>
        )}
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            api.recordLinkClick(app.id, app.name, app.url, app.ownerId);
          }}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-accent hover:bg-indigo-600 transition-colors"
        >
          Acessar
          <ExternalLinkIcon className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

export const PublicView: React.FC<PublicViewProps> = ({ apps, currentUser, onUpdateApp }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('deio-view-mode');
      return (saved as ViewMode) || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('deio-view-mode', mode);
    } catch {}
  };

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { appLinks, videoLinks, pinnedApps, categories } = useMemo(() => {
    const appLinks = apps.filter((app) => app.type !== 'youtube_video');
    const videoLinks = apps.filter((app) => app.type === 'youtube_video');
    const pinnedApps = appLinks.filter((app) => !!app.isPinned);

    const cats = new Set<string>();
    appLinks.forEach((app) => {
      if (app.category && app.category.trim()) {
        cats.add(app.category.trim());
      }
    });

    return {
      appLinks,
      videoLinks,
      pinnedApps,
      categories: Array.from(cats).sort(),
    };
  }, [apps]);

  const displayedApps = useMemo(() => {
    if (selectedCategory === 'todos') {
      return appLinks;
    }
    if (selectedCategory === 'favoritos') {
      return pinnedApps;
    }
    return appLinks.filter((app) => app.category === selectedCategory);
  }, [appLinks, pinnedApps, selectedCategory]);

  const handleTogglePin = async (app: ApplicationLink) => {
    if (!onUpdateApp) return;
    const updated = { ...app, isPinned: !app.isPinned };
    await onUpdateApp(updated);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      {/* Dynamic Header Widget (Clock + Greeting + Stats + Search) */}
      <DashboardHeaderWidget
        currentUser={currentUser}
        totalApps={appLinks.length}
        totalPinned={pinnedApps.length}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Pinned / Quick Access Bar (If any pinned apps exist) */}
      {pinnedApps.length > 0 && selectedCategory === 'todos' && (
        <section className="mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <StarIcon className="w-3.5 h-3.5" filled />
              Acesso Rápido / Favoritos
            </h2>
            <span className="text-[11px] text-text-secondary">{pinnedApps.length} fixado(s)</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
            {pinnedApps.map((app, index) => (
              <AppCardCompact
                key={`pinned-${app.id || index}`}
                app={app}
                index={index}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        </section>
      )}

      {/* Navigation Controls: Categories + View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pb-2.5 border-b border-border-color/60">
        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'todos'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:bg-slate-800 hover:text-text-primary'
            }`}
          >
            Todos ({appLinks.length})
          </button>

          {pinnedApps.length > 0 && (
            <button
              onClick={() => setSelectedCategory('favoritos')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                selectedCategory === 'favoritos'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-slate-800 hover:text-text-primary'
              }`}
            >
              <StarIcon className="w-3.5 h-3.5" filled={selectedCategory === 'favoritos'} />
              Favoritos ({pinnedApps.length})
            </button>
          )}

          {categories.map((cat) => {
            const count = appLinks.filter((a) => a.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:bg-slate-800 hover:text-text-primary'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 self-end sm:self-auto flex-shrink-0">
          <button
            onClick={() => handleSetViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Grade Normal"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSetViewMode('compact')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'compact' ? 'bg-accent text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Grade Compacta (Launchpad)"
          >
            <ViewColumnsIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Visualização em Linhas / Lista"
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Apps Content */}
      {displayedApps.length === 0 ? (
        <div className="text-center py-16 bg-card-background backdrop-blur-sm rounded-2xl border border-border-color/60">
          <h2 className="text-xl font-semibold text-text-secondary">Nenhum atalho nesta categoria.</h2>
          <p className="mt-2 text-xs text-text-secondary">Selecione &quot;Todos&quot; para ver todos os aplicativos cadastrados.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3">
              {displayedApps.map((app, index) => (
                <div key={app.id ? `${app.id}-${index}` : `app-${index}`} className="animate-fade-in">
                  <AppCardNormal app={app} index={index} onTogglePin={handleTogglePin} />
                </div>
              ))}
            </div>
          )}

          {viewMode === 'compact' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
              {displayedApps.map((app, index) => (
                <div key={app.id ? `${app.id}-${index}` : `app-${index}`} className="animate-fade-in">
                  <AppCardCompact app={app} index={index} onTogglePin={handleTogglePin} />
                </div>
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2.5 max-w-4xl mx-auto">
              {displayedApps.map((app, index) => (
                <div key={app.id ? `${app.id}-${index}` : `app-${index}`} className="animate-fade-in">
                  <AppCardList app={app} index={index} onTogglePin={handleTogglePin} />
                </div>
              ))}
            </div>
          )}

          {/* Videos & Media Section */}
          {videoLinks.length > 0 && selectedCategory === 'todos' && (
            <section className="pt-6">
              <h2 className="text-xl font-bold text-text-primary mb-5 border-l-4 border-rose-500 pl-3.5 flex items-center justify-between">
                <span>Músicas & Vídeos</span>
                <span className="text-xs font-normal text-text-secondary">{videoLinks.length} item(ns)</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {videoLinks.map((app, index) => (
                  <div key={app.id ? `${app.id}-${index}` : `video-${index}`} className="animate-fade-in">
                    <PlaylistCard app={app} index={index} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Global Spotlight Search Modal */}
      <CommandPaletteModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        apps={appLinks}
      />
    </div>
  );
};
