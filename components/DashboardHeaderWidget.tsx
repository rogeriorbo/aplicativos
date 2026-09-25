import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { ClockIcon, SearchIcon, StarIcon, SparklesIcon } from './icons';

interface DashboardHeaderWidgetProps {
  currentUser?: User | null;
  totalApps: number;
  totalPinned: number;
  onOpenSearch: () => void;
}

export const DashboardHeaderWidget: React.FC<DashboardHeaderWidgetProps> = ({
  currentUser,
  totalApps,
  totalPinned,
  onOpenSearch,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    const name = currentUser?.nickname || currentUser?.email?.split('@')[0] || '';
    const nameSuffix = name ? `, ${name}` : '';

    if (hour >= 5 && hour < 12) {
      return { text: `Bom dia${nameSuffix}!`, icon: '☀️' };
    } else if (hour >= 12 && hour < 18) {
      return { text: `Boa tarde${nameSuffix}!`, icon: '🌤️' };
    } else {
      return { text: `Boa noite${nameSuffix}!`, icon: '🌙' };
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const greeting = getGreeting();

  return (
    <div className="bg-card-background/80 backdrop-blur-md rounded-xl border border-slate-700/60 px-3.5 py-2 mb-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs">
        {/* Left: Compact Greeting + Clock */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{greeting.icon}</span>
          <span className="font-semibold text-text-primary truncate text-xs sm:text-sm">
            {greeting.text}
          </span>
          <span className="hidden md:inline-block text-slate-500">•</span>
          <span className="hidden md:inline-block text-text-secondary text-[11px] truncate">
            {capitalizedDate}
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-accent font-medium flex items-center gap-1 text-[11px] flex-shrink-0">
            <ClockIcon className="w-3 h-3" />
            {formattedTime}
          </span>
        </div>

        {/* Right: Quick metrics & Search */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg px-2 py-0.5 text-[11px] text-text-secondary">
            <span className="font-semibold text-text-primary">{totalApps}</span> atalhos
            {totalPinned > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                  <StarIcon className="w-3 h-3" filled />
                  {totalPinned}
                </span>
              </>
            )}
          </div>

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 bg-accent/15 hover:bg-accent/25 text-text-primary border border-accent/30 rounded-lg px-2.5 py-1 text-xs font-medium transition-all group"
            title="Buscar atalho (Ctrl+K)"
          >
            <SearchIcon className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden md:inline-block bg-slate-900/60 border border-slate-700/80 rounded px-1 py-0.2 text-[9px] font-mono text-text-secondary">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
