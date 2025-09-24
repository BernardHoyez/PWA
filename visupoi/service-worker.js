/* Service worker simple :
 - met en cache les ressources de l'app
 - intercepte /media/* et sert le blob depuis IndexedDB (magasin 'media')
*/

const CACHE_NAME = 'visupoi-cache-v1';
const ASSETS = [
  '/',
  '/visupoi/',
  '/visupoi/index.html',
  '/visupoi/manifest.json',
  '/visupoi/service-worker.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event=>{
  event.waitUntil(self.clients.claim());
});

// minimal indexedDB access in service worker to read 'media'
function swOpenDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open('visupoi-db');
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
    req.onupgradeneeded = ()=>{
      // if not present, create store (shouldn't happen normally)
      const db = req.result;
      if(!db.objectStoreNames.contains('media')) db.createObjectStore('media');
    }
  });
}
function swGetMedia(key){
  return swOpenDB().then(db=>new Promise((res,rej)=>{
    const tx = db.transaction('media','readonly');
    const st = tx.objectStore('media');
    const r = st.get(key);
    r.onsuccess = ()=>res(r.result);
    r.onerror = ()=>rej(r.error);
  }));
}

self.addEventListener('fetch', event=>{
  const url = new URL(event.request.url);
  // handle media routes /media/<key>
  if(url.pathname.startsWith('/visupoi/media/') || url.pathname.startsWith('/media/')){
    // extract key after /media/
    const parts = url.pathname.split('/');
    const idx = parts.indexOf('media');
    const key = parts.slice(idx+1).join('/');
    event.respondWith(swGetMedia(key).then(rec=>{
      if(rec && rec.blob){
        return new Response(rec.blob, {headers: {'Content-Type': rec.type || 'application/octet-stream'}});
      }
      return fetch(event.request);
    }).catch(()=>fetch(event.request)));
    return;
  }
  // else serve from cache falling back to network
  event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)));
});
