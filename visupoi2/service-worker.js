// Service worker basique – tu peux le supprimer si tu préfères sans cache
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
