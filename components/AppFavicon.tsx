import React, { useState, useEffect, useRef } from 'react';
import {
  getFastFaviconUrl,
  getDomainFromUrl,
  getGoogleFaviconUrl,
  getDuckDuckGoFaviconUrl,
  createMonogramSvg,
  getKnownServiceIcon,
  cacheFavicon,
  isDeadIconUrl
} from '../services/favicon';

interface AppFaviconProps {
  url: string;
  name: string;
  iconUrl?: string;
  className?: string;
  alt?: string;
}

export const AppFavicon: React.FC<AppFaviconProps> = ({
  url,
  name,
  iconUrl,
  className = 'w-7 h-7 object-contain',
  alt
}) => {
  // Compute initial source with zero delay (Original Favicon from Google S2 128px or custom)
  const initialSrc = React.useMemo(() => {
    return getFastFaviconUrl(url, name, iconUrl);
  }, [url, name, iconUrl]);

  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const fallbackLevelRef = useRef<number>(0);

  // Sync if props change
  useEffect(() => {
    const nextSrc = getFastFaviconUrl(url, name, iconUrl);
    setCurrentSrc(nextSrc);
    fallbackLevelRef.current = 0;
  }, [url, name, iconUrl]);

  const handleError = () => {
    const domain = getDomainFromUrl(url);
    const known = getKnownServiceIcon(name, url);

    // Progression of fallbacks:
    // Level 0: Failed initialSrc -> try Google S2 (sz=64) or DuckDuckGo CDN
    if (fallbackLevelRef.current === 0) {
      fallbackLevelRef.current = 1;
      if (domain) {
        const duckUrl = getDuckDuckGoFaviconUrl(domain);
        if (currentSrc !== duckUrl) {
          setCurrentSrc(duckUrl);
          return;
        }
      }
    }

    // Level 1: Failed DuckDuckGo -> try known vector or Google S2 (sz=32)
    if (fallbackLevelRef.current === 1) {
      fallbackLevelRef.current = 2;
      if (known && currentSrc !== known) {
        setCurrentSrc(known);
        return;
      }
      if (domain) {
        const googleUrl = getGoogleFaviconUrl(domain, 32);
        if (currentSrc !== googleUrl) {
          setCurrentSrc(googleUrl);
          return;
        }
      }
    }

    // Level 2: Failed CDNs -> use instant Monogram SVG (guaranteed to render 0ms)
    if (fallbackLevelRef.current <= 2) {
      fallbackLevelRef.current = 3;
      const monogram = createMonogramSvg(name);
      setCurrentSrc(monogram);
      return;
    }
  };

  const handleLoad = () => {
    const domain = getDomainFromUrl(url);
    if (domain && !isDeadIconUrl(currentSrc) && !currentSrc.startsWith('data:')) {
      cacheFavicon(domain, currentSrc);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt || `${name} favicon`}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};
