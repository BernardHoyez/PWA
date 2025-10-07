const CACHE = 'modifpoi-v1';
const FILES = [
  '/PWA/modifpoi/',
  '/PWA/modifpoi/index.html',
  '/PWA/modifpoi/style.css',
  '/PWA/modifpoi/app.js',
  '/PWA/modifpoi/manifest.json'
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', evt => evt.waitUntil(self.clients.claim()));
self.addEventListener('fetch', evt => {
  const req = evt.request;
  if (req.method !== 'GET') return;
  evt.respondWith(caches.match(req).then(r => r || fetch(req).catch(()=>caches.match('/PWA/modifpoi/'))));
});