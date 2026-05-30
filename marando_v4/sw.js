// ╔══════════════════════════════════════════════════════════════╗
// ║  Marando v4 — Service Worker "brise-caches"                  ║
// ║  Stratégie : Network First                                   ║
// ║  → toujours tenter le réseau en premier                      ║
// ║  → cache = filet de secours offline uniquement               ║
// ║  → à chaque nouvelle version : vider tous les vieux caches   ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Incrémenter cette version à chaque déploiement ──────────────
const VERSION = 'marando-v4';

// ── Ressources à pré-cacher au premier install ───────────────────
const PRECACHE = [
  '/PWA/marando_v4/',
  '/PWA/marando_v4/index.html',
  '/PWA/marando_v4/manifest.json',
];

// ── INSTALL : pré-cache minimal, activation immédiate ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => { /* si offline au premier install, on continue quand même */ })
  );
  self.skipWaiting();
});

// ── ACTIVATE : supprimer TOUS les caches d'anciennes versions ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== VERSION)
          .map(key => {
            console.log('[SW] Suppression cache périmé :', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH : Network First ────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

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
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Offline — servi depuis le cache :', request.url);
      return cached;
    }
    return new Response(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Marando — Hors ligne</title>
      <style>body{font-family:system-ui;background:#0d1a09;color:#b8d4a0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h1{color:#7aad5a}</style>
      </head><body><div><h1>🏔 Marando</h1><p>Vous êtes hors ligne.<br>Reconnectez-vous pour accéder à l'application.</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
