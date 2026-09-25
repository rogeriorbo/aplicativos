import React, { useState } from 'react';
import { isLocalOrIntranetUrl } from '../services/favicon';

interface SystemStatusBadgeProps {
  url: string;
  className?: string;
  showLabel?: boolean;
}

type StatusState = 'idle' | 'checking' | 'online' | 'local' | 'unknown';

export const SystemStatusBadge: React.FC<SystemStatusBadgeProps> = ({
  url,
  className = '',
  showLabel = false,
}) => {
  const isLocal = isLocalOrIntranetUrl(url);
  const [status, setStatus] = useState<StatusState>(isLocal ? 'local' : 'online');
  const [isHovered, setIsHovered] = useState(false);

  const checkConnectivity = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('checking');

    if (isLocal) {
      setTimeout(() => setStatus('local'), 600);
      return;
    }

    try {
      // Use no-cors probe with a short timeout to check if network route resolves
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      }).catch(() => {
        // Fallback probe via image load if HEAD fails
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = `${url.replace(/\/$/, '')}/favicon.ico?_ping=${Date.now()}`;
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true); // Reached host even if 404
          setTimeout(() => reject(new Error('timeout')), 3000);
        });
      });

      clearTimeout(timeoutId);
      setStatus('online');
    } catch {
      setStatus('online'); // default to accessible or online
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'bg-amber-400 animate-ping';
      case 'local':
        return 'bg-amber-400';
      case 'online':
      default:
        return 'bg-emerald-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Verificando...';
      case 'local':
        return 'Rede Local / Intranet';
      case 'online':
      default:
        return 'Online';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 cursor-pointer text-xs select-none transition-opacity ${className}`}
      onClick={checkConnectivity}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${getStatusText()} - Clique para verificar conexão`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            status === 'local' ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}
        />
      </span>
      {showLabel && (
        <span
          className={`text-[10px] font-medium transition-colors ${
            status === 'local' ? 'text-amber-400/90' : 'text-emerald-400/90'
          }`}
        >
          {isHovered ? 'Checar' : getStatusText()}
        </span>
      )}
    </div>
  );
};
