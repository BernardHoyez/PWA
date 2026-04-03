/* ============================================================
   LittoExtract — app.js  v4
   Correctifs :
   - Retry robuste avec backoff exponentiel (rate-limiting IGN)
   - Visualiseur 100% en mémoire via CustomProtocol MapLibre
     (plus de Service Worker pour les tuiles → pas de problème de scope)
   ============================================================ */
'use strict';

const CONFIG = {
  BUFFER_KM:    0.2,
  ZOOM_MIN:     15,
  ZOOM_MAX:     17,
  CONCURRENCY:  3,          // Réduit pour respecter le rate-limit IGN
  IGN_TMS:      'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
  RETRY_MAX:    5,           // Plus de tentatives
  RETRY_BASE_MS: 1200,       // Backoff exponentiel : 1.2s, 2.4s, 4.8s...
  WAYPOINT_KM:  1.0,
};

const S = {
  coastline: null, buffer: null,
  tiles: [], tileMap: new Map(),
  waypoints: [], currentWP: 0,
  downloading: false, abortCtrl: null,
  SQL: null, previewMap: null, viewerMap: null,
};

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// GÉOMÉTRIE TUILES
// ══════════════════════════════════════════════════════════════
function lngLatToXYZ(lng, lat, z) {
  const n = 1 << z;
  const x = Math.floor((lng + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
  return { x, y };
}

function tileToBBox(x, y, z) {
  const n = 1 << z;
  return [
    x / n * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI,
    (x + 1) / n * 360 - 180,
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI,
  ];
}

function bboxOverlap(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function tilesForPolygon(polygon, zMin, zMax) {
  const result = [];
  const pb = turf.bbox(polygon);
  for (let z = zMin; z <= zMax; z++) {
    const nw = lngLatToXYZ(pb[0], pb[3], z);
    const se = lngLatToXYZ(pb[2], pb[1], z);
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        if (bboxOverlap(pb, tileToBBox(x, y, z))) result.push([z, x, y]);
      }
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LOG & BADGE
// ══════════════════════════════════════════════════════════════
function log(msg, type = 'info') {
  const el = $('log-console');
  if (!el) return;
  const row = document.createElement('div');
  row.className = `log-entry ${type}`;
  const t = new Date().toTimeString().slice(0, 8);
  row.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span>`;
  el.appendChild(row);
  el.scrollTop = el.scrollHeight;
}
function badge(cls, msg) {
  const dot = document.querySelector('.status-dot');
  const txt = document.querySelector('.status-text');
  if (dot) dot.className = `status-dot ${cls}`;
  if (txt) txt.textContent = msg;
}

// ══════════════════════════════════════════════════════════════
// CHARGEMENT DONNÉES
// ══════════════════════════════════════════════════════════════
async function loadCoastline() {
  log('Chargement du trait de cote...');
  try {
    const base = location.href.replace(/\/[^/?#]*([?#].*)?$/, '/');
    const r = await fetch(base + 'coastline.geojson', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data?.geometry?.coordinates?.length) throw new Error('GeoJSON invalide');
    S.coastline = data;
    log(`Trait de cote : ${data.geometry.coordinates.length} points`, 'success');
    return true;
  } catch (e) {
    log(`Erreur : ${e.message}`, 'error');
    return false;
  }
}

function computeBuffer() {
  try {
    S.buffer = turf.buffer(S.coastline, CONFIG.BUFFER_KM, { units: 'kilometers', steps: 8 });
    log(`Buffer +/-${CONFIG.BUFFER_KM * 1000}m OK`, 'success');
    return true;
  } catch (e) { log(`Buffer : ${e.message}`, 'error'); return false; }
}

function computeTiles() {
  S.tiles = tilesForPolygon(S.buffer, CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);
  const bz = {};
  for (const [z] of S.tiles) bz[z] = (bz[z] || 0) + 1;
  $('stat-z15').textContent   = (bz[15] || 0).toLocaleString();
  $('stat-z16').textContent   = (bz[16] || 0).toLocaleString();
  $('stat-z17').textContent   = (bz[17] || 0).toLocaleString();
  $('stat-total').textContent = S.tiles.length.toLocaleString();
  $('stat-size').textContent  = `~${Math.round(S.tiles.length * 25 / 1024)} Mo`;
  $('btn-download').disabled  = S.tiles.length === 0;
  log(`${S.tiles.length} tuiles : Z15=${bz[15]||0} Z16=${bz[16]||0} Z17=${bz[17]||0}`,
      S.tiles.length > 0 ? 'success' : 'warn');
}

function computeWaypoints() {
  const len = turf.length(S.coastline, { units: 'kilometers' });
  S.waypoints = [];
  for (let km = 0; km <= len + 0.001; km += CONFIG.WAYPOINT_KM) {
    const c  = Math.min(km, len);
    const pt = turf.along(S.coastline, c, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    S.waypoints.push({
      lng, lat, km: c,
      name: c < 0.5 ? 'Le Havre' : c >= len - 0.5 ? 'Etretat' : `km ${c.toFixed(1)}`
    });
  }
  const sl = $('coast-slider');
  if (sl) { sl.max = S.waypoints.length - 1; sl.value = 0; }
}

// ══════════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT — retry avec backoff exponentiel
// ══════════════════════════════════════════════════════════════
async function fetchTileWithRetry(z, x, y, signal) {
  // IGN data.geopf.fr/tms utilise la convention XYZ standard (Y NON inversé)
  const url = CONFIG.IGN_TMS.replace('{z}', z).replace('{x}', x).replace('{y}', y);

  for (let attempt = 0; attempt < CONFIG.RETRY_MAX; attempt++) {
    if (signal.aborted) return { status: 'abort' };

    try {
      const r = await fetch(url, { signal, cache: 'no-store', mode: 'cors' });

      if (r.status === 404) return { status: 'notfound' };
      if (r.status === 429 || r.status === 503) {
        const wait = CONFIG.RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) return { status: 'error', msg: `HTTP ${r.status}` };

      const buf = await r.arrayBuffer();
      return { status: 'ok', data: new Uint8Array(buf) };

    } catch (e) {
      if (e.name === 'AbortError') return { status: 'abort' };
      // Erreur réseau/CORS — logguer la première occurrence pour diagnostic
      if (attempt === 0 && z === CONFIG.ZOOM_MIN) {
        log(`Erreur fetch Z${z}/${x}/${y} : ${e.message}`, 'error');
      }
      if (attempt < CONFIG.RETRY_MAX - 1) {
        await new Promise(res => setTimeout(res, CONFIG.RETRY_BASE_MS * Math.pow(2, attempt)));
      } else {
        return { status: 'error', msg: e.message };
      }
    }
  }
  return { status: 'error', msg: 'max retries' };
}

async function downloadTiles() {
  if (S.downloading || S.tiles.length === 0) return;

  S.downloading = true;
  S.abortCtrl = new AbortController();
  S.tileMap.clear();

  $('btn-download').disabled = true;
  $('btn-abort').disabled    = false;
  $('btn-export').disabled   = true;

  const total = S.tiles.length;
  let done = 0, errors = 0, notfound = 0;

  badge('', `0 / ${total}`);
  log(`Debut : ${total} tuiles, ${CONFIG.CONCURRENCY} workers, retry x${CONFIG.RETRY_MAX}`);

  // ── Test CORS sur une tuile centrale de la zone ──────────
  const midTile = S.tiles[Math.floor(S.tiles.length / 2)];
  const [tz, tx, ty] = midTile;
  // IGN XYZ standard — pas d'inversion Y
  const testUrl = CONFIG.IGN_TMS.replace('{z}', tz).replace('{x}', tx).replace('{y}', ty);
  log(`Test CORS : ${testUrl}`);
  try {
    const probe = await fetch(testUrl, { cache: 'no-store', mode: 'cors' });
    log(`Sonde IGN : HTTP ${probe.status} (${probe.status === 200 ? 'OK' : probe.status === 404 ? 'tuile absente, normal' : 'inattendu'})`, 
        probe.ok || probe.status === 404 ? 'success' : 'warn');
  } catch (e) {
    log(`CORS BLOQUE : ${e.message}`, 'error');
    log('Le navigateur bloque les requetes vers IGN. Verifiez la console (F12).', 'error');
    S.downloading = false;
    $('btn-download').disabled = false;
    $('btn-abort').disabled = true;
    badge('error', 'CORS bloqué');
    return;
  }

  const queue = [...S.tiles];

  async function worker() {
    while (queue.length > 0 && !S.abortCtrl.signal.aborted) {
      const tile = queue.shift();
      if (!tile) break;
      const [z, x, y] = tile;

      const result = await fetchTileWithRetry(z, x, y, S.abortCtrl.signal);
      if (result.status === 'abort' || S.abortCtrl.signal.aborted) return;

      if (result.status === 'ok') {
        S.tileMap.set(`${z}/${x}/${y}`, result.data);
      } else if (result.status === 'notfound') {
        notfound++;
      } else {
        errors++;
        // Logguer les premières erreurs pour diagnostic
        if (errors <= 3) log(`Erreur tuile ${z}/${x}/${y} : ${result.msg}`, 'error');
        if (errors === 3) log('(erreurs supplémentaires masquées)', 'warn');
      }

      done++;
      const pct = Math.round(done / total * 100);
      $('progress-bar').style.width    = `${pct}%`;
      $('progress-pct').textContent    = `${pct}%`;
      $('progress-done').textContent   = `${done.toLocaleString()} / ${total.toLocaleString()}`;
      $('progress-detail').textContent =
        `${S.tileMap.size.toLocaleString()} recues · ${notfound} absentes · ${errors} erreurs`;
      if (done % 100 === 0 || done === total)
        badge('', `${pct}% — ${S.tileMap.size} tuiles`);
    }
  }

  await Promise.all(Array.from({ length: CONFIG.CONCURRENCY }, worker));

  S.downloading = false;
  $('btn-abort').disabled    = true;
  $('btn-download').disabled = false;

  if (S.abortCtrl.signal.aborted) {
    log('Interrompu', 'warn');
    return;
  }

  const n = S.tileMap.size;
  log(`Termine : ${n} recues · ${notfound} absentes · ${errors} erreurs`,
      n > 0 ? 'success' : 'error');
  badge(n > 0 ? 'ready' : 'error', `${n} tuiles telechargees`);
  $('btn-export').disabled = n === 0;

  if (n > 0) {
    log(`Preparatif du visualiseur...`);
    prepareViewerProtocol();
  }
}

// ══════════════════════════════════════════════════════════════
// VISUALISEUR — Protocol personnalisé MapLibre (sans SW)
// MapLibre GL supporte addProtocol() pour servir des tuiles
// directement depuis la mémoire → pas besoin de Service Worker
// ══════════════════════════════════════════════════════════════
let protocolRegistered = false;

function prepareViewerProtocol() {
  if (protocolRegistered) return;
  protocolRegistered = true;

  // MapLibre GL 4.x : addProtocol reçoit une fonction qui retourne une Promise
  // URL format attendu : litto://tiles/{z}/{x}/{y}
  maplibregl.addProtocol('litto', (params) => {
    return new Promise((resolve, reject) => {
      const parts = params.url.replace('litto://tiles/', '').split('/');
      const z = +parts[0], x = +parts[1], y = +parts[2];
      const key = `${z}/${x}/${y}`;
      const data = S.tileMap.get(key);
      if (!data) {
        // Tuile absente : retourner une image transparente 1x1 pour eviter les erreurs MapLibre
        reject(new Error(`Tuile ${key} absente`));
      } else {
        // Copie du buffer pour eviter les problemes de detachement
        resolve({ data: data.buffer.slice(0) });
      }
    });
  });

  log('Protocole visualiseur enregistre (MapLibre 4.x)', 'success');

  // Si le visualiseur est deja ouvert, recharger les tuiles
  if (S.viewerMap?.isStyleLoaded()) loadViewerTiles();
}

// ══════════════════════════════════════════════════════════════
// EXPORT MBTILES
// ══════════════════════════════════════════════════════════════
async function exportMBTiles() {
  if (S.tileMap.size === 0) { log('Aucune tuile', 'warn'); return; }
  $('btn-export').disabled = true;
  log('Generation MBTiles...');

  try {
    if (!S.SQL) {
      const fn = window.initSqlJs;
      if (!fn) throw new Error('sql.js absent du CDN');
      S.SQL = await fn({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
      log('sql.js pret', 'success');
    }

    const db = new S.SQL.Database();
    db.run(`
      CREATE TABLE metadata (name TEXT NOT NULL, value TEXT);
      CREATE TABLE tiles (
        zoom_level  INTEGER NOT NULL,
        tile_column INTEGER NOT NULL,
        tile_row    INTEGER NOT NULL,
        tile_data   BLOB    NOT NULL,
        UNIQUE(zoom_level, tile_column, tile_row)
      );
      CREATE UNIQUE INDEX tile_index ON tiles(zoom_level, tile_column, tile_row);
    `);

    const bbox   = turf.bbox(S.buffer);
    const center = turf.center(S.buffer).geometry.coordinates;
    [
      ['name',        'LittoExtract Le Havre-Etretat'],
      ['description', 'BD ORTHO IGN +/-200m Z15-17'],
      ['format',      'jpeg'],
      ['bounds',      bbox.join(',')],
      ['center',      `${center[0].toFixed(6)},${center[1].toFixed(6)},16`],
      ['minzoom',     String(CONFIG.ZOOM_MIN)],
      ['maxzoom',     String(CONFIG.ZOOM_MAX)],
    ].forEach(([k, v]) => db.run('INSERT INTO metadata VALUES(?,?)', [k, v]));

    const stmt    = db.prepare('INSERT OR REPLACE INTO tiles VALUES(?,?,?,?)');
    const entries = [...S.tileMap.entries()];
    const BATCH   = 200;

    for (let i = 0; i < entries.length; i += BATCH) {
      db.run('BEGIN');
      for (const [key, data] of entries.slice(i, i + BATCH)) {
        const [z, x, y] = key.split('/').map(Number);
        // Inversion Y uniquement pour le fichier MBTiles (convention TMS)
        const yTMS = (1 << z) - 1 - y;
        stmt.run([z, x, yTMS, data]);
      }
      db.run('COMMIT');
      const pct = Math.min(100, Math.round((i + BATCH) / entries.length * 100));
      $('progress-bar').style.width    = `${pct}%`;
      $('progress-pct').textContent    = `${pct}%`;
      $('progress-detail').textContent = `SQL ${Math.min(i + BATCH, entries.length)}/${entries.length}`;
      await new Promise(r => setTimeout(r, 0));
    }
    stmt.free();

    const raw = db.export(); db.close();
    const a   = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([raw], { type: 'application/octet-stream' }));
    a.download = `littoextract_z${CONFIG.ZOOM_MIN}-${CONFIG.ZOOM_MAX}.mbtiles`;
    a.click();
    URL.revokeObjectURL(a.href);
    log(`Exporte : ${(raw.byteLength / 1048576).toFixed(1)} Mo — ${entries.length} tuiles`, 'success');

  } catch (e) {
    log(`Erreur export : ${e.message}`, 'error');
  }
  $('btn-export').disabled = false;
}

// ══════════════════════════════════════════════════════════════
// CARTES
// ══════════════════════════════════════════════════════════════
function initPreviewMap() {
  if (S.previewMap) return;
  S.previewMap = new maplibregl.Map({
    container: 'preview-map',
    style: {
      version: 8,
      sources: { plan: {
        type: 'raster',
        tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'],
        tileSize: 256,
      }},
      layers: [{ id: 'base', type: 'raster', source: 'plan' }]
    },
    center: [-0.085, 49.575], zoom: 11, attributionControl: false,
  });
  S.previewMap.on('load', drawPreviewLayers);
}

function drawPreviewLayers() {
  const map = S.previewMap;
  if (!map?.isStyleLoaded()) return;
  ['buf-fill','buf-line','coast'].forEach(id => map.getLayer(id) && map.removeLayer(id));
  ['buf-src','coast-src'].forEach(id => map.getSource(id) && map.removeSource(id));
  if (S.buffer) {
    map.addSource('buf-src', { type: 'geojson', data: S.buffer });
    map.addLayer({ id: 'buf-fill', type: 'fill',   source: 'buf-src', paint: { 'fill-color': '#00e5ff', 'fill-opacity': 0.15 } });
    map.addLayer({ id: 'buf-line', type: 'line',   source: 'buf-src', paint: { 'line-color': '#00e5ff', 'line-width': 1.5   } });
  }
  if (S.coastline) {
    map.addSource('coast-src', { type: 'geojson', data: S.coastline });
    map.addLayer({ id: 'coast', type: 'line', source: 'coast-src', paint: { 'line-color': '#f5a623', 'line-width': 2 } });
    const bb = turf.bbox(S.coastline);
    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 50 });
  }
}

function initViewerMap() {
  if (S.viewerMap) return;
  S.viewerMap = new maplibregl.Map({
    container: 'viewer-map',
    style: { version: 8, sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#050d1a' } }] },
    center: [-0.085, 49.575], zoom: 14, attributionControl: false,
  });
  S.viewerMap.on('load', () => {
    if (protocolRegistered && S.tileMap.size > 0) loadViewerTiles();
  });
}

function loadViewerTiles() {
  const map = S.viewerMap;
  if (!map?.isStyleLoaded()) return;

  if (map.getLayer('ortho-layer')) map.removeLayer('ortho-layer');
  if (map.getSource('ortho'))      map.removeSource('ortho');

  // Source utilisant le protocole personnalisé litto://
  map.addSource('ortho', {
    type: 'raster',
    tiles: ['litto://tiles/{z}/{x}/{y}'],
    tileSize: 256,
    minzoom: CONFIG.ZOOM_MIN,
    maxzoom: CONFIG.ZOOM_MAX,
  });
  map.addLayer({ id: 'ortho-layer', type: 'raster', source: 'ortho' });

  $('viewer-placeholder')?.classList.add('hidden');
  log(`Visualiseur : ${S.tileMap.size} tuiles disponibles`, 'success');
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function goToWaypoint(idx) {
  if (!S.waypoints.length) return;
  idx = Math.max(0, Math.min(idx, S.waypoints.length - 1));
  S.currentWP = idx;
  const wp = S.waypoints[idx];
  S.viewerMap?.flyTo({ center: [wp.lng, wp.lat], zoom: 16, speed: 0.8 });
  $('coast-slider').value  = idx;
  $('wp-name').textContent = wp.name;
  $('wp-km').textContent   = `${wp.km.toFixed(1)} km depuis Le Havre`;
}

// ══════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === `panel-${tab}`));

  if (tab === 'extract' && !S.previewMap) setTimeout(initPreviewMap, 50);
  if (tab === 'viewer') {
    if (!S.viewerMap) {
      setTimeout(() => {
        initViewerMap();
        if (protocolRegistered && S.tileMap.size > 0)
          S.viewerMap.on('load', loadViewerTiles);
      }, 50);
    } else if (protocolRegistered && S.tileMap.size > 0 && !S.viewerMap.getSource('ortho')) {
      loadViewerTiles();
    }
  }
}

// ══════════════════════════════════════════════════════════════
// SW (cache app shell uniquement — plus utilisé pour les tuiles)
// ══════════════════════════════════════════════════════════════
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: '/PWA/littoextract/' });
    log('Service Worker (cache app) enregistre', 'success');
  } catch (e) {
    log(`SW : ${e.message}`, 'warn');
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  badge('', 'Chargement...');
  log('LittoExtract v4');
  await registerSW();

  const ok = await loadCoastline();
  if (ok && computeBuffer()) {
    computeTiles();
    computeWaypoints();
    initPreviewMap();
    badge(S.tiles.length > 0 ? 'ready' : 'error',
          S.tiles.length > 0 ? `${S.tiles.length} tuiles calculees` : 'Erreur calcul');
  } else {
    badge('error', 'Erreur donnees');
  }

  document.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  $('btn-download').addEventListener('click', downloadTiles);
  $('btn-abort').addEventListener('click', () => S.abortCtrl?.abort());
  $('btn-export').addEventListener('click', exportMBTiles);

  $('btn-load-viewer').addEventListener('click', () => {
    if (S.tileMap.size === 0) {
      log('Telechargez d\'abord les tuiles', 'warn');
      return;
    }
    switchTab('viewer');
    setTimeout(() => {
      if (!S.viewerMap) initViewerMap();
      setTimeout(() => { loadViewerTiles(); goToWaypoint(0); }, 200);
    }, 50);
  });

  $('btn-nav-prev').addEventListener('click',  () => goToWaypoint(S.currentWP - 1));
  $('btn-nav-next').addEventListener('click',  () => goToWaypoint(S.currentWP + 1));
  $('btn-nav-start').addEventListener('click', () => goToWaypoint(0));
  $('btn-nav-end').addEventListener('click',   () => goToWaypoint(S.waypoints.length - 1));
  $('coast-slider').addEventListener('input',  e  => goToWaypoint(+e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
