// main.js — fichier complet et corrigé
// Fonctionnalités : carte IGN, centrage sur position au démarrage, estimation tuiles (approx + exact non bloquant),
// téléchargement tuiles (cache + écriture FS optionnelle), sessions/autosave (IndexedDB), reprise,
// ZIP fallback (JSZip), photo/audio, communication avec Service Worker pour purge cache.

// Dépendances : Leaflet, JSZip (chargés dans index.html)

/* ---------- Utilitaires ---------- */
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
const EARTH_RADIUS = 6371000;

function formatCoordFilename(lat,lon){ return lat.toFixed(6) + '_' + lon.toFixed(6); }
function nowFolderName(){ const dt=new Date(); const pad=n=>String(n).padStart(2,'0'); return `marche_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`; }
function setStatus(text){ const s=document.getElementById('status'); if(s) s.textContent = 'Statut: ' + text; }
function showToast(msg, ms=3500){ const t=document.getElementById('toast'); if(!t) return; t.textContent = msg; t.style.display='block'; clearTimeout(t._timeout); t._timeout = setTimeout(()=>{ t.style.display='none'; }, ms); }

/* ---------- IndexedDB sessions/autosave ---------- */
const IDB_NAME = 'marche-db';
const IDB_VERSION = 1;
const IDB_STORE = 'sessions';

function openIDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('by_date','createdAt',{unique:false});
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function idbSaveSession(obj){
  const db = await openIDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    const store = tx.objectStore(IDB_STORE);
    obj.updatedAt = Date.now();
    store.put(obj);
    tx.oncomplete = ()=> resolve(obj);
    tx.onerror = ()=> reject(tx.error);
  });
}

async function idbListSessions(){
  const db = await openIDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  });
}

async function idbGetSession(id){
  const db = await openIDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function idbDeleteSession(id){
  const db = await openIDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(id);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function idbClearAllSessions(){
  const db = await openIDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

/* ---------- WebMercator / tiles helpers ---------- */
function latLonToTileXY(lat, lon, z){
  const latRad = deg2rad(lat);
  const n = Math.pow(2,z);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * n);
  return {x,y};
}
function tileXYToLonLat(x,y,z){
  const n = Math.pow(2,z);
  const lon = x / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  return {lat: rad2deg(latRad), lon};
}
function bboxAround(lat, lon, radiusMeters){
  const latDelta = rad2deg(radiusMeters / EARTH_RADIUS);
  const lonDelta = rad2deg(radiusMeters / (EARTH_RADIUS * Math.cos(deg2rad(lat))));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLon: lon - lonDelta, maxLon: lon + lonDelta };
}
function haversineDistance(lat1,lon1,lat2,lon2){
  const dlat = deg2rad(lat2-lat1);
  const dlon = deg2rad(lon2-lon1);
  const a = Math.sin(dlat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dlon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

/* ---------- quick estimate + exact listing (non-blocking) ---------- */
function quickEstimateTiles(lat, lon, radiusMeters=10000, zmin=13, zmax=16){
  if (zmax>16) zmax=16;
  const latRad = deg2rad(lat), cosLat = Math.cos(latRad), worldCirc = 40075016.686;
  let total = 0;
  for(let z=zmin; z<=zmax; z++){
    const tileEq = worldCirc / Math.pow(2,z);
    const tileEW = tileEq * cosLat;
    const area = Math.max(1, tileEq * tileEW);
    const circ = Math.PI * radiusMeters * radiusMeters;
    total += Math.ceil(circ / area);
  }
  return total;
}

async function listTilesAsync(lat, lon, radiusMeters=10000, zmin=13, zmax=16, progressCb=()=>{}){
  if (zmax>16) zmax=16;
  const bbox = bboxAround(lat, lon, radiusMeters);
  const tiles = [];
  let totalEstimate = 0;
  for(let z=zmin; z<=zmax; z++){
    const t1 = latLonToTileXY(bbox.maxLat, bbox.minLon, z);
    const t2 = latLonToTileXY(bbox.minLat, bbox.maxLon, z);
    const xmin = Math.min(t1.x, t2.x);
    const xmax = Math.max(t1.x, t2.x);
    const ymin = Math.min(t1.y, t2.y);
    const ymax = Math.max(t1.y, t2.y);
    totalEstimate += (xmax - xmin + 1) * (ymax - ymin + 1);
  }
  let countSoFar = 0;
  let iter = 0;
  const yieldEvery = 1500;
  for(let z=zmin; z<=zmax; z++){
    const t1 = latLonToTileXY(bbox.maxLat, bbox.minLon, z);
    const t2 = latLonToTileXY(bbox.minLat, bbox.maxLon, z);
    const xmin = Math.min(t1.x, t2.x);
    const xmax = Math.max(t1.x, t2.x);
    const ymin = Math.min(t1.y, t2.y);
    const ymax = Math.max(t1.y, t2.y);
    for(let x=xmin; x<=xmax; x++){
      for(let y=ymin; y<=ymax; y++){
        const {lat:tileLat, lon:tileLon} = tileXYToLonLat(x+0.5,y+0.5,z);
        const d = haversineDistance(lat, lon, tileLat, tileLon);
        if (d <= radiusMeters + 1000) tiles.push({z,x,y});
        countSoFar++; iter++;
        if ((iter & (yieldEvery - 1)) === 0){
          progressCb({countSoFar, totalEstimate, z, x, y, done:false});
          await new Promise(r => setTimeout(r,0));
        }
      }
    }
    progressCb({countSoFar, totalEstimate, z, x:null, y:null, done:false});
  }
  progressCb({countSoFar: tiles.length, totalEstimate, z:null, x:null, y:null, done:true});
  return tiles;
}

/* ---------- download tiles (cache + optional FS write) ---------- */
async function downloadTilesAroundFromList(tiles, tileUrlTemplate, progressCb=(p)=>{}){
  const total = tiles.length;
  const cache = await caches.open('marche-tiles-v1');
  let count = 0;
  for(const t of tiles){
    const url = tileUrlTemplate.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
    try {
      const req = new Request(url, {mode:'cors'});
      const resp = await fetch(req);
      if (resp && resp.ok) {
        try { await cache.put(req, resp.clone()); } catch(e){ /* ignore cache put fail */ }
        if (sessionDirHandle) {
          try {
            const dirTiles = await sessionDirHandle.getDirectoryHandle('tiles', {create:true});
            const dirZ = await dirTiles.getDirectoryHandle(String(t.z), {create:true});
            const filename = `${t.x}_${t.y}.png`;
            const fh = await dirZ.getFileHandle(filename, {create:true});
            const w = await fh.createWritable();
            const blob = await resp.blob();
            await w.write(blob);
            await w.close();
          } catch(e){ console.warn('FS write tile failed', e); }
        }
      }
    } catch(e){
      console.warn('fetch tile error', e, url);
    }
    count++;
    const pct = Math.round((count/total)*100);
    progressCb({count, total, pct});
  }
  return {count, total};
}

/* ---------- ZIP helpers (JSZip) ---------- */
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}

async function createZipFromCacheAndMemory(options = {includeTiles:true, includeTraces:true, includeMedia:true}){
  const zip = new JSZip();
  const includeTiles = options.includeTiles ?? true;
  const includeTraces = options.includeTraces ?? true;
  const includeMedia = options.includeMedia ?? true;

  if (includeTiles){
    try {
      const cache = await caches.open('marche-tiles-v1');
      const requests = await cache.keys();
      if (requests.length > 0){
        const folder = zip.folder('tiles');
        for (const req of requests){
          try {
            const resp = await cache.match(req);
            if (!resp) continue;
            let name = '';
            try { const u = new URL(req.url); name = u.pathname.split('/').slice(-3).join('_'); } catch(e) { name = encodeURIComponent(req.url); }
            const blob = await resp.blob();
            folder.file(name, blob);
          } catch(e){ console.warn('zip tile read err', e); }
        }
      }
    } catch(e){ console.warn('zip cache open err', e); }
  }

  if (includeTraces && Array.isArray(trackCoords) && trackCoords.length){
    try {
      const gpx = generateGPX(trackCoords);
      const kml = generateKML(trackCoords);
      const folder = zip.folder('traces');
      folder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, gpx);
      folder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.kml`, kml);
    } catch(e){ console.warn('zip traces err', e); }
  }

  if (includeMedia && Array.isArray(waypoints) && waypoints.length){
    try {
      const folder = zip.folder('media');
      for (const wp of waypoints){
        if (wp.blob && wp.file) folder.file(wp.file, wp.blob);
      }
    } catch(e){ console.warn('zip media err', e); }
  }

  return await zip.generateAsync({type:'blob'});
}

/* ---------- File System Access helpers ---------- */
let rootDirHandle = null;
let sessionDirHandle = null;

async function createSessionDir(){
  if(!rootDirHandle) return null;
  const name = nowFolderName();
  sessionDirHandle = await rootDirHandle.getDirectoryHandle(name, {create:true});
  await sessionDirHandle.getDirectoryHandle('tiles', {create:true});
  await sessionDirHandle.getDirectoryHandle('media', {create:true});
  await sessionDirHandle.getDirectoryHandle('traces', {create:true});
  return sessionDirHandle;
}

async function writeFileToSession(relativePath, blob){
  if (!sessionDirHandle){
    if (rootDirHandle) await createSessionDir();
    else return false;
  }
  const parts = relativePath.split('/').filter(Boolean);
  let dir = sessionDirHandle;
  for (let i=0;i<parts.length-1;i++){
    dir = await dir.getDirectoryHandle(parts[i], {create:true});
  }
  const filename = parts[parts.length-1];
  const fh = await dir.getFileHandle(filename, {create:true});
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return true;
}

async function tryPickDirectory(){
  if (!window.showDirectoryPicker) throw new Error('File System Access non supportée');
  return await window.showDirectoryPicker();
}

async function enhancedChooseFolderHandler(){
  const btn = document.getElementById('choose-folder');
  if(btn) btn.disabled = true;
  try {
    try {
      const dir = await tryPickDirectory();
      rootDirHandle = dir;
      await createSessionDir();
      showToast('Dossier choisi: ' + (rootDirHandle.name || 'selected'), 3000);
      setStatus('Dossier choisi pour sauvegarde');
    } catch (err) {
      console.warn('picker failed', err);
      const fallback = confirm('Sélection annulée ou non supportée. Voulez-vous créer un ZIP fallback des tuiles/traces ?');
      if (!fallback){ setStatus('Choix dossier annulé'); }
      else {
        setStatus('Création ZIP fallback...');
        const blob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
        const name = `marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
        downloadBlob(blob, name);
        setStatus('ZIP créé et téléchargé');
      }
    }
  } finally {
    if(btn) btn.disabled = false;
  }
}

/* ---------- Service Worker cleanup request ---------- */
function requestSWCleanup(opts = {maxTiles:12000, olderThanDays:7}){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    try {
      if (reg.active) reg.active.postMessage({type:'cleanup-tiles', maxTiles: opts.maxTiles, olderThanDays: opts.olderThanDays});
      setStatus('Demande nettoyage envoyée au Service Worker');
    } catch(e){ console.warn('postMessage SW failed', e); }
  }).catch(e=>console.warn('serviceWorker.ready err', e));
}

/* ---------- Map, UI and behaviors ---------- */
let map, planLayer, orthoLayer, startMarker, selectedStartMarker = null, pwaPromptEvent = null;
let lastTilesCache = {lat:null, lon:null, zmin:null, zmax:null, tiles:null, computedAt:null};

// recording/session state
let currentSession = { id:null, name:null, startedAt:null, autosaveIntervalHandle:null };
let tracking = false, watchId = null, trackCoords = [], waypoints = [], mediaRecorder = null, recordedChunks = [];

/* init map */
function initMap(){
  map = L.map('map', {preferCanvas:true}).setView([46.5, 2.5], 13);
  const planUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const orthoUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  planLayer = L.tileLayer(planUrl, {tileSize:256, maxZoom:18, attribution:'&copy; IGN / GéoPlateforme - Plan IGN v2', crossOrigin:true});
  orthoLayer = L.tileLayer(orthoUrl, {tileSize:256, maxZoom:18, attribution:'&copy; IGN / GéoPlateforme - Orthophotos', crossOrigin:true});
  planLayer.addTo(map);
  L.control.layers({"Plan IGN v2": planLayer, "Orthophoto IGN": orthoLayer}, null, {collapsed:false}).addTo(map);
  const tileUrlInput = document.getElementById('tile-url'); if(tileUrlInput) tileUrlInput.value = planUrl;

  map.on('click', (e) => {
    const lat = e.latlng.lat, lon = e.latlng.lng;
    const latEl = document.getElementById('lat'), lonEl = document.getElementById('lon');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lonEl) lonEl.value = lon.toFixed(6);
    if (selectedStartMarker) selectedStartMarker.setLatLng([lat,lon]);
    else selectedStartMarker = L.marker([lat,lon], {opacity:0.9}).addTo(map).bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")').openPopup();
    setStatus('Point sélectionné (cliquer "Enregistrer point de départ")');
  });
}

/* ---------- center on user or start at startup ---------- */
function getPosOnce(options = {enableHighAccuracy:true, timeout:7000}){
  return new Promise((resolve,reject)=>{
    if (!navigator.geolocation) return reject(new Error('Géolocalisation non supportée'));
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function centerMapOnUserOrStart(){
  if (typeof map === 'undefined') return;
  setStatus('Tentative centrage position GPS...');
  try {
    const pos = await getPosOnce({enableHighAccuracy:true, timeout:7000});
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    map.setView([lat, lon], 15);
    const m = L.circleMarker([lat, lon], {radius:8, color:'#0066ff', fillOpacity:0.6}).addTo(map).bindPopup('Votre position').openPopup();
    setTimeout(()=>{ try{ m.remove(); }catch(e){} }, 8000);
    setStatus('Carte centrée sur position GPS');
  } catch(err){
    console.warn('No GPS at startup:', err && err.message ? err.message : err);
    const s = localStorage.getItem('marche_start_point') ? JSON.parse(localStorage.getItem('marche_start_point')) : null;
    if (s && typeof s.lat === 'number' && typeof s.lon === 'number') {
      map.setView([s.lat, s.lon], 13);
      if (startMarker) startMarker.remove();
      startMarker = L.marker([s.lat, s.lon]).addTo(map).bindPopup('Départ enregistré').openPopup();
      setStatus('Carte centrée sur point de départ enregistré');
    } else {
      setStatus('Position GPS non disponible — vue par défaut conservée');
    }
  }
}

/* ---------- DOM wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  // try to center on user/start at startup
  centerMapOnUserOrStart();

  // Buttons & controls
  const btnCompute = document.getElementById('compute-tiles');
  const btnDownload = document.getElementById('download-tiles');
  const btnChoose = document.getElementById('choose-folder');
  const btnClean = document.getElementById('clean-tiles-cache');
  const btnSave = document.getElementById('save-start');

  if (btnChoose) btnChoose.addEventListener('click', enhancedChooseFolderHandler);
  if (btnClean) btnClean.addEventListener('click', ()=>{ if(!confirm('Nettoyer le cache des tuiles (marche-tiles-v1) ?')) return; requestSWCleanup({maxTiles:12000, olderThanDays:7}); setStatus('Demande nettoyage envoyée'); });

  // Compute handler
  if (btnCompute) btnCompute.addEventListener('click', async () => {
    const latEl = document.getElementById('lat'), lonEl = document.getElementById('lon');
    const zminEl = document.getElementById('zmin'), zmaxEl = document.getElementById('zmax');
    const tileEstimateDiv = document.getElementById('tile-estimate');
    const rawLat = latEl && latEl.value ? latEl.value.trim().replace(',','.') : '';
    const rawLon = lonEl && lonEl.value ? lonEl.value.trim().replace(',','.') : '';
    const lat = parseFloat(rawLat), lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminEl.value) || 13, zmax = parseInt(zmaxEl.value) || 16;
    if (zmax > 16){ zmax = 16; zmaxEl.value = 16; showToast('Zoom max limité à 16'); }
    setStatus('Calcul approximation (instantanée)...');
    const approx = quickEstimateTiles(lat, lon, 10000, zmin, zmax);
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const approxMB = Math.round((approx * avgKB) / 1024 * 10) / 10;
    tileEstimateDiv.innerHTML = `<strong>≈ ${approx}</strong> tuiles — estimation ≈ <strong>${approxMB} MB</strong>. Calcul exact en cours...`;
    try {
      let lastUpdate = Date.now();
      const tiles = await listTilesAsync(lat, lon, 10000, zmin, zmax, (p) => {
        const now = Date.now();
        if (now - lastUpdate > 200 || p.done){
          if (p.done) tileEstimateDiv.innerHTML = `<strong>Exact:</strong> ${p.countSoFar} tuiles (zoom ${zmin}→${zmax}) — estimation ≈ <strong>${Math.round((p.countSoFar*avgKB)/1024*10)/10} MB</strong>.`;
          else tileEstimateDiv.innerHTML = `<strong>Exact (en cours):</strong> ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z || '-'})`;
          lastUpdate = now;
        }
      });
      lastTilesCache = { lat, lon, zmin, zmax, tiles, computedAt: Date.now() };
      setStatus('Calcul exact terminé');
      showToast(`Calcul exact terminé: ${tiles.length} tuiles.`, 3000);
    } catch(e){
      console.error('listTilesAsync error', e);
      tileEstimateDiv.innerHTML = 'Erreur calcul exact: ' + (e && e.message ? e.message : e);
      setStatus('Erreur');
    }
  });

  // Download handler
  if (btnDownload) btnDownload.addEventListener('click', async () => {
    const latEl = document.getElementById('lat'), lonEl = document.getElementById('lon');
    const zminEl = document.getElementById('zmin'), zmaxEl = document.getElementById('zmax');
    const tileUrlEl = document.getElementById('tile-url');
    const tileEstimateDiv = document.getElementById('tile-estimate');
    const progressWrap = document.getElementById('download-progress');
    const progressBar = document.getElementById('progress-bar'), progressText = document.getElementById('progress-text');

    const rawLat = latEl && latEl.value ? latEl.value.trim().replace(',','.') : '';
    const rawLon = lonEl && lonEl.value ? lonEl.value.trim().replace(',','.') : '';
    const lat = parseFloat(rawLat), lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides.');

    let zmin = parseInt(zminEl.value) || 13, zmax = parseInt(zmaxEl.value) || 16;
    if (zmax > 16){ zmax = 16; zmaxEl.value = 16; showToast('Zoom max limité à 16'); }

    setStatus('Vérification du nombre de tuiles avant téléchargement...');
    let tiles = null;
    if (lastTilesCache && lastTilesCache.lat === lat && lastTilesCache.lon === lon && lastTilesCache.zmin === zmin && lastTilesCache.zmax === zmax && lastTilesCache.tiles){
      tiles = lastTilesCache.tiles;
    } else {
      tileEstimateDiv.innerHTML = 'Calcul exact en cours (préparation)...';
      try {
        tiles = await listTilesAsync(lat, lon, 10000, zmin, zmax, (p)=>{ tileEstimateDiv.innerHTML = `Calcul exact: ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z || '-'})`; });
        lastTilesCache = { lat, lon, zmin, zmax, tiles, computedAt: Date.now() };
      } catch(e){
        console.error('listTilesAsync error', e);
        alert('Erreur lors du calcul des tuiles: ' + (e && e.message ? e.message : e));
        setStatus('Erreur calcul dalles');
        return;
      }
    }

    const count = tiles.length;
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const mb = Math.round((count * avgKB) / 1024 * 10) / 10;
    const MAX_SAFE = 10000;
    if (count > MAX_SAFE){
      const user = prompt(`ATTENTION: ${count} tuiles vont être téléchargées (~${mb} MB). Tapez CONFIRM pour continuer:`, '');
      if (user !== 'CONFIRM'){ setStatus('Téléchargement annulé'); showToast('Téléchargement annulé'); return; }
    } else {
      if (!confirm(`Télécharger ${count} tuiles (~${mb} MB) ?`)){ setStatus('Téléchargement annulé'); return; }
    }

    if (progressWrap) progressWrap.style.display = 'flex';
    if (progressBar) progressBar.value = 0;
    if (progressText) progressText.textContent = '';

    try {
      if (rootDirHandle && !sessionDirHandle) await createSessionDir();
      startNewSessionForDownloadOnly();
      const tileUrlTemplate = tileUrlEl && tileUrlEl.value ? tileUrlEl.value.trim() : '';
      await downloadTilesAroundFromList(tiles, tileUrlTemplate, (p) => {
        if (progressBar) progressBar.value = p.pct;
        if (progressText) progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`;
      });
      setStatus('Téléchargement dalles terminé (cache mis à jour).');
      showToast(`Téléchargement terminé: ${count} tuiles`, 4000);
      requestSWCleanup({maxTiles:12000, olderThanDays:7});
    } catch(e){
      console.error('downloadTiles error', e);
      setStatus('Erreur téléchargement');
      alert('Erreur téléchargement: ' + (e && e.message ? e.message : e));
    } finally {
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.value = 0;
      if (progressText) progressText.textContent = '';
    }
  });

  // other UI wiring
  const btnStart = document.getElementById('btn-start'), btnStop = document.getElementById('btn-stop');
  const btnPhoto = document.getElementById('btn-photo'), btnAudioStart = document.getElementById('btn-audio-start'), btnAudioStop = document.getElementById('btn-audio-stop');
  if (btnStart) btnStart.addEventListener('click', ()=>startTracking(false));
  if (btnStop) btnStop.addEventListener('click', stopTracking);
  if (btnPhoto) btnPhoto.addEventListener('click', takePhoto);
  if (btnAudioStart) btnAudioStart.addEventListener('click', async ()=>{ try{ await startAudioRecording(); btnAudioStart.disabled=true; btnAudioStop.disabled=false; }catch(e){ alert(e && e.message ? e.message : e); }});
  if (btnAudioStop) btnAudioStop.addEventListener('click', ()=>{ if (mediaRecorder && mediaRecorder.state === 'recording'){ mediaRecorder.stop(); document.getElementById('btn-audio-start').disabled=false; document.getElementById('btn-audio-stop').disabled=true; }});

  // sessions UI refresh/clear
  const btnRefresh = document.getElementById('btn-refresh-sessions'), btnClear = document.getElementById('btn-clear-sessions');
  if (btnRefresh) btnRefresh.addEventListener('click', async ()=>{
    const listEl = document.getElementById('session-list'); if(!listEl) return;
    listEl.innerHTML = '';
    try {
      const sessions = await idbListSessions();
      if (!sessions || sessions.length === 0){ listEl.innerHTML = '<div style="color:#666">Aucune session sauvegardée</div>'; return; }
      sessions.sort((a,b)=> (b.createdAt||b.updatedAt||0) - (a.createdAt||a.updatedAt||0));
      for (const s of sessions){
        const div = document.createElement('div'); div.style.borderBottom='1px solid #f0f0f0'; div.style.padding='6px 2px';
        const name = s.name || (`session_${s.id}`); const created = new Date(s.createdAt).toLocaleString();
        div.innerHTML = `<div style="font-weight:600">${name}</div><div style="font-size:0.85rem;color:#444">créée: ${created} — pts: ${s.trackCoords? s.trackCoords.length : 0}</div>`;
        const bR = document.createElement('button'); bR.textContent='Reprendre'; bR.className='btn'; bR.style.background='#d6f5d6'; bR.onclick = ()=>resumeSession(s.id);
        const bD = document.createElement('button'); bD.textContent='Supprimer'; bD.className='btn'; bD.style.background='#ffecec'; bD.style.marginLeft='8px'; bD.onclick = async ()=>{ if(!confirm('Supprimer cette session ?')) return; await idbDeleteSession(s.id); btnRefresh.click(); };
        const bZ = document.createElement('button'); bZ.textContent='Exporter ZIP'; bZ.className='btn'; bZ.style.background='#e8f6ff'; bZ.style.marginLeft='8px'; bZ.onclick = async ()=>{
          setStatus('Préparation ZIP session ...');
          const sd = await idbGetSession(s.id);
          const oldT = trackCoords, oldW = waypoints;
          trackCoords = sd.trackCoords || []; waypoints = sd.waypoints || [];
          const blob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
          downloadBlob(blob, `${s.name||s.id}.zip`);
          trackCoords = oldT; waypoints = oldW;
          setStatus('ZIP session téléchargé');
        };
        const btns = document.createElement('div'); btns.style.marginTop='6px';
        btns.appendChild(bR); btns.appendChild(bD); btns.appendChild(bZ);
        div.appendChild(btns); listEl.appendChild(div);
      }
    } catch(e){ console.error('refresh sessions err', e); listEl.innerHTML = '<div style="color:#900">Erreur lecture sessions</div>'; }
  });
  if (btnClear) btnClear.addEventListener('click', async ()=>{ if(!confirm('Supprimer toutes les sessions ?')) return; await idbClearAllSessions(); btnRefresh && btnRefresh.click(); });

  // initial actions
  btnRefresh && btnRefresh.click();
  requestSWCleanup({maxTiles:12000, olderThanDays:7});
  maybeAutoPurgeSessions();
  window.addEventListener('focus', ()=>{ maybeAutoPurgeSessions(); requestSWCleanup({maxTiles:12000, olderThanDays:7}); });
});

/* ---------- sessions / autosave / resume / stop ---------- */
function startNewSessionForRecording(){
  if(!currentSession.id){
    currentSession.id = `s_${Date.now()}`;
    currentSession.name = nowFolderName();
    currentSession.startedAt = Date.now();
  }
  idbSaveSession({
    id: currentSession.id,
    name: currentSession.name,
    createdAt: currentSession.createdAt || Date.now(),
    startedAt: currentSession.startedAt,
    trackCoords: trackCoords || [],
    waypoints: waypoints || []
  }).catch(e => console.warn('idbSaveSession on start err', e));
}

function startNewSessionForDownloadOnly(){
  if(!currentSession.id){
    currentSession.id = `s_${Date.now()}`;
    currentSession.name = nowFolderName();
    currentSession.startedAt = Date.now();
  }
  idbSaveSession({
    id: currentSession.id,
    name: currentSession.name,
    createdAt: currentSession.createdAt || Date.now(),
    startedAt: currentSession.startedAt,
    trackCoords: trackCoords || [],
    waypoints: waypoints || []
  }).catch(e => console.warn('idbSaveSession for download-only failed', e));
}

function startAutosave(){
  stopAutosave();
  currentSession.autosaveIntervalHandle = setInterval(async ()=>{
    try {
      if(!currentSession.id) startNewSessionForRecording();
      const sObj = { id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints };
      await idbSaveSession(sObj);
      if (sessionDirHandle){
        const gpx = generateGPX(trackCoords);
        const blob = new Blob([gpx], {type:'application/gpx+xml'});
        await writeFileToSession(`traces/autosave_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, blob).catch(()=>{});
      }
      showToast(`Autosave ${currentSession.name}: ${trackCoords.length} pts`, 1500);
    } catch(e){
      console.warn('autosave err', e);
    }
  }, 60 * 1000);
}

function stopAutosave(){ if(currentSession && currentSession.autosaveIntervalHandle){ clearInterval(currentSession.autosaveIntervalHandle); currentSession.autosaveIntervalHandle = null; } }

async function resumeSession(sessionId){
  try {
    const s = await idbGetSession(sessionId);
    if(!s) return alert('Session introuvable');
    trackCoords = s.trackCoords || [];
    waypoints = s.waypoints || [];
    currentSession.id = s.id;
    currentSession.name = s.name || (`session_${new Date(s.createdAt).toISOString().replace(/[:.]/g,'-')}`);
    currentSession.startedAt = s.startedAt || s.createdAt || Date.now();
    if (trackCoords.length > 0){
      const last = trackCoords[trackCoords.length - 1];
      map.setView([last.lat, last.lon], 16);
    }
    startTracking(true);
    showToast(`Session ${currentSession.name} reprise`, 3000);
  } catch(e){ console.error('resumeSession err', e); alert('Impossible de reprendre: ' + (e && e.message ? e.message : e)); }
}

function startTracking(resuming = false){
  if (tracking) return;
  if (!('geolocation' in navigator)) return alert('Géolocalisation non supportée');
  if (!resuming){
    trackCoords = [];
    waypoints = [];
    currentSession.id = null;
    currentSession.name = null;
    currentSession.startedAt = Date.now();
  }
  if (!currentSession.id){
    currentSession.id = `s_${Date.now()}`;
    currentSession.name = nowFolderName();
    currentSession.startedAt = Date.now();
  }
  startNewSessionForRecording();
  const options = { enableHighAccuracy:true, maximumAge:1000, timeout:5000 };
  watchId = navigator.geolocation.watchPosition(onPosition, onPosError, options);
  tracking = true;
  setStatus('Enregistrement en cours');
  startAutosave();
}

function onPosition(pos){
  const lat = pos.coords.latitude, lon = pos.coords.longitude, ts = pos.timestamp;
  trackCoords.push({lat,lon,ts});
  if (!window.trackPolyline) window.trackPolyline = L.polyline([], {color:'red'}).addTo(map);
  window.trackPolyline.addLatLng([lat,lon]);
  if(!window.currentMarker) window.currentMarker = L.circleMarker([lat,lon], {radius:6, color:'blue'}).addTo(map);
  else window.currentMarker.setLatLng([lat,lon]);
}
function onPosError(err){ console.warn('geoloc err', err); }

async function stopTracking(){
  if(!tracking) return;
  navigator.geolocation.clearWatch(watchId);
  tracking = false;
  stopAutosave();
  setStatus('Enregistrement stoppé — préparation exports');
  if(trackCoords.length === 0) return alert('Aucune donnée de trace enregistrée');

  if(!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); }
  const sObj = { id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt || Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints, finalizedAt: Date.now() };
  await idbSaveSession(sObj).catch(e=>console.warn('idb final save err', e));

  const gpx = generateGPX(trackCoords);
  const kml = generateKML(trackCoords);
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const gpxName = `${currentSession.name}_trace_${ts}.gpx`, kmlName = `${currentSession.name}_trace_${ts}.kml`;
  const gpxBlob = new Blob([gpx], {type:'application/gpx+xml'}), kmlBlob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});

  if(sessionDirHandle){
    await writeFileToSession(`traces/${gpxName}`, gpxBlob).catch(()=>{});
    await writeFileToSession(`traces/${kmlName}`, kmlBlob).catch(()=>{});
    showToast(`Traces écrites dans ${sessionDirHandle.name}/traces`, 5000);
  } else {
    try {
      const wantZip = confirm('Dossier local non configuré. Télécharger un ZIP contenant la session (tuiles en cache, traces, médias) ?');
      if (wantZip){
        setStatus('Création ZIP session...');
        const zip = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
        downloadBlob(zip, `${currentSession.name}.zip`);
        showToast('ZIP session téléchargé', 5000);
      } else {
        downloadBlob(gpxBlob, gpxName);
        downloadBlob(kmlBlob, kmlName);
        showToast('Traces téléchargées', 4000);
      }
    } catch(e){
      console.error('zip err', e);
      downloadBlob(gpxBlob, gpxName);
      downloadBlob(kmlBlob, kmlName);
      showToast('Traces téléchargées', 4000);
    }
  }

  currentSession.id = null;
  currentSession.name = null;
  currentSession.startedAt = null;
  setStatus('Exports GPX/KML prêts');
  document.getElementById('btn-refresh-sessions') && document.getElementById('btn-refresh-sessions').click();
  maybeAutoPurgeSessions();
}

/* ---------- auto-purge sessions (older than N days) ---------- */
async function purgeSessionsOlderThan(days){
  try {
    const sessions = await idbListSessions();
    const cutoff = Date.now() - days*24*3600*1000;
    let deleted = 0;
    for(const s of sessions){
      const updated = s.updatedAt || s.createdAt || 0;
      if (updated < cutoff){
        await idbDeleteSession(s.id).catch(()=>{});
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
    const days = parseInt(localStorage.getItem('marche_auto_purge_days') || '2', 10);
    if (enabled) {
      await purgeSessionsOlderThan(days);
      document.getElementById('btn-refresh-sessions') && document.getElementById('btn-refresh-sessions').click();
    }
  } catch(e){ console.warn('maybeAutoPurgeSessions err', e); }
}

/* ---------- GPX / KML generation (helpers) ---------- */
function generateGPX(track){
  const header = `<?xml version="1.0" encoding="utf-8"?>\n<gpx version="1.1" creator="marche" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>Trace marche</name><trkseg>`;
  const pts = track.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n');
  return header + '\n' + pts + '\n' + '</trkseg></trk>\n</gpx>';
}
function generateKML(track){
  const coords = track.map(p => `${p.lon},${p.lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>Trace marche</name>\n<Placemark><name>Trace</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>\n</Document></kml>`;
}

/* ---------- Expose debug helpers ---------- */
window.requestSWCleanup = requestSWCleanup;
window.purgeSessionsOlderThan = purgeSessionsOlderThan;

// End of main.js