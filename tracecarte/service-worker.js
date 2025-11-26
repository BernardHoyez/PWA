self.addEventListener("install",e=>{
 e.waitUntil(caches.open("tracecache").then(c=>c.addAll([
   "./","./index.html","./style.css","./app.js","./manifest.webmanifest"
 ])));
});
self.addEventListener("fetch",e=>{
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
