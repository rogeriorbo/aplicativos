/**
 * Helper utilities for automatic high-speed favicons, app name suggestions,
 * link health checks, and resilient multi-tier icon fallbacks.
 */

// Helper to extract clean domain
export const getDomainFromUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let urlToParse = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlToParse)) {
    urlToParse = 'https://' + urlToParse;
  }
  try {
    const parsed = new URL(urlToParse);
    return parsed.hostname;
  } catch {
    return '';
  }
};

/**
 * Checks if an icon URL points to the known dead / hanging server
 * (aplicativos.deioinfo.com.br) which hangs for 30s before timing out.
 */
export const isDeadIconUrl = (iconUrl?: string): boolean => {
  if (!iconUrl) return true;
  return iconUrl.includes('aplicativos.deioinfo.com.br');
};

/**
 * Classifies an URL host into 'local' / 'intranet' vs 'public'.
 */
export const isLocalOrIntranetUrl = (rawUrl: string): boolean => {
  const domain = getDomainFromUrl(rawUrl);
  if (!domain) return false;
  return (
    domain === 'localhost' ||
    domain.startsWith('127.') ||
    domain.startsWith('192.168.') ||
    domain.startsWith('10.') ||
    domain.startsWith('172.16.') ||
    domain.endsWith('.local') ||
    domain.endsWith('.internal') ||
    domain === 'intranet.comaf.com'
  );
};

// Generates consistent color gradients based on string hash
const PALETTES = [
  ['#4f46e5', '#818cf8'], // indigo
  ['#0284c7', '#38bdf8'], // sky
  ['#059669', '#34d399'], // emerald
  ['#d97706', '#fbbf24'], // amber
  ['#e11d48', '#fb7185'], // rose
  ['#7c3aed', '#a78bfa'], // violet
  ['#0891b2', '#22d3ee'], // cyan
  ['#ea580c', '#fb923c'], // orange
  ['#2563eb', '#60a5fa'], // blue
];

const getPaletteForName = (str: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx] as [string, string];
};

/**
 * Generates an instant high-resolution vector SVG monogram data-URI.
 * Renders in 0ms with zero network requests.
 */
export const createMonogramSvg = (name: string): string => {
  const clean = (name || 'App').trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  let initials = 'A';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    initials = words[0].slice(0, 2).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0][0].toUpperCase();
  }

  const [c1, c2] = getPaletteForName(name || 'App');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Instant curated vector SVGs for core intranet and corporate apps.
 * Always resolves in 0ms without network roundtrips.
 */
export const EMBEDDED_ICONS: Record<string, string> = {
  // COMAF Aerospace Logo
  comaf: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="cbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
        <linearGradient id="wing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cbg)"/>
      <path d="M14 36 L32 16 L50 36 L42 36 L32 25 L22 36 Z" fill="url(#wing)"/>
      <path d="M20 42 L32 30 L44 42 L38 42 L32 36 L26 42 Z" fill="#93c5fd"/>
      <circle cx="32" cy="46" r="3" fill="#38bdf8"/>
    </svg>
  `)}`,

  // COMAF Old / Archive SGC
  comaf_old: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="obg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#obg)"/>
      <rect x="18" y="16" width="28" height="32" rx="4" fill="#64748b"/>
      <rect x="22" y="22" width="20" height="3" rx="1.5" fill="#f8fafc"/>
      <rect x="22" y="29" width="16" height="3" rx="1.5" fill="#f8fafc"/>
      <rect x="22" y="36" width="12" height="3" rx="1.5" fill="#cbd5e1"/>
      <circle cx="44" cy="42" r="7" fill="#f59e0b"/>
      <path d="M44 38 L44 42 L47 42" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `)}`,

  // WebMail
  webmail: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="wmbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#wmbg)"/>
      <rect x="14" y="20" width="36" height="26" rx="4" fill="#ffffff"/>
      <path d="M14 22 L32 36 L50 22" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `)}`,

  // Google
  google: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <rect width="64" height="64" rx="16" fill="#ffffff"/>
      <path d="M48.2 32.5c0-1.2-.1-2.4-.3-3.5H32v6.6h9.1c-.4 2.1-1.6 3.9-3.4 5.1v4.2h5.5c3.2-3 5-7.4 5-12.4z" fill="#4285F4"/>
      <path d="M32 49c4.6 0 8.5-1.5 11.3-4.1l-5.5-4.2c-1.5 1-3.5 1.6-5.8 1.6-4.5 0-8.2-3-9.6-7.1H16.7v4.3C19.5 45.1 25.3 49 32 49z" fill="#34A853"/>
      <path d="M22.4 35.2c-.4-1-.6-2.1-.6-3.2s.2-2.2.6-3.2V24.5H16.7C15.4 27.1 14.7 30 14.7 32s.7 4.9 2 7.5l5.7-4.3z" fill="#FBBC05"/>
      <path d="M32 21.7c2.5 0 4.7.9 6.5 2.5l4.9-4.9C40.5 16.6 36.6 15 32 15c-6.7 0-12.5 3.9-15.3 9.5l5.7 4.3c1.4-4.1 5.1-7.1 9.6-7.1z" fill="#EA4335"/>
    </svg>
  `)}`,

  // Danfe / NF-e
  nfe: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="nfebg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nfebg)"/>
      <rect x="18" y="14" width="28" height="36" rx="4" fill="#ffffff"/>
      <path d="M23 21 h18 M23 27 h18 M23 33 h12" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="23" y="39" width="3" height="6" fill="#047857"/>
      <rect x="28" y="39" width="2" height="6" fill="#047857"/>
      <rect x="32" y="39" width="4" height="6" fill="#047857"/>
      <rect x="38" y="39" width="3" height="6" fill="#047857"/>
    </svg>
  `)}`,

  // PartsBase
  partbase: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="pbbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#pbbg)"/>
      <circle cx="32" cy="32" r="14" stroke="#f59e0b" stroke-width="3" fill="none"/>
      <path d="M32 18 L32 46 M18 32 L46 32" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="5" fill="#f59e0b"/>
    </svg>
  `)}`,

  // NSN Now
  nsn: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="nsnbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nsnbg)"/>
      <rect x="16" y="20" width="32" height="24" rx="4" fill="#ffffff" fill-opacity="0.15" stroke="#ffffff" stroke-width="2"/>
      <text x="32" y="36" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">NSN</text>
    </svg>
  `)}`,

  // StokeSaas
  stokesaas: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="stkbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#stkbg)"/>
      <path d="M32 16 L48 24 L32 32 L16 24 Z" fill="#c7d2fe"/>
      <path d="M16 26 L32 34 L32 48 L16 40 Z" fill="#818cf8"/>
      <path d="M48 26 L32 34 L32 48 L48 40 Z" fill="#a5b4fc"/>
    </svg>
  `)}`,

  // I-Elitech
  elitec: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="elbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0891b2"/>
          <stop offset="100%" stop-color="#0e7490"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#elbg)"/>
      <rect x="28" y="16" width="8" height="24" rx="4" fill="#ffffff"/>
      <circle cx="32" cy="42" r="8" fill="#f43f5e"/>
      <rect x="30" y="24" width="4" height="14" fill="#f43f5e"/>
    </svg>
  `)}`,

  // Local / Intranet Default
  intranet: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <defs>
        <linearGradient id="intbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#intbg)"/>
      <rect x="16" y="18" width="32" height="10" rx="3" fill="#334155" stroke="#475569" stroke-width="1.5"/>
      <rect x="16" y="32" width="32" height="10" rx="3" fill="#334155" stroke="#475569" stroke-width="1.5"/>
      <circle cx="22" cy="23" r="2" fill="#10b981"/>
      <circle cx="27" cy="23" r="2" fill="#38bdf8"/>
      <circle cx="22" cy="37" r="2" fill="#10b981"/>
      <circle cx="27" cy="37" r="2" fill="#38bdf8"/>
      <path d="M32 43 L32 49 M20 49 L44 49" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `)}`,
};

/**
 * Maps known apps and URLs to their instant embedded SVG.
 */
export const getKnownServiceIcon = (name?: string, url?: string): string | null => {
  const n = (name || '').toLowerCase();
  const u = (url || '').toLowerCase();

  if (n.includes('new') && (n.includes('comaf') || u.includes('192.168.0.20'))) {
    return EMBEDDED_ICONS.comaf;
  }
  if (n.includes('old') && (n.includes('comaf') || u.includes('192.168.0.4'))) {
    return EMBEDDED_ICONS.comaf_old;
  }
  if (n.includes('comaf') || u.includes('comaf.ind.br') || u.includes('comaf.com')) {
    if (n.includes('webmail') || u.includes('webmail')) {
      return EMBEDDED_ICONS.webmail;
    }
    return EMBEDDED_ICONS.comaf;
  }
  if (n.includes('webmail') || u.includes('webmail')) {
    return EMBEDDED_ICONS.webmail;
  }
  if (n.includes('google') || u.includes('google.com')) {
    return EMBEDDED_ICONS.google;
  }
  if (n.includes('danfe') || n.includes('nfe') || u.includes('meudanfe.com.br')) {
    return EMBEDDED_ICONS.nfe;
  }
  if (n.includes('partbase') || n.includes('partsbase') || u.includes('partsbase.com')) {
    return EMBEDDED_ICONS.partbase;
  }
  if (n.includes('nsn') || u.includes('nsn-now.com')) {
    return EMBEDDED_ICONS.nsn;
  }
  if (n.includes('stokesaas') || u.includes('stokesaas')) {
    return EMBEDDED_ICONS.stokesaas;
  }
  if (n.includes('elitec') || u.includes('elitech')) {
    return EMBEDDED_ICONS.elitec;
  }
  if (isLocalOrIntranetUrl(u)) {
    return EMBEDDED_ICONS.intranet;
  }

  return null;
};

/**
 * Ultra-fast CDN favicon URL using DuckDuckGo CDN (cached globally).
 */
export const getDuckDuckGoFaviconUrl = (domain: string): string => {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
};

/**
 * Google S2 Favicon URL using 64px (much faster than 128px).
 */
export const getGoogleFaviconUrl = (domain: string, size: number = 64): string => {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
};

/**
 * In-memory & localStorage cache for resolved favicons to avoid repeated lookups.
 */
const FAVICON_CACHE_KEY = 'deio-favicon-cache-v1';
const memoryCache = new Map<string, string>();

const loadFaviconCache = () => {
  try {
    const raw = localStorage.getItem(FAVICON_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'string') memoryCache.set(k, v);
      });
    }
  } catch {
    // Ignore cache load errors
  }
};
loadFaviconCache();

export const cacheFavicon = (key: string, url: string) => {
  if (!key || !url) return;
  memoryCache.set(key, url);
  try {
    const obj: Record<string, string> = {};
    memoryCache.forEach((v, k) => {
      // Keep only top 100 entries to avoid bloating storage
      if (Object.keys(obj).length < 100) obj[k] = v;
    });
    localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore cache save errors
  }
};

/**
 * Resolves the primary favicon URL instantly.
 * Prioritizes:
 * 1. Custom icon (if valid and not dead host)
 * 2. Embedded instant vector SVG for known services (0ms)
 * 3. Intranet server vector SVG for local LAN URLs (0ms)
 * 4. Fast DuckDuckGo CDN icon for public domains
 * 5. Instant Monogram SVG as guaranteed fallback
 */
export const getFastFaviconUrl = (
  urlOrDomain: string,
  appName?: string,
  customIconUrl?: string
): string => {
  // If custom icon is provided and NOT pointing to the dead server, use it
  if (customIconUrl && !isDeadIconUrl(customIconUrl)) {
    return customIconUrl;
  }

  // Check known services first (0ms)
  const knownIcon = getKnownServiceIcon(appName, urlOrDomain);
  if (knownIcon) return knownIcon;

  const domain = getDomainFromUrl(urlOrDomain);
  if (!domain) {
    return createMonogramSvg(appName || 'App');
  }

  // Check memory cache
  const cached = memoryCache.get(domain);
  if (cached) return cached;

  // Local IPs cannot be queried via public favicon APIs
  if (isLocalOrIntranetUrl(urlOrDomain)) {
    return EMBEDDED_ICONS.intranet;
  }

  // Return fastest CDN favicon: DuckDuckGo
  return getDuckDuckGoFaviconUrl(domain);
};

/**
 * Legacy auto favicon helper (backward compatibility)
 */
export const getAutoFaviconUrl = (urlOrDomain: string, size: number = 64): string => {
  const domain = getDomainFromUrl(urlOrDomain) || urlOrDomain;
  if (!domain) return '';
  const known = getKnownServiceIcon(undefined, urlOrDomain);
  if (known) return known;
  if (isLocalOrIntranetUrl(urlOrDomain)) return EMBEDDED_ICONS.intranet;
  return getDuckDuckGoFaviconUrl(domain);
};

/**
 * Curated suggestions for well-known portals, services, and corporate apps.
 */
const KNOWN_SERVICES: Record<string, string> = {
  'google.com': 'Google',
  'github.com': 'GitHub',
  'youtube.com': 'YouTube',
  'whatsapp.com': 'WhatsApp',
  'web.whatsapp.com': 'WhatsApp Web',
  'notion.so': 'Notion',
  'trello.com': 'Trello',
  'slack.com': 'Slack',
  'figma.com': 'Figma',
  'canva.com': 'Canva',
  'chatgpt.com': 'ChatGPT',
  'openai.com': 'OpenAI',
  'comaf.ind.br': 'COMAF',
  'meudanfe.com.br': 'Danfe - Consultar',
  'partsbase.com': 'PartsBase',
  'nsn-now.com': 'NSN Now',
  'stokesaas.deioinfo.com.br': 'StokeSaas',
};

/**
 * Intelligent app name suggestion based on domain or URL.
 */
export const suggestAppName = (rawUrl: string): string => {
  const domain = getDomainFromUrl(rawUrl).toLowerCase();
  if (!domain) return '';

  for (const [key, name] of Object.entries(KNOWN_SERVICES)) {
    if (domain === key || domain.endsWith('.' + key)) {
      return name;
    }
  }

  const clean = domain
    .replace(/^www\./, '')
    .split('.')[0];

  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
