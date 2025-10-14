const CACHE_NAME='visumb-fsa-v1';
const CORE_ASSETS=[
  '/PWA/visumb/',
  '/PWA/visumb/index.html',
  '/PWA/visumb/styles.css',
  '/PWA/visumb/app.js',
  '/PWA/visumb/manifest.json',
  '/PWA/visumb/icon-192.png',
  '/PWA/visumb/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});