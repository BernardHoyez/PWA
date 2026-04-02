/* ============================================================
   LittoExtract — app.js  (v3 — correctif XYZ/TMS + diagnostics)
   ============================================================ */
'use strict';

// ── Configuration ─────────────────────────────────────────────
const CONFIG = {
  BUFFER_KM:          0.2,
  ZOOM_MIN:           15,
  ZOOM_MAX:           17,
  CONCURRENCY:        4,
  // IGN Géoplateforme TMS — l'axe Y est en convention XYZ (pas inversé)
  // Vérifié via https://data.geopf.fr/tms/1.0.0
  IGN_TMS: 'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
  RETRY_MAX:          2,
  RETRY_DELAY_MS:     600,
  WAYPOINT_KM:        1.0,
};

// ── État ──────────────────────────────────────────────────────
const S = {
  coastline: null,
  buffer:    null,
  tiles:     [],
  tileMap:   new Map(),
  waypoints: [],
  currentWP: 0,
  downloading: false,
  abortCtrl: null,
  SQL: null,
  previewMap: null,
  viewerMap:  null,
};

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// CALCUL DES TUILES  (convention XYZ, axe Y standard)
// data.geopf.fr/tms répond bien en XYZ malgré le préfixe "tms"
// ══════════════════════════════════════════════════════════════

function lngLatToXYZ(lng, lat, z) {
  const n = 1 << z;
  const x = Math.floor((lng + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
  return { x, y };
}

function tileXYZtoBBox(x, y, z) {
  const n = 1 << z;
  const west  =  x      / n * 360 - 180;
  const east  = (x + 1) / n * 360 - 180;
  const north = Math.atan(Math.sinh(Math.PI * (1 - 2 *  y      / n))) * 180 / Math.PI;
  const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return [west, south, east, north];
}

function bboxOverlap(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function tilesForPolygon(polygon, zMin, zMax) {
  const result = [];
  const pbbox = turf.bbox(polygon);

  for (let z = zMin; z <= zMax; z++) {
    const nw = lngLatToXYZ(pbbox[0], pbbox[3], z);
    const se = lngLatToXYZ(pbbox[2], pbbox[1], z);
    const xLo = Math.min(nw.x, se.x), xHi = Math.max(nw.x, se.x);
    const yLo = Math.min(nw.y, se.y), yHi = Math.max(nw.y, se.y);

    for (let x = xLo; x <= xHi; x++) {
      for (let y = yLo; y <= yHi; y++) {
        if (bboxOverlap(pbbox, tileXYZtoBBox(x, y, z)))
          result.push([z, x, y]);
      }
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════════════
function log(msg, type = 'info') {
  const el = $('log-console');
  if (!el) return;
  const t = new Date().toTimeString().slice(0, 8);
  const row = document.createElement('div');
  row.className = `log-entry ${type}`;
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
// CHARGEMENT TRAIT DE CÔTE
// ══════════════════════════════════════════════════════════════
async function loadCoastline() {
  log('Chargement du trait de cote...');
  try {
    const base = location.href.replace(/\/[^/]*(\?.*)?$/, '/');
    const url  = base + 'coastline.geojson';
    const r    = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data?.geometry?.coordinates?.length) throw new Error('GeoJSON invalide');
    S.coastline = data;
    log(`Trait de cote OK — ${data.geometry.coordinates.length} points`, 'success');
    return true;
  } catch (e) {
    log(`Erreur trait de cote : ${e.message}`, 'error');
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// BUFFER & TUILES
// ══════════════════════════════════════════════════════════════
function computeBuffer() {
  if (!S.coastline) return false;
  try {
    S.buffer = turf.buffer(S.coastline, CONFIG.BUFFER_KM, { units: 'kilometers', steps: 8 });
    log(`Buffer +/-${CONFIG.BUFFER_KM * 1000} m calcule`, 'success');
    return true;
  } catch (e) {
    log(`Erreur buffer : ${e.message}`, 'error');
    return false;
  }
}

function computeTiles() {
  if (!S.buffer) return;
  log(`Calcul tuiles Z${CONFIG.ZOOM_MIN}-${CONFIG.ZOOM_MAX}...`);
  S.tiles = tilesForPolygon(S.buffer, CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);

  const bz = { 15: 0, 16: 0, 17: 0 };
  for (const [z] of S.tiles) bz[z] = (bz[z] || 0) + 1;

  $('stat-z15').textContent   = bz[15].toLocaleString();
  $('stat-z16').textContent   = bz[16].toLocaleString();
  $('stat-z17').textContent   = bz[17].toLocaleString();
  $('stat-total').textContent = S.tiles.length.toLocaleString();
  $('stat-size').textContent  = `~${Math.round(S.tiles.length * 25 / 1024)} Mo`;

  const ok = S.tiles.length > 0;
  $('btn-download').disabled = !ok;
  log(`${S.tiles.length} tuiles : Z15=${bz[15]} Z16=${bz[16]} Z17=${bz[17]}`, ok ? 'success' : 'warn');
}

// ══════════════════════════════════════════════════════════════
// WAYPOINTS
// ══════════════════════════════════════════════════════════════
function computeWaypoints() {
  if (!S.coastline) return;
  const len = turf.length(S.coastline, { units: 'kilometers' });
  S.waypoints = [];
  for (let km = 0; km <= len + 0.001; km += CONFIG.WAYPOINT_KM) {
    const c  = Math.min(km, len);
    const pt = turf.along(S.coastline, c, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    const name = c < 0.5 ? 'Le Havre' : c >= len - 0.5 ? 'Etretat' : `km ${c.toFixed(1)}`;
    S.waypoints.push({ lng, lat, km: c, name });
  }
  const sl = $('coast-slider');
  if (sl) { sl.max = S.waypoints.length - 1; sl.value = 0; }
}

// ══════════════════════════════════════════════════════════════
// TEST CONNECTIVITE IGN
// ══════════════════════════════════════════════════════════════
async function probeIGN() {
  // Tuile z15 centrale sur la côte normande
  const url = 'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/15/16490/11736.jpeg';
  log(`Sonde IGN...`);
  try {
    const r = await fetch(url, { cache: 'no-store', mode: 'cors' });
    log(`IGN repond HTTP ${r.status}`, r.ok || r.status === 404 ? 'success' : 'warn');
    return true;
  } catch (e) {
    log(`IGN inaccessible : ${e.message}`, 'error');
    log('Verifiez votre connexion. Les tuiles ne peuvent pas etre telechargees.', 'error');
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT
// ══════════════════════════════════════════════════════════════
async function downloadTiles() {
  if (S.downloading || S.tiles.length === 0) return;

  const ign = await probeIGN();
  if (!ign) { badge('error', 'IGN inaccessible'); return; }

  S.downloading = true;
  S.abortCtrl   = new AbortController();
  S.tileMap.clear();

  $('btn-download').disabled = true;
  $('btn-abort').disabled    = false;
  $('btn-export').disabled   = true;

  const total = S.tiles.length;
  let done = 0, errors = 0, notfound = 0;

  badge('', `0 / ${total}`);
  log(`Debut : ${total} tuiles, ${CONFIG.CONCURRENCY} workers`);

  const queue = [...S.tiles];

  async function worker() {
    while (queue.length > 0) {
      if (S.abortCtrl.signal.aborted) return;
      const tile = queue.shift();
      if (!tile) break;
      const [z, x, y] = tile;
      const url = CONFIG.IGN_TMS
        .replace('{z}', z).replace('{x}', x).replace('{y}', y);

      let ok = false;
      for (let attempt = 0; attempt < CONFIG.RETRY_MAX && !ok; attempt++) {
        try {
          const r = await fetch(url, { signal: S.abortCtrl.signal, cache: 'no-store' });
          if (r.status === 404)      { notfound++; ok = true; break; }
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          S.tileMap.set(`${z}/${x}/${y}`, new Uint8Array(await r.arrayBuffer()));
          ok = true;
        } catch (e) {
          if (e.name === 'AbortError') return;
          if (attempt < CONFIG.RETRY_MAX - 1)
            await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
          else
            errors++;
        }
      }

      done++;
      const pct = Math.round(done / total * 100);
      $('progress-bar').style.width    = `${pct}%`;
      $('progress-pct').textContent    = `${pct}%`;
      $('progress-done').textContent   = `${done.toLocaleString()} / ${total.toLocaleString()}`;
      $('progress-detail').textContent =
        `${S.tileMap.size} recues · ${notfound} absentes · ${errors} erreurs`;
      if (done % 80 === 0)
        badge('', `${pct}% - ${S.tileMap.size} tuiles`);
    }
  }

  await Promise.all(Array.from({ length: CONFIG.CONCURRENCY }, worker));

  S.downloading = false;
  $('btn-abort').disabled    = true;
  $('btn-download').disabled = false;

  if (S.abortCtrl.signal.aborted) {
    log('Telechargement interrompu', 'warn');
    return;
  }

  const n = S.tileMap.size;
  log(`Termine : ${n} tuiles recues, ${notfound} absentes, ${errors} erreurs`,
      n > 0 ? 'success' : 'error');
  badge(n > 0 ? 'ready' : 'error', `${n} tuiles telechargees`);
  $('btn-export').disabled = n === 0;
  if (n > 0) sendTilesToSW();
}

// ══════════════════════════════════════════════════════════════
// EXPORT MBTILES
// ══════════════════════════════════════════════════════════════
async function exportMBTiles() {
  if (S.tileMap.size === 0) { log('Aucune tuile a exporter', 'warn'); return; }
  $('btn-export').disabled = true;
  log('Generation MBTiles...');

  try {
    if (!S.SQL) {
      log('Chargement sql.js...');
      const fn = window.initSqlJs;
      if (!fn) throw new Error('sql.js absent — CDN inaccessible ?');
      S.SQL = await fn({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
      log('sql.js pret', 'success');
    }

    const db = new S.SQL.Database();
    db.run(`
      CREATE TABLE metadata (name TEXT NOT NULL, value TEXT);
      CREATE TABLE tiles (
        zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER,
        tile_data BLOB,
        UNIQUE(zoom_level, tile_column, tile_row)
      );
      CREATE UNIQUE INDEX tile_index ON tiles(zoom_level, tile_column, tile_row);
    `);

    const bbox   = turf.bbox(S.buffer);
    const center = turf.center(S.buffer).geometry.coordinates;
    [
      ['name',     'LittoExtract Le Havre-Etretat'],
      ['format',   'jpeg'],
      ['bounds',   bbox.join(',')],
      ['center',   `${center[0].toFixed(6)},${center[1].toFixed(6)},16`],
      ['minzoom',  String(CONFIG.ZOOM_MIN)],
      ['maxzoom',  String(CONFIG.ZOOM_MAX)],
    ].forEach(([k, v]) => db.run('INSERT INTO metadata VALUES(?,?)', [k, v]));

    const ts      = db.prepare('INSERT OR REPLACE INTO tiles VALUES(?,?,?,?)');
    const entries = [...S.tileMap.entries()];
    const BATCH   = 150;

    for (let i = 0; i < entries.length; i += BATCH) {
      db.run('BEGIN');
      for (const [key, data] of entries.slice(i, i + BATCH)) {
        const [zs, xs, ys] = key.split('/');
        const z = +zs, x = +xs, y = +ys;
        const yTMS = (1 << z) - 1 - y;   // inversion axe Y pour MBTiles
        ts.run([z, x, yTMS, data]);
      }
      db.run('COMMIT');
      const pct = Math.min(100, Math.round((i + BATCH) / entries.length * 100));
      $('progress-bar').style.width    = `${pct}%`;
      $('progress-pct').textContent    = `${pct}%`;
      $('progress-detail').textContent = `Ecriture SQL ${Math.min(i + BATCH, entries.length)}/${entries.length}`;
      await new Promise(r => setTimeout(r, 0));
    }
    ts.free();

    const raw  = db.export();
    db.close();
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([raw], { type: 'application/octet-stream' }));
    a.download = `littoextract_z${CONFIG.ZOOM_MIN}-${CONFIG.ZOOM_MAX}.mbtiles`;
    a.click();
    URL.revokeObjectURL(a.href);
    log(`MBTiles exporte — ${(raw.byteLength / 1048576).toFixed(1)} Mo`, 'success');
  } catch (e) {
    log(`Erreur export : ${e.message}`, 'error');
  }
  $('btn-export').disabled = false;
}

// ══════════════════════════════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════════════════════════════
function sendTilesToSW() {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'LOAD_TILES', payload: [...S.tileMap.entries()]
  });
  log(`${S.tileMap.size} tuiles transmises au SW`);
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) { log('SW non supporte', 'warn'); return; }
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: '/PWA/littoextract/' });
    navigator.serviceWorker.addEventListener('message', ({ data }) => {
      if (data.type === 'TILES_READY') {
        log(`SW : ${data.count} tuiles hors-ligne`, 'success');
        badge('ready', `${data.count} tuiles en cache`);
        if (S.viewerMap) loadViewerTiles();
      }
    });
    log('Service Worker enregistre', 'success');
  } catch (e) {
    log(`SW : ${e.message}`, 'warn');
  }
}

// ══════════════════════════════════════════════════════════════
// CARTE PRÉVISUALISATION
// ══════════════════════════════════════════════════════════════
function initPreviewMap() {
  if (S.previewMap) return;
  S.previewMap = new maplibregl.Map({
    container: 'preview-map',
    style: {
      version: 8,
      sources: {
        plan: {
          type: 'raster',
          tiles: ['https://data.geopf.fr/tms/1.0.0/PLAN.IGN/{z}/{x}/{y}.png'],
          tileSize: 256,
        }
      },
      layers: [{ id: 'base', type: 'raster', source: 'plan' }]
    },
    center: [-0.085, 49.575],
    zoom: 11,
    attributionControl: false,
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
    map.addLayer({ id: 'buf-fill', type: 'fill', source: 'buf-src',
      paint: { 'fill-color': '#00e5ff', 'fill-opacity': 0.15 } });
    map.addLayer({ id: 'buf-line', type: 'line', source: 'buf-src',
      paint: { 'line-color': '#00e5ff', 'line-width': 1.5 } });
  }
  if (S.coastline) {
    map.addSource('coast-src', { type: 'geojson', data: S.coastline });
    map.addLayer({ id: 'coast', type: 'line', source: 'coast-src',
      paint: { 'line-color': '#f5a623', 'line-width': 2 } });
    const bb = turf.bbox(S.coastline);
    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 50 });
  }
}

// ══════════════════════════════════════════════════════════════
// CARTE VISUALISEUR
// ══════════════════════════════════════════════════════════════
function initViewerMap() {
  if (S.viewerMap) return;
  S.viewerMap = new maplibregl.Map({
    container: 'viewer-map',
    style: { version: 8, sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#050d1a' } }] },
    center: [-0.085, 49.575], zoom: 14, attributionControl: false,
  });
}

function loadViewerTiles() {
  const map = S.viewerMap;
  if (!map) return;
  if (map.getSource('mb')) { map.removeLayer('mb-layer'); map.removeSource('mb'); }
  map.addSource('mb', {
    type: 'raster',
    tiles: ['/PWA/littoextract/tiles/{z}/{x}/{y}'],
    tileSize: 256, minzoom: CONFIG.ZOOM_MIN, maxzoom: CONFIG.ZOOM_MAX,
  });
  map.addLayer({ id: 'mb-layer', type: 'raster', source: 'mb' });
  $('viewer-placeholder')?.classList.add('hidden');
  log('Visualiseur actif', 'success');
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
  $('wp-km').textContent   = `${wp.km.toFixed(1)} km`;
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
    if (!S.viewerMap) setTimeout(() => { initViewerMap(); if (S.tileMap.size) loadViewerTiles(); }, 50);
    else if (S.tileMap.size && !S.viewerMap.getSource('mb')) loadViewerTiles();
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  badge('', 'Chargement...');
  log('LittoExtract v3');
  await registerSW();

  const ok = await loadCoastline();
  if (ok) {
    const bufOk = computeBuffer();
    if (bufOk) {
      computeTiles();
      computeWaypoints();
    }
    initPreviewMap();
    badge(S.tiles.length > 0 ? 'ready' : 'error',
          S.tiles.length > 0 ? `${S.tiles.length} tuiles calculees` : 'Calcul tuiles echoue');
  } else {
    badge('error', 'Erreur donnees');
  }

  document.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  $('btn-download').addEventListener('click', downloadTiles);
  $('btn-abort').addEventListener('click', () => S.abortCtrl?.abort());
  $('btn-export').addEventListener('click', exportMBTiles);
  $('btn-load-viewer').addEventListener('click', () => {
    if (S.tileMap.size > 0) {
      sendTilesToSW();
      switchTab('viewer');
      setTimeout(() => { if (S.viewerMap) loadViewerTiles(); goToWaypoint(0); }, 300);
    } else {
      log('Telechargez d\'abord les tuiles', 'warn');
    }
  });
  $('btn-nav-prev').addEventListener('click',  () => goToWaypoint(S.currentWP - 1));
  $('btn-nav-next').addEventListener('click',  () => goToWaypoint(S.currentWP + 1));
  $('btn-nav-start').addEventListener('click', () => goToWaypoint(0));
  $('btn-nav-end').addEventListener('click',   () => goToWaypoint(S.waypoints.length - 1));
  $('coast-slider').addEventListener('input',  e  => goToWaypoint(+e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
