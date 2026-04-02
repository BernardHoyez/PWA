/* ============================================================
   LittoExtract — Service Worker
   Gère le cache applicatif ET sert les tuiles MBTiles en mémoire
   ============================================================ */

const CACHE_NAME = 'littoextract-v1';
const APP_SHELL = [
  '/PWA/littoextract/',
  '/PWA/littoextract/index.html',
  '/PWA/littoextract/app.js',
  '/PWA/littoextract/style.css',
  '/PWA/littoextract/coastline.geojson',
  'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.js',
  'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css',
  'https://unpkg.com/@turf/turf@6.5.0/turf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js',
];

// Cache de tuiles MBTiles chargées en mémoire (Map z/x/y → Uint8Array)
let tileCache = new Map();
let dbReady = false;

// ── Installation ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL.map(url => new Request(url, { mode: 'no-cors' })))
        .catch(() => {/* ignoré si hors-ligne à l'install */});
    })
  );
  self.skipWaiting();
});

// ── Activation ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Messages depuis l'application principale ────────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  if (type === 'LOAD_TILES') {
    // Reçoit la Map de tuiles depuis le thread principal
    tileCache = new Map(payload);
    dbReady = true;
    event.source.postMessage({ type: 'TILES_READY', count: tileCache.size });
  }

  if (type === 'CLEAR_TILES') {
    tileCache.clear();
    dbReady = false;
  }

  if (type === 'PING') {
    event.source.postMessage({ type: 'PONG', ready: dbReady, tiles: tileCache.size });
  }
});

// ── Interception des requêtes ────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tuiles virtuelles servies depuis le cache mémoire
  if (url.pathname.startsWith('/PWA/littoextract/tiles/')) {
    event.respondWith(serveTile(url.pathname));
    return;
  }

  // App shell — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/PWA/littoextract/index.html'));
    })
  );
});

// ── Servir une tuile depuis le cache mémoire ─────────────────
async function serveTile(pathname) {
  // Format attendu : /PWA/littoextract/tiles/{z}/{x}/{y}
  const parts = pathname.split('/');
  const z = parseInt(parts[parts.length - 3]);
  const x = parseInt(parts[parts.length - 2]);
  const y = parseInt(parts[parts.length - 1]);

  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    return new Response('Bad tile coordinates', { status: 400 });
  }

  const key = `${z}/${x}/${y}`;
  const tileData = tileCache.get(key);

  if (!tileData) {
    return new Response('Tile not found', { status: 404 });
  }

  return new Response(tileData, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    }
  });
}
