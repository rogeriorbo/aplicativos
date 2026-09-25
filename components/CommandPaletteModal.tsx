import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ApplicationLink } from '../types';
import { SearchIcon, ExternalLinkIcon, StarIcon, GlobeAltIcon, CloseIcon } from './icons';
import { getDomainFromUrl } from '../services/favicon';
import { AppFavicon } from './AppFavicon';
import { api } from '../services/api';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: ApplicationLink[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  apps,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredApps = useMemo(() => {
    if (!query.trim()) {
      // Prioritize pinned apps, then all others
      return [...apps].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    const q = query.toLowerCase().trim();
    return apps.filter((app) => {
      const nameMatch = app.name.toLowerCase().includes(q);
      const descMatch = app.description?.toLowerCase().includes(q);
      const urlMatch = app.url.toLowerCase().includes(q);
      const categoryMatch = app.category?.toLowerCase().includes(q);
      return nameMatch || descMatch || urlMatch || categoryMatch;
    });
  }, [apps, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected item in view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleLaunch = (app: ApplicationLink) => {
    api.recordLinkClick(app.id, app.name, app.url, app.ownerId);
    window.open(app.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredApps.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredApps.length) % (filteredApps.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredApps[selectedIndex]) {
        handleLaunch(filteredApps[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 transition-all"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <SearchIcon className="w-5 h-5 text-accent mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome, categoria ou URL do atalho..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 mr-2"
              title="Limpar busca"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
            ESC para fechar
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <p className="text-base font-medium">Nenhum atalho encontrado para &quot;{query}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Tente buscar por outro termo ou pelo endereço do site.</p>
            </div>
          ) : (
            filteredApps.map((app, index) => {
              const isSelected = index === selectedIndex;
              const domain = getDomainFromUrl(app.url);
              return (
                <div
                  key={app.id}
                  onClick={() => handleLaunch(app)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent/20 border border-accent/40 shadow-sm'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <AppFavicon
                        url={app.url}
                        name={app.name}
                        iconUrl={app.iconUrl}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{app.name}</span>
                        {app.isPinned && (
                          <StarIcon className="w-3.5 h-3.5 text-amber-400" filled />
                        )}
                        {app.category && (
                          <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-accent border border-slate-700">
                            {app.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {app.description || domain || app.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[140px]">
                      {domain}
                    </span>
                    <button
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Acessar
                      <ExternalLinkIcon className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/70 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">↓</kbd> Navegar</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">Enter</kbd> Acessar link</span>
          </div>
          <span className="text-slate-400">{filteredApps.length} {filteredApps.length === 1 ? 'atalho' : 'atalhos'}</span>
        </div>
      </div>
    </div>
  );
};
