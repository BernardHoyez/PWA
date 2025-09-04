
// A simple, no-op service worker that satisfies PWA installability requirements.
// You can extend this to cache assets for offline use.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Force the waiting service worker to become the active service worker.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A basic network-first strategy.
  event.respondWith(
    fetch(event.request).catch(() => {
      // You can return a fallback offline page here if you have one cached.
      // For this app, we'll just let the fetch fail.
    })
  );
});