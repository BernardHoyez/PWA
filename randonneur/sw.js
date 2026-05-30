 const VERSION = 'randonneur-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const externe = ['tile.openstreetmap.org','data.geopf.fr','unpkg.com',
                   'fonts.googleapis.com','fonts.gstatic.com','cdnjs.cloudflare.com'];
  if (externe.some(h => url.hostname.includes(h))) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Randonneur — Hors ligne</title>'
      +'<style>body{font-family:system-ui;background:#0d1a09;color:#b8d4a0;display:flex;'
      +'align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}'
      +'h1{color:#7aad5a}</style></head><body><div><h1>🏔 Randonneur</h1>'
      +'<p>Vous êtes hors ligne.<br>Reconnectez-vous pour accéder à l\'application.</p>'
      +'</div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
