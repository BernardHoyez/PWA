// ╔══════════════════════════════════════════════════════════════╗
// ║  Marando — Service Worker "brise-caches"                     ║
// ║  Stratégie : Network First                                   ║
// ║  → toujours tenter le réseau en premier                      ║
// ║  → cache = filet de secours offline uniquement               ║
// ║  → à chaque nouvelle version : vider tous les vieux caches   ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Incrémenter cette version à chaque déploiement ──────────────
const VERSION = 'marando-v1';

// ── Ressources à pré-cacher au premier install ───────────────────
const PRECACHE = [
  '/PWA/marando/',
  '/PWA/marando/index.html',
  '/PWA/marando/manifest.json',
];

// ── INSTALL : pré-cache minimal, activation immédiate ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => { /* si offline au premier install, on continue quand même */ })
  );
  // Ne pas attendre que l'ancien SW soit libéré
  self.skipWaiting();
});

// ── ACTIVATE : supprimer TOUS les caches d'anciennes versions ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== VERSION)   // tout ce qui n'est pas la version courante
          .map(key => {
            console.log('[SW] Suppression cache périmé :', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Prendre le contrôle de tous les clients immédiatement
  self.clients.claim();
});

// ── FETCH : Network First ────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes non-GET (POST, etc.)
  if (event.request.method !== 'GET') return;

  // Ne pas intercepter les tuiles de carte et APIs tierces
  // (elles ont leurs propres caches HTTP et changent souvent)
  const url = new URL(event.request.url);
  const externe = [
    'tile.openstreetmap.org',
    'data.geopf.fr',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
  ];
  if (externe.some(h => url.hostname.includes(h))) return;

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    // 1. Tenter le réseau
    const response = await fetch(request);

    // 2. Si succès, mettre en cache et retourner
    if (response.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone()); // cloner car la réponse ne peut être lue qu'une fois
    }
    return response;
  } catch {
    // 3. Réseau indisponible → fallback cache
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Offline — servi depuis le cache :', request.url);
      return cached;
    }

    // 4. Rien du tout → page offline générique
    return new Response(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Marando — Hors ligne</title>
      <style>body{font-family:system-ui;background:#0d1a09;color:#b8d4a0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h1{color:#7aad5a}</style>
      </head><body><div><h1>🏔 Marando</h1><p>Vous êtes hors ligne.<br>Reconnectez-vous pour accéder à l'application.</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
