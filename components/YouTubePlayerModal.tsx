import React from 'react';

interface YouTubePlayerModalProps {
  videoId: string | null;
  onClose: () => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({ videoId, onClose }) => {
  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-secondary rounded-lg shadow-2xl w-full max-w-4xl mx-4 transform transition-all scale-95 opacity-0 animate-fade-in-scale border border-border-color overflow-hidden"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="aspect-w-16 aspect-h-9">
            <iframe 
                src={embedUrl} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full h-full"
            ></iframe>
        </div>
      </div>
       <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light"
          aria-label="Fechar"
        >
          &times;
        </button>
      <style>{`
        .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
        .aspect-h-9 { height: 0; }
        .aspect-w-16 > iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); animation-delay: 0.1s; }
      `}</style>
    </div>
  );
};