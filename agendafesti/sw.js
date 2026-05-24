const CACHE_NAME = 'agendafesti-brise-cache-v4';

// 1. À l'installation, on force le Service Worker à s'activer immédiatement
self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('⚡ SW Brise-Cache : Installé et prêt à écraser l\'ancien.');
});

// 2. À l'activation, on détruit ABSOLUMENT tous les anciens caches existants
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log(`🗑️ SW Brise-Cache : Nettoyage du vieux cache [${key}]`);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiat des pages ouvertes
  );
});

// 3. Stratégie "Network-Only" avec contournement du cache du navigateur (Cache-Busting)
self.addEventListener('fetch', (e) => {
  // On ne gère que les requêtes de notre propre site (évite de casser les API externes comme le proxy)
  if (e.request.url.includes(self.location.origin)) {
    
    // On recrée une requête identique mais en modifiant ses options pour interdire le cache
    const modificationRequete = new Request(e.request, {
      cache: 'reload' // Force le navigateur à aller chercher sur GitHub Pages sans utiliser son propre cache
    });

    e.respondWith(
      fetch(modificationRequete).catch(() => {
        // En cas de panne réseau totale, on tente un secours vide pour éviter le crash
        return new Response('<p>Mode hors-ligne indisponible avec le brise-cache.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
  } else {
    // Pour les requêtes externes (AllOrigins, icônes, etc.), on laisse passer normalement
    e.respondWith(fetch(e.request));
  }
});