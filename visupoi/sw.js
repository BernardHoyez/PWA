// sw.js – version simplifiée, tolère les fichiers manquants
const CACHE_NAME = 'visupoi-shell-v3';
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
  // on enlève les icônes pour éviter les 404
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Utilise add() au lieu de addAll() et ignore les erreurs
      return Promise.all(
        OFFLINE_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('Skip cache for', url, err);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
