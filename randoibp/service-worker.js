const CACHE = 'randoibp-v1';

const ASSETS = [
  '/PWA/randoibp/',
  '/PWA/randoibp/index.html',
  '/PWA/randoibp/style.css',
  '/PWA/randoibp/main.js',
  '/PWA/randoibp/manifest.webmanifest',
  '/PWA/randoibp/icon192.png',
  '/PWA/randoibp/icon512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
