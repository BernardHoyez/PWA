const CACHE_NAME = 'matrace2-v2';
const urlsToCache = [
  '/PWA/matrace2/',
  '/PWA/matrace2/index.html',
  '/PWA/matrace2/style.css',
  '/PWA/matrace2/app.js',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Si la requête est une tuile IGN, vérifier d'abord dans IndexedDB
  if (url.pathname.includes('wmts') && url.hostname === 'data.geopf.fr') {
    event.respondWith(
      getTileFromCache(event.request).then((cachedTile) => {
        if (cachedTile) {
          return new Response(cachedTile, {
            headers: { 'Content-Type': 'image/png' }
          });
        } else {
          return fetch(event.request).then((response) => {
            if (!response.ok) {
              throw new Error('Erreur de téléchargement de la tuile');
            }
            return response;
          }).catch(() => {
            return new Response('', { status: 204 });
          });
        }
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});

// Fonction pour récupérer une tuile depuis IndexedDB
async function getTileFromCache(request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  const z = parseInt(params.get('TILEMATRIX'));
  const y = parseInt(params.get('TILEROW'));
  const x = parseInt(params.get('TILECOL'));

  return new Promise((resolve) => {
    const dbName = 'matrace2MBTilesDB';
    const storeName = 'tiles';

    const openRequest = indexedDB.open(dbName, 1);

    openRequest.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const tileId = `${z}/${x}/${y}`;
      const getRequest = store.get(tileId);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.blob);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => resolve(null);
    };

    openRequest.onerror = () => resolve(null);
  });
}
