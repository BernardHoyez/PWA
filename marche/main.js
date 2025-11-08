// main.js — version mise à jour : auto-purge sessions > N jours + demande de purge cache tuiles au SW
// Intègre : sessions autosave/reprise (IndexedDB), ZIP fallback, File System Access, et nouveaux appels de purge.

(function(){
/* ---------- utilitaires ---------- */
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
const EARTH_RADIUS = 6371000;

function formatCoordFilename(lat,lon){ return lat.toFixed(6) + '_' + lon.toFixed(6); }
function nowFolderName(){ const dt = new Date(); const pad = n => String(n).padStart(2,'0'); return `marche_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`; }
function setStatus(text){ const s=document.getElementById('status'); if(s) s.textContent = 'Statut: ' + text; }
function showToast(msg, ms=3500){ const t=document.getElementById('toast'); if(!t) return; t.textContent = msg; t.style.display='block'; clearTimeout(t._timeout); t._timeout=setTimeout(()=>t.style.display='none', ms); }

/* ---------- IndexedDB sessions (unchanged) ---------- */
const IDB_NAME = 'marche-db';
const IDB_VERSION = 1;
const IDB_STORE = 'sessions';

function openIDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('by_date', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSaveSession(sessionObj){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    sessionObj.updatedAt = Date.now();
    store.put(sessionObj);
    tx.oncomplete = ()=> resolve(sessionObj);
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbListSessions(){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbGetSession(id){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbDeleteSession(id){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(id);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbClearAllSessions(){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

/* ---------- tiles helpers (unchanged) ---------- */
function latLonToTileXY(lat, lon, z){ const latRad = deg2rad(lat); const n = Math.pow(2, z); const x = Math.floor((lon + 180) / 360 * n); const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * n); return {x,y}; }
function tileXYToLonLat(x,y,z){ const n = Math.pow(2,z); const lon = x / n * 360 - 180; const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))); const lat = rad2deg(latRad); return {lat, lon}; }
function bboxAround(lat, lon, radiusMeters){ const latDelta = rad2deg(radiusMeters / EARTH_RADIUS); const lonDelta = rad2deg(radiusMeters / (EARTH_RADIUS * Math.cos(deg2rad(lat)))); return { minLat: lat - latDelta, maxLat: lat + latDelta, minLon: lon - lonDelta, maxLon: lon + lonDelta }; }
function haversineDistance(lat1,lon1,lat2,lon2){ const dlat = deg2rad(lat2-lat1); const dlon = deg2rad(lon2-lon1); const a = Math.sin(dlat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dlon/2)**2; const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return EARTH_RADIUS * c; }

/* ---------- quick estimate and listTilesAsync (unchanged) ---------- */
function quickEstimateTiles(lat, lon, radiusMeters = 10000, zmin = 13, zmax = 16){ if (zmax > 16) zmax = 16; const latRad = deg2rad(lat); const cosLat = Math.cos(latRad); const worldCirc = 40075016.686; let totalTiles = 0; for (let z = zmin; z <= zmax; z++){ const tileSizeEquator = worldCirc / Math.pow(2, z); const tileWidthEW = tileSizeEquator * cosLat; const tileAreaApprox = Math.max(1, tileSizeEquator * tileWidthEW); const circleArea = Math.PI * radiusMeters * radiusMeters; const tilesApprox = Math.ceil(circleArea / tileAreaApprox); totalTiles += tilesApprox; } return totalTiles; }

async function listTilesAsync(lat, lon, radiusMeters = 10000, zmin = 13, zmax = 16, progressCb = ()=>{}){
  if (zmax > 16) zmax = 16;
  const bbox = bboxAround(lat, lon, radiusMeters);
  const tiles = [];
  let totalEstimate = 0;
  for (let z = zmin; z <= zmax; z++){
    const t1 = latLonToTileXY(bbox.maxLat, bbox.minLon, z);
    const t2 = latLonToTileXY(bbox.minLat, bbox.maxLon, z);
    const xmin = Math.min(t1.x, t2.x);
    const xmax = Math.max(t1.x, t2.x);
    const ymin = Math.min(t1.y, t2.y);
    const ymax = Math.max(t1.y, t2.y);
    totalEstimate += (xmax - xmin + 1) * (ymax - ymin + 1);
  }
  let countSoFar = 0;
  const yieldEvery = 1500;
  let iter = 0;
  for (let z = zmin; z <= zmax; z++){
    const t1 = latLonToTileXY(bbox.maxLat, bbox.minLon, z);
    const t2 = latLonToTileXY(bbox.minLat, bbox.maxLon, z);
    const xmin = Math.min(t1.x, t2.x);
    const xmax = Math.max(t1.x, t2.x);
    const ymin = Math.min(t1.y, t2.y);
    const ymax = Math.max(t1.y, t2.y);
    for (let x = xmin; x <= xmax; x++){
      for (let y = ymin; y <= ymax; y++){
        const {lat: tileLat, lon: tileLon} = tileXYToLonLat(x + 0.5, y + 0.5, z);
        const d = haversineDistance(lat, lon, tileLat, tileLon);
        if (d <= radiusMeters + 1000) tiles.push({z,x,y});
        countSoFar++;
        iter++;
        if ((iter & (yieldEvery - 1)) === 0){
          progressCb({countSoFar, totalEstimate, z, x, y, done:false});
          await new Promise(r=>setTimeout(r,0));
        }
      }
    }
    progressCb({countSoFar, totalEstimate, z, x:null, y:null, done:false});
  }
  progressCb({countSoFar: tiles.length, totalEstimate, z:null, x:null, y:null, done:true});
  return tiles;
}

/* ---------- download helpers & ZIP fallback (unchanged) ---------- */
async function downloadBlobWithName(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}

async function createZipFromCacheAndMemory(options = {}) {
  const includeTiles = options.includeTiles ?? true;
  const includeTraces = options.includeTraces ?? true;
  const includeMedia = options.includeMedia ?? true;
  const zip = new JSZip();
  try {
    const cache = await caches.open('marche-tiles-v1');
    const requests = await cache.keys();
    if (requests.length > 0 && includeTiles) {
      const tilesFolder = zip.folder('tiles');
      for (const req of requests) {
        try {
          const resp = await cache.match(req);
          if (!resp) continue;
          let entryName = (() => { try { const u=new URL(req.url); return u.pathname.split('/').slice(-3).join('_'); } catch(e){ return encodeURIComponent(req.url); } })();
          const blob = await resp.blob();
          tilesFolder.file(entryName, blob);
        } catch (e) { console.warn('Erreur lecture tile cache', e); }
      }
    }
  } catch (e) { console.warn('Impossible d\'ouvrir cache marche-tiles-v1 :', e); }
  try {
    if (includeTraces && typeof trackCoords !== 'undefined' && trackCoords && trackCoords.length>0) {
      const gpxText = generateGPX(trackCoords);
      const kmlText = generateKML(trackCoords);
      const tracesFolder = zip.folder('traces');
      tracesFolder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, gpxText);
      tracesFolder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.kml`, kmlText);
    }
  } catch(e){ console.warn('Erreur création traces dans ZIP', e); }
  try {
    if (includeMedia && typeof waypoints !== 'undefined' && waypoints && waypoints.length>0) {
      const mediaFolder = zip.folder('media');
      for (const wp of waypoints) {
        if (wp.blob && wp.file) mediaFolder.file(wp.file, wp.blob);
      }
    }
  } catch(e){ console.warn('Erreur ajout médias dans ZIP', e); }
  return await zip.generateAsync({type:'blob'});
}

/* ---------- enhanced choose folder handler (unchanged) ---------- */
async function tryPickDirectoryWithFallback() {
  if (!window.showDirectoryPicker) throw new Error('File System Access API non supportée');
  try {
    const dir = await window.showDirectoryPicker();
    return dir;
  } catch (err) {
    console.warn('showDirectoryPicker rejeté:', err && err.name, err && err.message);
    throw err;
  }
}
async function enhancedChooseFolderHandler(){
  const chooseBtn = document.getElementById('choose-folder');
  if (chooseBtn) chooseBtn.disabled = true;
  try {
    try {
      const dir = await tryPickDirectoryWithFallback();
      rootDirHandle = dir;
      await createSessionDir();
      showToast('Dossier choisi: ' + (rootDirHandle.name || 'selected'), 3500);
      setStatus('Dossier choisi pour sauvegarde');
      return;
    } catch (pickErr) {
      console.warn('showDirectoryPicker échoué ou annulé:', pickErr && pickErr.name);
      const fallback = confirm('Sélection de dossier annulée ou impossible. Voulez-vous créer un ZIP des tuiles & traces (fallback) ?');
      if (!fallback) { setStatus('Choix dossier annulé'); return; }
      setStatus('Création d\'un ZIP de secours (tuiles + traces) ...');
      const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
      const name = `marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
      downloadBlobWithName(zipBlob, name);
      setStatus('ZIP créé et téléchargé');
      showToast('ZIP créé et téléchargé', 4000);
      return;
    }
  } finally { if (chooseBtn) chooseBtn.disabled = false; }
}

/* ---------- map / UI / SW messaging ---------- */
let map, planLayer, orthoLayer, startMarker;
let selectedStartMarker = null;
let pwaPromptEvent = null;
let lastTilesCache = {lat:null, lon:null, zmin:null, zmax:null, tiles:null, computedAt:null};
let rootDirHandle = null, sessionDirHandle = null;

/* session state */
let currentSession = { id: null, name: null, startedAt: null, autosaveIntervalHandle: null };

/* init map */
function initMap(){
  map = L.map('map', {preferCanvas:true}).setView([46.5, 2.5], 13);
  const planUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const orthoUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  planLayer = L.tileLayer(planUrl, { tileSize: 256, maxZoom: 18, attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2', crossOrigin: true });
  orthoLayer = L.tileLayer(orthoUrl, { tileSize: 256, maxZoom: 18, attribution: '&copy; IGN / GéoPlateforme - Orthophotos', crossOrigin: true });
  planLayer.addTo(map);
  const baseMaps = { "Plan IGN v2": planLayer, "Orthophoto IGN": orthoLayer };
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);
  const tileUrlInput = document.getElementById('tile-url'); if (tileUrlInput) tileUrlInput.value = planUrl;
  map.on('click', function(e) {
    const lat = e.latlng.lat; const lon = e.latlng.lng;
    const latInput = document.getElementById('lat'); const lonInput = document.getElementById('lon');
    if (latInput) latInput.value = lat.toFixed(6); if (lonInput) lonInput.value = lon.toFixed(6);
    if (selectedStartMarker) selectedStartMarker.setLatLng([lat, lon]);
    else selectedStartMarker = L.marker([lat, lon], {opacity:0.9}).addTo(map).bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")').openPopup();
    setStatus('Point sélectionné (n\'oubliez pas d\'appuyer sur "Enregistrer point de départ")');
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwaPromptEvent = e;
  const btn = document.getElementById('btn-install');
  if(btn){ btn.style.display = 'inline-block'; btn.onclick = async () => { if (!pwaPromptEvent) return; pwaPromptEvent.prompt(); const choice = await pwaPromptEvent.userChoice; pwaPromptEvent = null; btn.style.display = 'none'; setStatus(choice.outcome === 'accepted' ? 'Application installée' : 'Installation annulée'); }; }
});

/* ---------- DOM wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const latInput = document.getElementById('lat'); const lonInput = document.getElementById('lon');
  const btnSave = document.getElementById('save-start'); const btnDownload = document.getElementById('download-tiles');
  const btnChooseFolder = document.getElementById('choose-folder'); const btnCompute = document.getElementById('compute-tiles');
  const btnCleanTiles = document.getElementById('clean-tiles-cache');
  const zminInput = document.getElementById('zmin'); const zmaxInput = document.getElementById('zmax');
  const tileUrlInput = document.getElementById('tile-url'); const tileEstimateDiv = document.getElementById('tile-estimate');

  const btnRefreshSessions = document.getElementById('btn-refresh-sessions'); const btnClearSessions = document.getElementById('btn-clear-sessions');
  const sessionListEl = document.getElementById('session-list');
  const autoPurgeEnabledEl = document.getElementById('auto-purge-enabled'); const autoPurgeDaysEl = document.getElementById('auto-purge-days');

  // restore saved start
  const s = loadStartPoint();
  if (s){ if(latInput) latInput.value = Number(s.lat).toFixed(6); if(lonInput) lonInput.value = Number(s.lon).toFixed(6); centerOnStart(); }

  // populate auto-purge settings from localStorage
  const AUTO_PURGE_KEY = 'marche_auto_purge_sessions';
  const AUTO_PURGE_DAYS_KEY = 'marche_auto_purge_days';
  const savedAuto = localStorage.getItem(AUTO_PURGE_KEY);
  const savedDays = localStorage.getItem(AUTO_PURGE_DAYS_KEY);
  if (savedAuto !== null) autoPurgeEnabledEl.checked = (savedAuto === '1');
  if (savedDays !== null) autoPurgeDaysEl.value = savedDays;

  autoPurgeEnabledEl.addEventListener('change', () => { localStorage.setItem(AUTO_PURGE_KEY, autoPurgeEnabledEl.checked ? '1' : '0'); });
  autoPurgeDaysEl.addEventListener('change', () => { const v = parseInt(autoPurgeDaysEl.value) || 2; localStorage.setItem(AUTO_PURGE_DAYS_KEY, String(v)); });

  // choose folder button: adapt to support or fallback
  if (btnChooseFolder){
    if ('showDirectoryPicker' in window){
      btnChooseFolder.textContent = 'Choisir dossier (optionnel)'; btnChooseFolder.onclick = enhancedChooseFolderHandler;
    } else {
      btnChooseFolder.textContent = 'Créer ZIP (fallback)'; btnChooseFolder.title = 'Votre navigateur ne supporte pas la sélection de dossier — création d\'un ZIP fallback';
      btnChooseFolder.onclick = async () => {
        const confirmZip = confirm('Votre navigateur ne supporte pas la sélection de dossier. Voulez-vous créer immédiatement un ZIP contenant tuiles, traces et médias (fallback) ?');
        if (confirmZip){
          setStatus('Création du ZIP fallback ...');
          try { const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); const name = `marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`; downloadBlobWithName(zipBlob, name); showToast('ZIP créé et téléchargé', 4000); setStatus('ZIP créé et téléchargé'); } catch(e){ console.error(e); alert('Erreur création ZIP fallback: ' + (e.message||e)); setStatus('Erreur création ZIP'); }
        } else setStatus('Création ZIP annulée');
      };
    }
  }

  // zmax clamp UI
  if (zmaxInput){
    zmaxInput.addEventListener('change', () => {
      let zmax = parseInt(zmaxInput.value) || 16;
      if (zmax > 16){ zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16 pour raison de volume de tuiles'); }
    });
  }

  if (btnSave) btnSave.addEventListener('click', () => {
    const rawLat = latInput.value.trim().replace(',', '.'); const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat); const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Format: degrés décimaux (ex: 46.123456)');
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return alert('Coordonnées hors plage valide');
    saveStartPoint(lat, lon); if (selectedStartMarker) { selectedStartMarker.remove(); selectedStartMarker = null; } centerOnStart(); setStatus('Point de départ enregistré');
  });

  if (btnCompute) btnCompute.addEventListener('click', async () => {
    const rawLat = latInput.value.trim().replace(',', '.'); const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat); const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13; let zmax = parseInt(zmaxInput.value) || 16; if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }
    setStatus('Calcul approximation (instantanée)...'); const approxCount = quickEstimateTiles(lat, lon, 10000, zmin, zmax); const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40; const approxMB = Math.round((approxCount * avgKB) / 1024 * 10) / 10; tileEstimateDiv.innerHTML = `<strong>≈ ${approxCount}</strong> tuiles (approx.) — estimation ≈ <strong>${approxMB} MB</strong> (moyenne ${avgKB} KB/tuile). Calcul exact en cours...`;
    let lastUpdate = Date.now();
    try {
      const tiles = await listTilesAsync(lat, lon, 10000, zmin, zmax, (p) => {
        const now = Date.now();
        if (now - lastUpdate > 200 || p.done){
          if (p.done) tileEstimateDiv.innerHTML = `<strong>Exact:</strong> ${p.countSoFar} tuiles (zoom ${zmin}→${zmax}) — estimation ≈ <strong>${Math.round((p.countSoFar*avgKB)/1024*10)/10} MB</strong>.`;
          else tileEstimateDiv.innerHTML = `<strong>Exact (en cours):</strong> ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z || '-'})`;
          lastUpdate = now;
        }
      });
      lastTilesCache = { lat, lon, zmin, zmax, tiles, computedAt: Date.now() };
      setStatus('Calcul exact terminé'); showToast(`Calcul exact terminé: ${tiles.length} tuiles.`, 3000);
    } catch (e) { console.error(e); tileEstimateDiv.innerHTML = `Erreur lors du calcul exact : ${e.message || e}`; setStatus('Erreur calcul dalles'); }
  });

  if (btnDownload) btnDownload.addEventListener('click', async () => {
    // (logic identical to prior code) compute or reuse tiles, confirm, then download and after download notify SW for cleanup
    const rawLat = latInput.value.trim().replace(',', '.'); const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat); const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13; let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }
    setStatus('Vérification du nombre de tuiles avant téléchargement...');
    let tiles = null;
    if (lastTilesCache && lastTilesCache.lat === lat && lastTilesCache.lon === lon && lastTilesCache.zmin === zmin && lastTilesCache.zmax === zmax && lastTilesCache.tiles){
      tiles = lastTilesCache.tiles;
    } else {
      const tileEstimateDiv = document.getElementById('tile-estimate');
      tileEstimateDiv.innerHTML = 'Calcul exact en cours (préparation au téléchargement)...';
      try { tiles = await listTilesAsync(lat, lon, 10000, zmin, zmax, (p) => { tileEstimateDiv.innerHTML = `Calcul exact: ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z || '-'})`; }); lastTilesCache={lat,lon,zmin,zmax,tiles,computedAt:Date.now()}; }
      catch (e){ console.error(e); alert('Erreur lors du calcul des tuiles: ' + (e.message||e)); setStatus('Erreur calcul dalles'); return; }
    }
    const count = tiles.length; const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40; const mb = Math.round((count * avgKB) / 1024 * 10) / 10;
    const MAX_TILES_SAFE = 10000;
    if (count > MAX_TILES_SAFE){
      const warn = `ATTENTION: ${count} tuiles vont être téléchargées (≈ ${mb} MB). C'est plus que ${MAX_TILES_SAFE} tuiles.\nPour confirmer le téléchargement tapez le mot CONFIRM dans la boîte qui suit. Sinon le téléchargement sera annulé.`;
      const user = prompt(warn, '');
      if (user !== 'CONFIRM'){ showToast('Téléchargement annulé (confirmation manquante)', 4000); setStatus('Téléchargement annulé'); return; }
    } else {
      const proceed = confirm(`Vous êtes sur le point de télécharger ${count} tuiles (≈ ${mb} MB). Continuer ?`);
      if (!proceed){ setStatus('Téléchargement annulé'); return; }
    }
    document.getElementById('download-progress').style.display = 'flex';
    const progressBar = document.getElementById('progress-bar'); const progressText = document.getElementById('progress-text');
    progressBar.value = 0; progressText.textContent = '';
    try {
      if (rootDirHandle && !sessionDirHandle) await createSessionDir();
      if (!currentSession.id) startNewSessionForDownloadOnly();
      await downloadTilesAroundFromList(tiles, (tileUrlInput || {}).value || '', (p) => { progressBar.value = p.pct; progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`; });
      setStatus('Téléchargement dalles terminé (cache local mis à jour).'); showToast(`Tuiles: ${count} téléchargées.`, 5000);
      // notify SW to cleanup tiles if needed (send parameters: maxTiles, olderThanDays)
      requestSWCleanup({maxTiles: 12000, olderThanDays: 7});
    } catch (e){ console.error(e); setStatus('Erreur téléchargement tuiles'); alert('Erreur lors du téléchargement des tuiles : ' + (e.message||e)); }
    finally { document.getElementById('download-progress').style.display = 'none'; progressBar.value = 0; progressText.textContent = ''; }
  });

  // clean tiles cache manual button
  if (btnCleanTiles) btnCleanTiles.addEventListener('click', async () => {
    if (!confirm('Nettoyer le cache des tuiles (marche-tiles-v1) ? Cela supprimera les tuiles anciennes/au-delà du plafond configuré.')) return;
    requestSWCleanup({maxTiles: 12000, olderThanDays: 7});
    setStatus('Demande de nettoyage envoyée au service worker');
  });

  // sessions UI functions
  async function refreshSessionsList(){
    const listEl = document.getElementById('session-list'); if (!listEl) return;
    listEl.innerHTML = '';
    try {
      const sessions = await idbListSessions();
      if (!sessions || sessions.length === 0){ listEl.innerHTML = '<div style="color:#666">Aucune session sauvegardée</div>'; return; }
      sessions.sort((a,b)=> (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
      for (const s of sessions){
        const div = document.createElement('div'); div.style.borderBottom='1px solid #f0f0f0'; div.style.padding='6px 2px';
        const name = s.name || (`session_${new Date(s.createdAt).toISOString().replace(/[:.]/g,'-')}`); const created = new Date(s.createdAt).toLocaleString();
        div.innerHTML = `<div style="font-weight:600">${name}</div><div style="font-size:0.85rem;color:#444">créée: ${created} — pts: ${s.trackCoords ? s.trackCoords.length : 0}</div>`;
        const btnResume = document.createElement('button'); btnResume.textContent='Reprendre'; btnResume.className='btn'; btnResume.style.background='#d6f5d6'; btnResume.onclick=()=>resumeSession(s.id);
        const btnDelete = document.createElement('button'); btnDelete.textContent='Supprimer'; btnDelete.className='btn'; btnDelete.style.background='#ffecec'; btnDelete.style.marginLeft='8px'; btnDelete.onclick=async()=>{ if(!confirm('Supprimer cette session de la mémoire ?')) return; await idbDeleteSession(s.id); refreshSessionsList(); };
        const btnExportZip = document.createElement('button'); btnExportZip.textContent='Exporter ZIP'; btnExportZip.className='btn'; btnExportZip.style.background='#e8f6ff'; btnExportZip.style.marginLeft='8px'; btnExportZip.onclick=async()=>{
          setStatus('Préparation ZIP session ...'); const sessionData = await idbGetSession(s.id); const oldTrack = trackCoords; const oldWay = waypoints; trackCoords = sessionData.trackCoords || []; waypoints = sessionData.waypoints || []; const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); const name=`${s.name||s.id}.zip`; downloadBlobWithName(zipBlob,name); trackCoords = oldTrack; waypoints = oldWay; setStatus('ZIP session téléchargé');
        };
        const btns = document.createElement('div'); btns.style.marginTop='6px'; btns.appendChild(btnResume); btns.appendChild(btnDelete); btns.appendChild(btnExportZip);
        div.appendChild(btns); listEl.appendChild(div);
      }
    } catch (e){ console.error('refreshSessionsList', e); listEl.innerHTML = '<div style="color:#900">Erreur lecture sessions</div>'; }
  }
  if (btnRefreshSessions) btnRefreshSessions.addEventListener('click', refreshSessionsList);
  if (btnClearSessions) btnClearSessions.addEventListener('click', async () => { if (!confirm('Supprimer toutes les sessions enregistrées localement ?')) return; await idbClearAllSessions(); refreshSessionsList(); });

  // initial fill
  refreshSessionsList();

  // control buttons
  document.getElementById('btn-start').addEventListener('click', ()=>startTracking(false));
  document.getElementById('btn-stop').addEventListener('click', stopTracking);
  document.getElementById('btn-photo').addEventListener('click', takePhoto);
  document.getElementById('btn-audio-start').addEventListener('click', async () => { try { await startAudioRecording(); document.getElementById('btn-audio-start').disabled = true; document.getElementById('btn-audio-stop').disabled = false; } catch(e){ alert(e.message || e); } });
  document.getElementById('btn-audio-stop').addEventListener('click', () => { if (mediaRecorder && mediaRecorder.state === 'recording') { mediaRecorder.stop(); document.getElementById('btn-audio-start').disabled = false; document.getElementById('btn-audio-stop').disabled = true; } });

  // On load: request SW cleanup and auto-purge sessions if enabled
  // Ask SW to cleanup tiles
  requestSWCleanup({maxTiles:12000, olderThanDays:7});
  // Auto-purge sessions older than N days if enabled
  maybeAutoPurgeSessions();

  // when page gains focus also check purge (useful after offline)
  window.addEventListener('focus', () => { maybeAutoPurgeSessions(); requestSWCleanup({maxTiles:12000, olderThanDays:7}); });
});

/* ---------- autosave, sessions, resume, stop logic (as in prior main.js) ---------- */
let tracking=false, watchId=null, trackCoords=[], waypoints=[], mediaRecorder=null, recordedChunks=[], sessionDirHandle=null;

function startNewSessionForRecording(){
  if (!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); }
  idbSaveSession({ id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords: trackCoords || [], waypoints: waypoints || [] }).catch(e=>console.warn('idbSaveSession on start err', e));
}
function startAutosave(){
  stopAutosave();
  currentSession.autosaveIntervalHandle = setInterval(async ()=>{
    try {
      if (!currentSession.id) startNewSessionForRecording();
      const sObj = { id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints };
      await idbSaveSession(sObj);
      if (sessionDirHandle){
        const gpx = generateGPX(trackCoords); const blob = new Blob([gpx], {type:'application/gpx+xml'}); await writeFileToSession(`traces/autosave_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, blob).catch(()=>{});
      }
      showToast(`Autosave session (${currentSession.name}) — ${trackCoords.length} points`, 1800);
    } catch (e){ console.warn('Autosave erreur', e); }
  }, 60*1000);
}
function stopAutosave(){ if (currentSession && currentSession.autosaveIntervalHandle){ clearInterval(currentSession.autosaveIntervalHandle); currentSession.autosaveIntervalHandle = null; } }

async function resumeSession(sessionId){
  try {
    const s = await idbGetSession(sessionId);
    if (!s) return alert('Session introuvable');
    trackCoords = s.trackCoords || []; waypoints = s.waypoints || [];
    currentSession.id = s.id; currentSession.name = s.name || (`session_${new Date(s.createdAt).toISOString().replace(/[:.]/g,'-')}`); currentSession.startedAt = s.startedAt || s.createdAt || Date.now();
    if (trackCoords.length > 0){ const last = trackCoords[trackCoords.length - 1]; map.setView([last.lat, last.lon], 16); }
    startTracking(true);
    showToast(`Session ${currentSession.name} reprise — ${trackCoords.length} points chargés`, 4000);
  } catch(e){ console.error('resumeSession err', e); alert('Impossible de reprendre la session : ' + (e.message||e)); }
}
function startTracking(resuming=false){
  if (tracking) return;
  if (!('geolocation' in navigator)) return alert('Géolocalisation non supportée');
  if (!resuming){ trackCoords=[]; waypoints=[]; currentSession.id=null; currentSession.name=null; currentSession.startedAt=Date.now(); }
  if (!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); }
  startNewSessionForRecording();
  const options = {enableHighAccuracy:true, maximumAge:1000, timeout:5000};
  watchId = navigator.geolocation.watchPosition(onPosition, onPosError, options);
  tracking=true; setStatus('Enregistrement en cours'); startAutosave();
}
function onPosition(pos){ const lat=pos.coords.latitude; const lon=pos.coords.longitude; const ts=pos.timestamp; trackCoords.push({lat,lon,ts}); if (!window.trackPolyline) window.trackPolyline = L.polyline([], {color:'red'}).addTo(map); window.trackPolyline.addLatLng([lat,lon]); if (!window.currentMarker) window.currentMarker = L.circleMarker([lat,lon], {radius:6, color:'blue'}).addTo(map); else window.currentMarker.setLatLng([lat,lon]); }
function onPosError(err){ console.warn('erreur geoloc', err); }

async function stopTracking(){
  if (!tracking) return;
  navigator.geolocation.clearWatch(watchId); tracking=false; stopAutosave(); setStatus('Enregistrement stoppé — préparation exports');
  if (trackCoords.length === 0) return alert('Aucune donnée de trace enregistrée');
  if (!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); }
  const sObj = { id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints, finalizedAt: Date.now() };
  await idbSaveSession(sObj).catch(e=>console.warn('idbSave final err', e));
  const gpx = generateGPX(trackCoords); const kml = generateKML(trackCoords); const ts = new Date().toISOString().replace(/[:.]/g,'-'); const gpxName = `${currentSession.name}_trace_${ts}.gpx`; const kmlName = `${currentSession.name}_trace_${ts}.kml`;
  const gpxBlob = new Blob([gpx], {type:'application/gpx+xml'}); const kmlBlob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
  if (sessionDirHandle){ await writeFileToSession(`traces/${gpxName}`, gpxBlob).catch(()=>{}); await writeFileToSession(`traces/${kmlName}`, kmlBlob).catch(()=>{}); showToast(`Traces sauvegardées dans ${sessionDirHandle.name}/traces`, 5000); }
  else {
    try {
      const wantZip = confirm('Le dossier local n\'est pas configuré. Voulez-vous télécharger un ZIP contenant la session (tuiles en cache, traces, médias) ?');
      if (wantZip){ setStatus('Création ZIP session ...'); const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); const zipName = `${currentSession.name}.zip`; downloadBlobWithName(zipBlob, zipName); showToast(`ZIP session ${zipName} téléchargé`, 5000); }
      else { downloadBlobWithName(gpxBlob, gpxName); downloadBlobWithName(kmlBlob, kmlName); showToast('Traces téléchargées (dossier Téléchargements)', 4000); }
    } catch(e){ console.error('ZIP creation err', e); downloadBlobWithName(gpxBlob, gpxName); downloadBlobWithName(kmlBlob, kmlName); showToast('Traces téléchargées (dossier Téléchargements)', 4000); }
  }
  currentSession.id=null; currentSession.name=null; currentSession.startedAt=null; setStatus('Exports GPX/KML prêts');
  if (document.getElementById('btn-refresh-sessions')) document.getElementById('btn-refresh-sessions').click();
  // after stopping recording, maybe purge old sessions if auto-purge enabled
  maybeAutoPurgeSessions();
}

/* ---------- photo & audio ---------- */
async function getCurrentPosition(options={enableHighAccuracy:true,timeout:5000}){ return new Promise((resolve,reject)=> navigator.geolocation.getCurrentPosition(resolve,reject,options)); }

async function takePhoto(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video = document.createElement('video'); video.srcObject = stream; await video.play(); await new Promise(r=>setTimeout(r,500));
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const pos = await getCurrentPosition(); const lat = pos.coords.latitude; const lon = pos.coords.longitude;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(10,canvas.height-40,360,30); ctx.fillStyle='white'; ctx.font='16px sans-serif'; ctx.fillText(lat.toFixed(6)+', '+lon.toFixed(6),16,canvas.height-18);
    const blob = await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.9)); const filename = `${currentSession.name||nowFolderName()}_${formatCoordFilename(lat,lon)}.jpg`;
    if (sessionDirHandle){ await writeFileToSession(`media/${filename}`, blob).catch(()=>{}); showToast(`Photo sauvegardée dans ${sessionDirHandle.name}/media/${filename}`,5000); }
    else { downloadBlobWithName(blob, filename); showToast(`Photo téléchargée (${filename})`,4000); }
    waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename,blob}); L.marker([lat,lon]).addTo(map).bindPopup('Photo @ '+filename);
    const tracks = video.srcObject.getTracks(); tracks.forEach(t=>t.stop());
  } catch(e){ console.warn('Capture caméra impossible', e); const input=document.getElementById('photo-input'); input.onchange=async(ev)=>{ const file=ev.target.files[0]; if(!file) return; const pos=await getCurrentPosition(); const lat=pos.coords.latitude; const lon=pos.coords.longitude; const img=document.createElement('img'); img.src=URL.createObjectURL(file); await img.decode(); const canvas=document.createElement('canvas'); canvas.width=img.naturalWidth; canvas.height=img.naturalHeight; const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(10,canvas.height-40,360,30); ctx.fillStyle='white'; ctx.font='16px sans-serif'; ctx.fillText(lat.toFixed(6)+', '+lon.toFixed(6),16,canvas.height-18); const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.9)); const filename=`${currentSession.name||nowFolderName()}_${formatCoordFilename(lat,lon)}.jpg`; if (sessionDirHandle){ await writeFileToSession(`media/${filename}`, blob).catch(()=>{}); showToast(`Photo sauvegardée dans ${sessionDirHandle.name}/media/${filename}`,5000); } else { downloadBlobWithName(blob, filename); showToast(`Photo téléchargée (${filename})`,4000); } L.marker([lat,lon]).addTo(map).bindPopup('Photo @ '+filename); waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename,blob}); }; input.click(); }
}

async function startAudioRecording(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Micro non supporté');
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  recordedChunks = []; mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e=>{ if (e.data.size>0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = async ()=>{
    const blob = new Blob(recordedChunks,{type:'audio/webm'}); const pos=await getCurrentPosition(); const lat=pos.coords.latitude; const lon=pos.coords.longitude; const filename = `${currentSession.name||nowFolderName()}_${formatCoordFilename(lat,lon)}.webm`;
    if (sessionDirHandle){ await writeFileToSession(`media/${filename}`, blob).catch(()=>{}); showToast(`Enregistrement audio sauvegardé dans ${sessionDirHandle.name}/media/${filename}`,5000); } else { downloadBlobWithName(blob, filename); showToast(`Enregistrement audio téléchargé (${filename})`,4000); }
    waypoints.push({type:'audio',lat,lon,ts:Date.now(),file:filename,blob}); stream.getTracks().forEach(t=>t.stop());
  };
  mediaRecorder.start(); setStatus('Enregistrement audio en cours');
}

/* ---------- helpers for download-only session ---------- */
function startNewSessionForDownloadOnly(){
  if (!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); }
  idbSaveSession({ id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords: trackCoords || [], waypoints: waypoints || [] }).catch(e=>console.warn('idbSaveSession for download-only', e));
}

/* ---------- GPX/KML ---------- */
function generateGPX(track){ const header = `<?xml version="1.0" encoding="utf-8"?>\n<gpx version="1.1" creator="marche" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>Trace marche</name><trkseg>`; const pts = track.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n'); const footer = `</trkseg></trk>\n</gpx>`; return header + '\n' + pts + '\n' + footer; }
function generateKML(track){ const coords = track.map(p=>`${p.lon},${p.lat},0`).join(' '); return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>Trace marche</name>\n<Placemark><name>Trace</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>\n</Document></kml>`; }

/* ---------- auto-purge sessions older than N days ---------- */
async function purgeSessionsOlderThan(days){
  try {
    const sessions = await idbListSessions();
    const cutoff = Date.now() - days*24*3600*1000;
    let deleted = 0;
    for (const s of sessions){
      const updated = s.updatedAt || s.createdAt || 0;
      if (updated < cutoff){
        await idbDeleteSession(s.id).catch(()=>{});
        // try to remove files in sessionDirHandle if available
        if (sessionDirHandle){
          try {
            // Note: File System Access API doesn't have a recursive delete by name standard. We try to get folder and remove files by name.
            // We'll attempt to remove traces and media files created with the session name prefix.
            const tracesDir = await sessionDirHandle.getDirectoryHandle('traces', {create:false}).catch(()=>null);
            if (tracesDir){
              for await (const [name, handle] of tracesDir.entries && tracesDir.entries()){
                if (name && name.startsWith(s.name)) {
                  await tracesDir.removeEntry(name).catch(()=>{});
                }
              }
            }
            const mediaDir = await sessionDirHandle.getDirectoryHandle('media', {create:false}).catch(()=>null);
            if (mediaDir){
              for await (const [name, handle] of mediaDir.entries && mediaDir.entries()){
                if (name && name.startsWith(s.name)) { await mediaDir.removeEntry(name).catch(()=>{}); }
              }
            }
          } catch(e){
            // ignore FS errors
          }
        }
        deleted++;
      }
    }
    if (deleted>0) showToast(`Purge automatique : ${deleted} session(s) supprimée(s)`);
    return deleted;
  } catch(e){ console.error('purgeSessionsOlderThan err', e); return 0; }
}

async function maybeAutoPurgeSessions(){
  try {
    const enabled = localStorage.getItem('marche_auto_purge_sessions') === '1';
    const days = parseInt(localStorage.getItem('marche_auto_purge_days') || '2');
    if (enabled){
      await purgeSessionsOlderThan(days);
      if (document.getElementById('btn-refresh-sessions')) document.getElementById('btn-refresh-sessions').click();
    }
  } catch(e){ console.warn('maybeAutoPurgeSessions err', e); }
}

/* ---------- Service Worker communication: request cleanup of tiles ---------- */
function requestSWCleanup(opts={maxTiles:12000, olderThanDays:7}){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg=>{
    if (reg.active && reg.active.state) {
      try {
        reg.active.postMessage({ type:'cleanup-tiles', maxTiles: opts.maxTiles, olderThanDays: opts.olderThanDays });
        setStatus('Demande nettoyage cache envoyée au service worker');
      } catch(e){ console.warn('postMessage to SW failed', e); }
    }
  }).catch(e=>console.warn('SW ready err', e));
}

/* ---------- expose some functions to global scope for HTML inline usage (if needed) ---------- */
window.purgeSessionsOlderThan = purgeSessionsOlderThan;
window.requestSWCleanup = requestSWCleanup;

})(); // IIFE end