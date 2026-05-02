const CACHE_NAME = 'qrcodelecteur-v1';
const ASSETS = [
  '/',
  '/PWA/QRcodeLecteur/',
  '/PWA/QRcodeLecteur/index.html',
  '/PWA/QRcodeLecteur/styles.css',
  '/PWA/QRcodeLecteur/app.js',
  '/PWA/QRcodeLecteur/manifest.json',
  '/PWA/QRcodeLecteur/icon192.png',
  '/PWA/QRcodeLecteur/icon512.png',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// Installation du SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Stratégie : Cache-first pour les assets, Network-first pour le reste
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request).then(cached => 
        cached || fetch(request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
  } else {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

// Gestion des notifications de partage (optionnel)
self.addEventListener('sync', (event) => {
  if (event.tag === 'share-qr') {
    event.waitUntil(handlePendingShare());
  }
});

async function handlePendingShare() {
  // Logique de partage en arrière-plan si nécessaire
  console.log('Tentative de partage en arrière-plan');
}