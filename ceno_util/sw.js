/* ============================================================
   cenoutil — Service Worker
   Déploiement : BernardHoyez.github.io/PWA/ceno_util

   Stratégie :
   - Assets app (JS/CSS/HTML/JSON) : Network-first avec fallback cache
     → toujours la version la plus récente si réseau disponible
     → fonctionne hors-ligne avec la dernière version connue
   - Photos                        : Cache-first avec mise à jour réseau
     → chargement rapide sur terrain, mise à jour en arrière-plan
   - Mise à jour                   : automatique dès qu'un nouveau SW
     est détecté, sans attendre la fermeture de l'onglet
   ============================================================ */

const VERSION    = 'ceno_util-v2';
const BASE       = '/PWA/ceno_util';
const CACHE_APP  = `${VERSION}-app`;    /* assets critiques */
const CACHE_IMG  = `${VERSION}-img`;    /* photos */
const ALL_CACHES = [CACHE_APP, CACHE_IMG];

/* Assets critiques — mis en cache à l'installation */
const APP_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/css/style.css`,
  `${BASE}/js/app.js`,
  `${BASE}/js/carte.js`,
  `${BASE}/js/fossiles.js`,
  `${BASE}/js/infos.js`,
  `${BASE}/js/mbtiles.js`,
  `${BASE}/data/markers.json`,
  `${BASE}/data/observations.json`,
  `${BASE}/data/fossiles.json`,
  `${BASE}/data/pages.json`,
  `${BASE}/icons/icon192.png`,
  `${BASE}/icons/icon512.png`,
  /* map.mbtiles est téléchargé dynamiquement par mbtiles.js, pas pré-caché ici */
];

/* ── INSTALLATION ─────────────────────────────────────────
   Pré-cache les assets critiques.
   skipWaiting() : le nouveau SW prend le contrôle immédiatement,
   sans attendre la fermeture des onglets ouverts.
   ───────────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_APP)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => {
        console.log(`[SW ${VERSION}] installé`);
        return self.skipWaiting();   /* ← prise de contrôle immédiate */
      })
      .catch(err => console.error('[SW] install échoué :', err))
  );
});

/* ── ACTIVATION ───────────────────────────────────────────
   Supprime TOUS les anciens caches (toute version antérieure).
   clients.claim() : prend le contrôle des onglets déjà ouverts
   sans rechargement manuel.
   ───────────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k))   /* supprimer tout ce qui n'est pas la version courante */
          .map(k => {
            console.log(`[SW] suppression ancien cache : ${k}`);
            return caches.delete(k);
          })
      ))
      .then(() => {
        console.log(`[SW ${VERSION}] actif`);
        return self.clients.claim();   /* ← contrôle immédiat des onglets */
      })
  );
});

/* ── FETCH ────────────────────────────────────────────────
   Deux stratégies selon la nature de la ressource.
   ───────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  /* Ignorer les requêtes hors scope (CDN Leaflet, sql.js…) */
  if (!url.includes(BASE) && !url.startsWith(self.location.origin)) return;

  /* Photos → Cache-first + mise à jour silencieuse en arrière-plan */
  if (url.includes('/photos/')) {
    event.respondWith(_cacheFirstWithRefresh(event.request));
    return;
  }

  /* Assets critiques → Network-first avec fallback cache */
  event.respondWith(_networkFirstWithCache(event.request));
});

/* ── Stratégie Network-first ──────────────────────────────
   1. Tente le réseau (délai max 4 s)
   2. Si succès → met à jour le cache et retourne la réponse fraîche
   3. Si échec réseau → retourne le cache si disponible
   4. Si pas de cache → réponse vide (évite l'erreur blanche)
   ───────────────────────────────────────────────────────── */
async function _networkFirstWithCache(request) {
  try {
    const networkResponse = await _fetchWithTimeout(request, 4000);

    if (networkResponse && networkResponse.ok) {
      /* Mettre à jour le cache en arrière-plan */
      const cache = await caches.open(CACHE_APP);
      cache.put(request, networkResponse.clone()).catch(() => {});
      return networkResponse;
    }

    /* Réponse réseau non-ok → fallback cache */
    throw new Error(`HTTP ${networkResponse?.status}`);

  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    /* Rien en cache non plus — retourner une réponse vide exploitable */
    if (request.destination === 'document') {
      const rootCache = await caches.match(`${BASE}/index.html`);
      if (rootCache) return rootCache;
    }
    return new Response('', { status: 503, statusText: 'Hors ligne' });
  }
}

/* ── Stratégie Cache-first + refresh silencieux ───────────
   1. Retourne immédiatement le cache si présent (rapide sur terrain)
   2. En parallèle, tente de rafraîchir depuis le réseau
   3. Si pas en cache → tente le réseau directement
   ───────────────────────────────────────────────────────── */
async function _cacheFirstWithRefresh(request) {
  const cache  = await caches.open(CACHE_IMG);
  const cached = await cache.match(request);

  /* Refresh silencieux en arrière-plan si en cache */
  const fetchAndUpdate = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  /* Retourner le cache immédiatement, ou attendre le réseau */
  return cached || fetchAndUpdate || new Response('', { status: 404 });
}

/* ── fetch avec timeout ───────────────────────────────────
   Évite de bloquer indéfiniment si le réseau est très lent.
   ───────────────────────────────────────────────────────── */
function _fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/* ── Message depuis l'app ─────────────────────────────────
   Permet à l'app d'envoyer des commandes au SW.
   Ex : forcer le rechargement, vider le cache image.
   ───────────────────────────────────────────────────────── */
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {

    /* Vider uniquement le cache des photos */
    case 'CLEAR_IMG_CACHE':
      caches.delete(CACHE_IMG).then(() => {
        event.ports[0]?.postMessage({ ok: true });
        console.log('[SW] cache photos vidé');
      });
      break;

    /* Forcer la mise à jour complète */
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});
