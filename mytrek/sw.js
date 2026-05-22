// Changement complet de nom pour forcer le navigateur à oublier l'ancien système
const CACHE_NAME = 'mytrek-cache-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Installation : Mise en cache initiale douce
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation : Nettoyage agressif de TOUS les anciens caches (y compris mesrandos)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // On supprime TOUT ce qui n'est pas le cache mytrek-cache-v1 actuel
          if (key !== CACHE_NAME) {
            console.log('[mytrek SW] Suppression ancien cache détecté:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie "Réseau d'abord" pour le développement et les mises à jour fluides
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Si on travaille en local, on désactive complètement le cache pour voir les modifs en direct
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // Secours hors-ligne
  );
});