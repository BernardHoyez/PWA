/* ============================================================
   LittoExtract — app.js
   Extraction de tuiles BD ORTHO IGN + génération MBTiles
   Visualiseur hors-ligne via Service Worker
   ============================================================ */

'use strict';

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  BUFFER_KM:    0.2,          // 200 m de part et d'autre du trait de côte
  ZOOM_MIN:     15,
  ZOOM_MAX:     17,
  CONCURRENCY:  6,            // Requêtes parallèles max
  IGN_TMS:      'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
  RETRY_MAX:    3,
  RETRY_DELAY:  800,          // ms
  WAYPOINT_INTERVAL: 1.0,     // km entre chaque waypoint de navigation
};

// ── État global ───────────────────────────────────────────────
const state = {
  coastline:    null,   // GeoJSON Feature (LineString)
  buffer:       null,   // GeoJSON Feature (Polygon)
  tiles:        [],     // [[z,x,y], ...]
  tileCount:    0,
  downloading:  false,
  abortCtrl:    null,
  tileMap:      new Map(), // z/x/y → Uint8Array
  mbtiles:      null,      // Uint8Array final
  waypoints:    [],         // [{lng, lat, km, name}]
  currentWP:    0,
  previewMap:   null,
  viewerMap:    null,
  swReady:      false,
  SQL:          null,
};

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Utilitaires tuiles XYZ ────────────────────────────────────
function lngLatToTile(lng, lat, z) {
  const n = Math.pow(2, z);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return [x, y];
}

function tileToBbox(x, y, z) {
  const n = Math.pow(2, z);
  const west  = x / n * 360 - 180;
  const east  = (x + 1) / n * 360 - 180;
  const nLat  = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const sLat  = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return [west, sLat, east, nLat]; // [minLng, minLat, maxLng, maxLat]
}

// Obtenir toutes les tuiles qui intersectent un polygone GeoJSON
function getTilesForPolygon(polygon, zMin, zMax) {
  const tiles = [];
  const bbox = turf.bbox(polygon);

  for (let z = zMin; z <= zMax; z++) {
    const [xMin, yMax2] = lngLatToTile(bbox[0], bbox[3], z); // NW
    const [xMax, yMin2] = lngLatToTile(bbox[2], bbox[1], z); // SE

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin2; y <= yMax2; y++) {
        // Test d'intersection avec le polygone buffer
        const tBbox = tileToBbox(x, y, z);
        const tileBox = turf.bboxPolygon(tBbox);
        if (turf.booleanIntersects(tileBox, polygon)) {
          tiles.push([z, x, y]);
        }
      }
    }
  }
  return tiles;
}

// ── Logging ───────────────────────────────────────────────────
function log(msg, type = 'info') {
  const console = $('log-console');
  if (!console) return;
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${msg}</span>`;
  console.appendChild(entry);
  console.scrollTop = console.scrollHeight;
}

// ── Chargement du trait de côte ───────────────────────────────
async function loadCoastline() {
  log('Chargement du trait de côte…');
  try {
    const resp = await fetch('./coastline.geojson');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.coastline = data;
    log(`Trait de côte chargé — ${data.geometry.coordinates.length} points`, 'success');
    return true;
  } catch (e) {
    log(`Erreur chargement trait de côte : ${e.message}`, 'error');
    return false;
  }
}

// ── Calcul du buffer ──────────────────────────────────────────
function computeBuffer() {
  if (!state.coastline) return false;
  try {
    state.buffer = turf.buffer(state.coastline, CONFIG.BUFFER_KM, { units: 'kilometers', steps: 8 });
    log(`Buffer ±${CONFIG.BUFFER_KM * 1000} m calculé`, 'success');
    return true;
  } catch (e) {
    log(`Erreur calcul buffer : ${e.message}`, 'error');
    return false;
  }
}

// ── Calcul des tuiles ─────────────────────────────────────────
function computeTiles() {
  if (!state.buffer) return;
  log(`Calcul des tuiles (zoom ${CONFIG.ZOOM_MIN}–${CONFIG.ZOOM_MAX})…`);
  state.tiles = getTilesForPolygon(state.buffer, CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);
  state.tileCount = state.tiles.length;

  const byZoom = {};
  for (const [z] of state.tiles) {
    byZoom[z] = (byZoom[z] || 0) + 1;
  }

  updateTileStats(byZoom);
  log(`${state.tileCount} tuiles calculées — Z15:${byZoom[15]||0} Z16:${byZoom[16]||0} Z17:${byZoom[17]||0}`, 'success');
}

function updateTileStats(byZoom) {
  $('stat-z15').textContent = (byZoom[15] || 0).toLocaleString();
  $('stat-z16').textContent = (byZoom[16] || 0).toLocaleString();
  $('stat-z17').textContent = (byZoom[17] || 0).toLocaleString();
  $('stat-total').textContent = state.tileCount.toLocaleString();

  const estMb = Math.round(state.tileCount * 25 / 1024); // ~25 Ko/tuile
  $('stat-size').textContent = `~${estMb} Mo`;

  $('btn-download').disabled = state.tileCount === 0;
}

// ── Waypoints de navigation côtière ──────────────────────────
function computeWaypoints() {
  if (!state.coastline) return;
  const line = state.coastline;
  const total = turf.length(line, { units: 'kilometers' });
  const waypoints = [];

  const step = CONFIG.WAYPOINT_INTERVAL;
  for (let km = 0; km <= total; km += step) {
    const pt = turf.along(line, km, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    let name = `km ${km.toFixed(1)}`;
    if (km < 0.5) name = 'Le Havre';
    else if (km > total - 0.5) name = 'Étretat';
    waypoints.push({ lng, lat, km: parseFloat(km.toFixed(2)), name, total });
  }

  state.waypoints = waypoints;
  // Configurer le slider
  const slider = $('coast-slider');
  if (slider) {
    slider.max = waypoints.length - 1;
    slider.value = 0;
  }
}

// ── Téléchargement des tuiles ─────────────────────────────────
async function downloadTiles() {
  if (state.downloading || state.tileCount === 0) return;

  state.downloading = true;
  state.abortCtrl = new AbortController();
  state.tileMap.clear();

  $('btn-download').disabled = true;
  $('btn-abort').disabled = false;
  $('btn-export').disabled = true;

  const total = state.tileCount;
  let done = 0;
  let errors = 0;

  log(`Démarrage — ${total} tuiles, ${CONFIG.CONCURRENCY} connexions simultanées`);

  const queue = [...state.tiles];

  async function worker() {
    while (queue.length > 0 && !state.abortCtrl.signal.aborted) {
      const tile = queue.shift();
      if (!tile) break;
      const [z, x, y] = tile;

      for (let attempt = 0; attempt < CONFIG.RETRY_MAX; attempt++) {
        try {
          const url = CONFIG.IGN_TMS
            .replace('{z}', z).replace('{x}', x).replace('{y}', y);
          const resp = await fetch(url, { signal: state.abortCtrl.signal });

          if (resp.status === 404) {
            // Tuile absente — normal pour certaines zones
            break;
          }

          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          const buf = await resp.arrayBuffer();
          state.tileMap.set(`${z}/${x}/${y}`, new Uint8Array(buf));
          break;

        } catch (e) {
          if (e.name === 'AbortError') return;
          if (attempt === CONFIG.RETRY_MAX - 1) {
            errors++;
          } else {
            await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY));
          }
        }
      }

      done++;
      const pct = Math.round(done / total * 100);
      updateProgress(pct, done, total, errors);
    }
  }

  // Lancer N workers en parallèle
  const workers = Array.from({ length: CONFIG.CONCURRENCY }, () => worker());
  await Promise.all(workers);

  state.downloading = false;
  $('btn-abort').disabled = true;

  if (state.abortCtrl.signal.aborted) {
    log('Téléchargement interrompu', 'warn');
    $('btn-download').disabled = false;
    return;
  }

  const retrieved = state.tileMap.size;
  log(`Téléchargement terminé — ${retrieved} tuiles récupérées, ${errors} erreurs`, errors > 0 ? 'warn' : 'success');
  $('btn-export').disabled = false;

  // Envoyer au Service Worker pour le visualiseur
  sendTilesToSW();
}

function updateProgress(pct, done, total, errors) {
  $('progress-bar').style.width = `${pct}%`;
  $('progress-pct').textContent = `${pct}%`;
  $('progress-done').textContent = `${done.toLocaleString()} / ${total.toLocaleString()}`;
  $('progress-detail').textContent =
    `${state.tileMap.size.toLocaleString()} tuiles reçues${errors > 0 ? ` · ${errors} erreurs` : ''}`;
}

// ── Génération du fichier MBTiles ─────────────────────────────
async function exportMBTiles() {
  if (state.tileMap.size === 0) {
    log('Aucune tuile à exporter', 'warn');
    return;
  }

  $('btn-export').disabled = true;
  log('Génération du fichier MBTiles…');

  try {
    // Charger sql.js si pas encore fait
    if (!state.SQL) {
      log('Initialisation de sql.js (WASM)…');
      state.SQL = await initSqlJs({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
    }

    const db = new state.SQL.Database();

    // Schéma MBTiles standard
    db.run(`
      CREATE TABLE metadata (name TEXT NOT NULL, value TEXT);
      CREATE TABLE tiles (
        zoom_level  INTEGER NOT NULL,
        tile_column INTEGER NOT NULL,
        tile_row    INTEGER NOT NULL,
        tile_data   BLOB    NOT NULL,
        UNIQUE (zoom_level, tile_column, tile_row)
      );
      CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);
    `);

    // Métadonnées
    const bbox = turf.bbox(state.buffer);
    const center = turf.center(state.buffer);
    const [cLng, cLat] = center.geometry.coordinates;

    const meta = [
      ['name', 'LittoExtract — Côte d\'Albâtre Le Havre–Étretat'],
      ['type', 'overlay'],
      ['version', '1.0'],
      ['description', 'BD ORTHO IGN — bande littorale 200 m — zooms 15-17'],
      ['format', 'jpeg'],
      ['bounds', bbox.join(',')],
      ['center', `${cLng.toFixed(6)},${cLat.toFixed(6)},16`],
      ['minzoom', String(CONFIG.ZOOM_MIN)],
      ['maxzoom', String(CONFIG.ZOOM_MAX)],
    ];

    const metaStmt = db.prepare('INSERT INTO metadata (name, value) VALUES (?, ?)');
    for (const [k, v] of meta) {
      metaStmt.run([k, v]);
    }
    metaStmt.free();

    // Insertion des tuiles en transactions groupées
    const INSERT_BATCH = 200;
    const entries = [...state.tileMap.entries()];
    const tileStmt = db.prepare(
      'INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)'
    );

    for (let i = 0; i < entries.length; i += INSERT_BATCH) {
      db.run('BEGIN');
      const batch = entries.slice(i, i + INSERT_BATCH);
      for (const [key, data] of batch) {
        const [z, x, yStr] = key.split('/').map(Number);
        // MBTiles : inversion de l'axe Y (convention TMS)
        const yTMS = (Math.pow(2, z) - 1) - yStr;
        tileStmt.run([z, x, yTMS, data]);
      }
      db.run('COMMIT');

      const pct = Math.min(100, Math.round((i + INSERT_BATCH) / entries.length * 100));
      $('progress-bar').style.width = `${pct}%`;
      $('progress-pct').textContent = `${pct}%`;
      $('progress-detail').textContent = `Écriture en base… ${i + batch.length}/${entries.length}`;

      // Laisser respirer le thread UI
      await new Promise(r => setTimeout(r, 0));
    }

    tileStmt.free();

    // Export
    const fileData = db.export();
    db.close();

    state.mbtiles = fileData;

    // Téléchargement
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `littoextract_havre-etretat_z${CONFIG.ZOOM_MIN}-${CONFIG.ZOOM_MAX}.mbtiles`;
    a.click();
    URL.revokeObjectURL(url);

    const sizeMb = (fileData.byteLength / 1024 / 1024).toFixed(1);
    log(`MBTiles exporté — ${sizeMb} Mo — ${entries.length} tuiles`, 'success');
    $('btn-export').disabled = false;

  } catch (e) {
    log(`Erreur export MBTiles : ${e.message}`, 'error');
    $('btn-export').disabled = false;
  }
}

// ── Service Worker — envoi des tuiles ────────────────────────
function sendTilesToSW() {
  if (!navigator.serviceWorker.controller) return;
  const payload = [...state.tileMap.entries()];
  navigator.serviceWorker.controller.postMessage({ type: 'LOAD_TILES', payload });
  log(`${payload.length} tuiles envoyées au Service Worker`, 'info');
}

// ── Carte de prévisualisation ─────────────────────────────────
function initPreviewMap() {
  if (state.previewMap) return;

  state.previewMap = new maplibregl.Map({
    container: 'preview-map',
    style: {
      version: 8,
      sources: {
        'ign-plan': {
          type: 'raster',
          tiles: ['https://data.geopf.fr/tms/1.0.0/PLAN.IGN/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© IGN Géoplateforme',
        }
      },
      layers: [{ id: 'ign', type: 'raster', source: 'ign-plan' }]
    },
    center: [-0.09, 49.575],
    zoom: 11,
    attributionControl: false,
  });

  state.previewMap.on('load', () => {
    drawBufferOnMap();
  });
}

function drawBufferOnMap() {
  const map = state.previewMap;
  if (!map || !map.isStyleLoaded()) return;

  // Supprimer couches existantes
  ['buffer-fill', 'buffer-outline', 'coast-line'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  ['buffer-source', 'coast-source'].forEach(id => {
    if (map.getSource(id)) map.removeSource(id);
  });

  if (state.buffer) {
    map.addSource('buffer-source', { type: 'geojson', data: state.buffer });
    map.addLayer({
      id: 'buffer-fill',
      type: 'fill',
      source: 'buffer-source',
      paint: { 'fill-color': '#00e5ff', 'fill-opacity': 0.15 }
    });
    map.addLayer({
      id: 'buffer-outline',
      type: 'line',
      source: 'buffer-source',
      paint: { 'line-color': '#00e5ff', 'line-width': 1.5, 'line-opacity': 0.7 }
    });
  }

  if (state.coastline) {
    map.addSource('coast-source', { type: 'geojson', data: state.coastline });
    map.addLayer({
      id: 'coast-line',
      type: 'line',
      source: 'coast-source',
      paint: { 'line-color': '#f5a623', 'line-width': 2, 'line-opacity': 0.9 }
    });

    // Centrer sur le trait de côte
    const bbox = turf.bbox(state.coastline);
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40 });
  }
}

// ── Carte visualiseur ─────────────────────────────────────────
function initViewerMap() {
  if (state.viewerMap) return;

  state.viewerMap = new maplibregl.Map({
    container: 'viewer-map',
    style: {
      version: 8,
      sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#050d1a' } }]
    },
    center: [-0.09, 49.575],
    zoom: 14,
    attributionControl: false,
  });
}

function loadViewerTiles() {
  const map = state.viewerMap;
  if (!map) return;

  // Utiliser les tuiles servies par le SW
  if (map.getSource('mbtiles')) map.removeLayer('mbtiles-layer'), map.removeSource('mbtiles');

  map.addSource('mbtiles', {
    type: 'raster',
    tiles: ['/PWA/littoextract/tiles/{z}/{x}/{y}'],
    tileSize: 256,
    minzoom: CONFIG.ZOOM_MIN,
    maxzoom: CONFIG.ZOOM_MAX,
    attribution: '© IGN Géoplateforme BD ORTHO',
  });

  map.addLayer({ id: 'mbtiles-layer', type: 'raster', source: 'mbtiles' });
  $('viewer-placeholder').classList.add('hidden');

  log('Tuiles chargées dans le visualiseur', 'success');
}

// ── Navigation côtière ─────────────────────────────────────────
function navigateToWaypoint(index) {
  if (!state.waypoints.length) return;
  const wp = state.waypoints[Math.max(0, Math.min(index, state.waypoints.length - 1))];
  state.currentWP = index;

  if (state.viewerMap) {
    state.viewerMap.flyTo({
      center: [wp.lng, wp.lat],
      zoom: 16,
      speed: 0.8,
    });
  }

  $('coast-slider').value = index;
  $('wp-name').textContent = wp.name;
  $('wp-km').textContent = `${wp.km.toFixed(1)} km depuis Le Havre`;
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));

  if (tab === 'extract' && !state.previewMap) {
    setTimeout(initPreviewMap, 50);
  }
  if (tab === 'viewer') {
    if (!state.viewerMap) {
      setTimeout(() => {
        initViewerMap();
        if (state.tileMap.size > 0) loadViewerTiles();
      }, 50);
    } else if (state.tileMap.size > 0 && !state.viewerMap.getSource('mbtiles')) {
      loadViewerTiles();
    }
  }
}

// ── Service Worker ────────────────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    log('Service Worker non supporté dans ce navigateur', 'warn');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', {
      scope: '/PWA/littoextract/'
    });
    log('Service Worker enregistré', 'success');

    navigator.serviceWorker.addEventListener('message', event => {
      const { type, count } = event.data;
      if (type === 'TILES_READY') {
        log(`SW : ${count} tuiles disponibles hors-ligne`, 'success');
        updateStatusBadge('ready', `${count} tuiles en cache`);
        if (state.viewerMap) loadViewerTiles();
      }
    });

    state.swReady = true;
  } catch (e) {
    log(`Erreur Service Worker : ${e.message}`, 'error');
  }
}

function updateStatusBadge(state, msg) {
  const dot = document.querySelector('.status-dot');
  const txt = document.querySelector('.status-text');
  if (dot) dot.className = `status-dot ${state}`;
  if (txt) txt.textContent = msg;
}

// ── Init ──────────────────────────────────────────────────────
async function init() {
  log('LittoExtract initialisé');
  await registerSW();

  // Chargement des données
  const ok = await loadCoastline();
  if (ok) {
    computeBuffer();
    computeTiles();
    computeWaypoints();
    initPreviewMap();
  }

  // Événements
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('btn-download').addEventListener('click', downloadTiles);

  $('btn-abort').addEventListener('click', () => {
    if (state.abortCtrl) state.abortCtrl.abort();
  });

  $('btn-export').addEventListener('click', exportMBTiles);

  $('btn-load-viewer').addEventListener('click', () => {
    if (state.tileMap.size > 0) {
      sendTilesToSW();
      switchTab('viewer');
      setTimeout(() => {
        if (state.viewerMap) loadViewerTiles();
        if (state.waypoints.length) navigateToWaypoint(0);
      }, 300);
    } else {
      log('Aucune tuile en mémoire. Lancez d\'abord le téléchargement.', 'warn');
    }
  });

  $('btn-nav-prev').addEventListener('click', () => navigateToWaypoint(state.currentWP - 1));
  $('btn-nav-next').addEventListener('click', () => navigateToWaypoint(state.currentWP + 1));
  $('btn-nav-start').addEventListener('click', () => navigateToWaypoint(0));
  $('btn-nav-end').addEventListener('click', () => navigateToWaypoint(state.waypoints.length - 1));

  $('coast-slider').addEventListener('input', e => {
    navigateToWaypoint(parseInt(e.target.value));
  });
}

document.addEventListener('DOMContentLoaded', init);
