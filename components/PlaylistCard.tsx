import React, { useState, useEffect, useRef } from 'react';
import type { ApplicationLink } from '../types';
import { PlayIcon, PauseIcon } from './icons';

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('watch')) {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
  } catch (e) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  return null;
};

const AudioVisualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
    const barCount = 12;
    return (
        <div className={`absolute inset-0 flex justify-around items-end p-2 transition-opacity duration-300 overflow-hidden pointer-events-none ${isPlaying ? 'opacity-60' : 'opacity-20'}`}>
            {Array.from({ length: barCount }).map((_, i) => (
                <div
                    key={i}
                    className="visualizer-bar bg-rose-400 w-1 rounded-full"
                    style={{
                        animationDuration: `${Math.random() * (1.5 - 0.5) + 0.5}s`,
                        animationDelay: `${Math.random() * 0.5}s`,
                    }}
                />
            ))}
        </div>
    );
};


export const PlaylistCard: React.FC<{ 
  app: ApplicationLink;
  index: number;
}> = ({ app, index }) => {
    const videoId = getYouTubeVideoId(app.url);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!videoId) {
            setIsLoading(false);
            return;
        }

        const onPlayerReady = (event: any) => {
            // This is crucial: the event target is the initialized player.
            // We set the ref here to ensure we have the correct, ready instance.
            playerRef.current = event.target;
            setIsLoading(false);
        };

        const onPlayerStateChange = (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setIsPlaying(true);
            } else {
                setIsPlaying(false);
            }
        };
        
        // This function will attempt to create the player.
        // It will be called recursively with a timeout if the YT API is not ready yet.
        const createPlayer = () => {
            if ((window as any).YT && (window as any).YT.Player) {
                 new (window as any).YT.Player(`youtube-player-${app.id}`, {
                    height: '1',
                    width: '1',
                    videoId: videoId,
                    playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange
                    }
                });
            } else {
                // If the API is not ready, try again shortly.
                setTimeout(createPlayer, 100);
            }
        }
        createPlayer();

        return () => {
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }
            playerRef.current = null;
        };
    }, [app.id, videoId]);

    const handleTogglePlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Guard against clicks while loading or if the player isn't initialized.
      if (isLoading || !playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return;

      const playerState = playerRef.current.getPlayerState();
      if (playerState === (window as any).YT.PlayerState.PLAYING) {
          playerRef.current.pauseVideo();
      } else {
          playerRef.current.playVideo();
      }
    };

    return (
      <div 
        className={`group relative bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700 transform hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col aspect-square justify-between ${isLoading ? 'cursor-wait' : 'cursor-pointer'} ${isPlaying ? 'border-rose-500 shadow-rose-500/10' : 'hover:border-accent'}`}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={handleTogglePlay}
        >
        
        <div id={`youtube-player-${app.id}`} className="absolute -top-96 left-0 w-px h-px opacity-0 pointer-events-none"></div>
        
        <div className={`relative flex-grow flex items-center justify-center ${isPlaying ? 'playing' : ''}`}>
            <AudioVisualizer isPlaying={isPlaying} />
            <div className="relative z-10 w-12 h-12 bg-black/30 rounded-full flex items-center justify-center border-2 border-white/20 group-hover:bg-black/50 group-hover:border-white/50 transition-all duration-300 transform group-hover:scale-110">
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" title="Carregando..."></div>
                ) : isPlaying ? (
                    <PauseIcon className="w-8 h-8 text-white opacity-80 group-hover:opacity-100" />
                ) : (
                    <PlayIcon className="w-8 h-8 text-white opacity-80 group-hover:opacity-100" />
                )}
            </div>
        </div>

        <div className="p-2 bg-black/40 backdrop-blur-sm z-10">
          <h3 className="text-xs font-bold text-text-primary truncate" title={app.name}>{app.name}</h3>
        </div>
        <style>{`
            @keyframes dance {
                0%, 100% { height: 5%; }
                50% { height: 95%; }
            }
            .visualizer-bar {
                animation-name: dance;
                animation-timing-function: ease-in-out;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: paused;
            }
            .playing .visualizer-bar {
                animation-play-state: running;
            }
        `}</style>
      </div>
    );
};
