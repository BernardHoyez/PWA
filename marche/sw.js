// sw.js — Service Worker
// Ajout : gestion d'un message 'cleanup-tiles' qui liste le cache 'marche-tiles-v1' et purge les dalles
// trop anciennes (par header Date) et/ou au-delà d'un seuil maxTiles.

const APP_CACHE = 'marche-app-v2';
const TILE_CACHE = 'marche-tiles-v1';
const APP_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.webmanifest',
  '/icon192.png',
  '/icon512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// fetch handler (cache-first for app shell, tile caching for images)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.destination === 'image' || url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)$/)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.status === 200) {
            // clone and store
            cache.put(event.request, resp.clone()).catch(()=>{});
          }
          return resp;
        } catch (err) {
          return caches.match('/index.html');
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

// utility: parse Date header if any
function parseResponseDate(resp){
  try {
    if (!resp || !resp.headers) return 0;
    const date = resp.headers.get('date') || resp.headers.get('Date');
    if (date) {
      const t = Date.parse(date);
      if (!isNaN(t)) return t;
    }
  } catch(e){}
  return 0;
}

// cleanup logic: remove tiles older than olderThanDays first, then reduce to maxTiles by removing oldest
async function cleanupTiles(maxTiles = 12000, olderThanDays = 7){
  try {
    const cache = await caches.open(TILE_CACHE);
    const requests = await cache.keys();
    if (!requests || requests.length === 0) return {removed:0, total:0};
    const entries = [];
    for (const req of requests){
      try {
        const resp = await cache.match(req);
        const ts = parseResponseDate(resp) || 0;
        entries.push({req, ts});
      } catch(e){
        entries.push({req, ts:0});
      }
    }
    // compute cutoff timestamp
    const cutoff = Date.now() - (olderThanDays*24*3600*1000);
    // sort by timestamp ascending (oldest first)
    entries.sort((a,b) => (a.ts||0) - (b.ts||0));
    let removed = 0;

    // First remove entries older than cutoff
    for (let i=0;i<entries.length && entries.length - removed > maxTiles; i++){
      const e = entries[i];
      if ((e.ts || 0) > 0 && e.ts < cutoff){
        await cache.delete(e.req).catch(()=>{});
        removed++;
      }
    }

    // Recompute list after first pass
    const remaining = await cache.keys();
    if (remaining.length > maxTiles){
      // Build remaining entries with dates
      const remEntries = [];
      for (const req of remaining){
        const resp = await cache.match(req);
        const ts = parseResponseDate(resp) || 0;
        remEntries.push({req, ts});
      }
      // sort oldest first and delete until <= maxTiles
      remEntries.sort((a,b)=> (a.ts||0) - (b.ts||0));
      let idx = 0;
      while (remEntries.length - removed > maxTiles && idx < remEntries.length){
        const e = remEntries[idx];
        await cache.delete(e.req).catch(()=>{});
        removed++;
        idx++;
      }
    }

    return {removed, totalBefore: requests.length};
  } catch(e){
    console.error('cleanupTiles error', e);
    return {removed:0, error: e && e.message};
  }
}

// message handler to accept cleanup request from clients
self.addEventListener('message', (event) => {
  try {
    const data = event.data;
    if (!data || !data.type) return;
    if (data.type === 'cleanup-tiles') {
      const maxTiles = parseInt(data.maxTiles) || 12000;
      const olderThanDays = parseInt(data.olderThanDays) || 7;
      event.waitUntil((async () => {
        const res = await cleanupTiles(maxTiles, olderThanDays);
        // notify clients that cleanup finished
        const clientsList = await self.clients.matchAll({includeUncontrolled:true});
        for (const c of clientsList){
          c.postMessage({ type:'cleanup-done', result: res });
        }
      })());
    }
  } catch(e){
    console.warn('SW message handler error', e);
  }
});