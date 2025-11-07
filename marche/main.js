// main.js — version complète prête à coller
// Fonctionnalités : carte IGN via GéoPlateforme, sélection du départ sur carte ou saisie,
// estimation tuiles (instantanée + calcul exact non bloquant), plafond automatique (>10000),
// téléchargement tuiles (zmax ≤ 16) avec barre de progression, sauvegarde optionnelle via
// File System Access (session folder), fallback ZIP si API non supportée/annulée,
// tracking GPS, photo géolocalisée (overlay coord), enregistrement audio, export GPX/KML,
// gestion PWA install prompt.
// Dépendances attendues dans index.html : Leaflet, JSZip (pour ZIP fallback).

/* ------------- utilitaires ------------- */
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
const EARTH_RADIUS = 6371000;

function formatCoordFilename(lat,lon){
  return lat.toFixed(6) + '_' + lon.toFixed(6);
}

function nowFolderName(){
  const dt = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `marche_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;
}

function setStatus(text){ const s=document.getElementById('status'); if(s) s.textContent = 'Statut: ' + text; }
function showToast(msg, ms=3500){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(()=>{ t.style.display='none'; }, ms);
}

/* ------------- stockage départ ------------- */
const START_KEY = 'marche_start_point';
function saveStartPoint(lat, lon){ localStorage.setItem(START_KEY, JSON.stringify({lat,lon,ts:Date.now()})); }
function loadStartPoint(){ const v = localStorage.getItem(START_KEY); return v ? JSON.parse(v) : null; }

/* ------------- File System Access (session) ------------- */
let rootDirHandle = null;
let sessionDirHandle = null;

async function chooseRootDir_native(){
  if (!window.showDirectoryPicker) throw new Error('File System Access API non supportée');
  const dir = await window.showDirectoryPicker();
  return dir;
}

async function createSessionDir(){
  if (!rootDirHandle) return null;
  const name = nowFolderName();
  sessionDirHandle = await rootDirHandle.getDirectoryHandle(name, {create:true});
  await sessionDirHandle.getDirectoryHandle('tiles', {create:true});
  await sessionDirHandle.getDirectoryHandle('media', {create:true});
  await sessionDirHandle.getDirectoryHandle('traces', {create:true});
  return sessionDirHandle;
}

async function writeFileToSession(relativePath, blob){
  if (!sessionDirHandle) {
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
  const writable = await fh.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

/* ------------- tiles / webmercator helpers ------------- */
function latLonToTileXY(lat, lon, z){
  const latRad = deg2rad(lat);
  const n = Math.pow(2, z);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * n);
  return {x,y};
}
function tileXYToLonLat(x,y,z){
  const n = Math.pow(2,z);
  const lon = x / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = rad2deg(latRad);
  return {lat, lon};
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

/* ------------- estimation rapide + calcul exact non-bloquant ------------- */
function quickEstimateTiles(lat, lon, radiusMeters = 10000, zmin = 13, zmax = 16){
  if (zmax > 16) zmax = 16;
  const latRad = deg2rad(lat);
  const cosLat = Math.cos(latRad);
  const worldCirc = 40075016.686; // m
  let totalTiles = 0;
  for (let z = zmin; z <= zmax; z++){
    const tileSizeEquator = worldCirc / Math.pow(2, z);
    const tileWidthEW = tileSizeEquator * cosLat;
    const tileAreaApprox = Math.max(1, tileSizeEquator * tileWidthEW);
    const circleArea = Math.PI * radiusMeters * radiusMeters;
    const tilesApprox = Math.ceil(circleArea / tileAreaApprox);
    totalTiles += tilesApprox;
  }
  return totalTiles;
}

// listTilesAsync : non bloquante, callback progressCb({countSoFar, totalEstimate, z, x, y, done})
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

/* ------------- téléchargement des tuiles depuis une liste ------------- */
async function downloadTilesAroundFromList(tiles, tileUrlTemplate, progressCb=(p)=>{}){
  const total = tiles.length;
  const cache = await caches.open('marche-tiles-v1');
  let count = 0;
  for (const t of tiles){
    const url = tileUrlTemplate.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
    try {
      const req = new Request(url, {mode:'cors'});
      const resp = await fetch(req);
      if (resp && resp.ok) {
        await cache.put(req, resp.clone());
        if (sessionDirHandle){
          try {
            const blob = await resp.blob();
            const rel = `tiles/${t.z}/${t.x}_${t.y}.png`;
            await writeFileToSession(rel, blob).catch(()=>{});
          } catch(e){ /* ignore */ }
        }
      }
    } catch (e){
      console.warn('Erreur fetch tile', url, e);
    }
    count++;
    const pct = Math.round((count/total)*100);
    progressCb({count,total,pct});
  }
  return {count,total};
}

/* ------------- ZIP fallback (JSZip) & helpers ------------- */
function downloadBlobWithName(blob, filename){
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

  // tiles from cache
  try {
    const cache = await caches.open('marche-tiles-v1');
    const requests = await cache.keys();
    if (requests.length > 0 && includeTiles) {
      const tilesFolder = zip.folder('tiles');
      for (const req of requests) {
        try {
          const resp = await cache.match(req);
          if (!resp) continue;
          // attempt to create human filename from path
          let entryName = (() => {
            try {
              const url = new URL(req.url);
              const parts = url.pathname.split('/');
              const last3 = parts.slice(-3).join('_');
              return last3 || encodeURIComponent(req.url);
            } catch(e){ return encodeURIComponent(req.url); }
          })();
          const blob = await resp.blob();
          tilesFolder.file(entryName, blob);
        } catch (e) {
          console.warn('Erreur lecture tile cache', e);
        }
      }
    }
  } catch (e) {
    console.warn('Impossible d\'ouvrir cache marche-tiles-v1 :', e);
  }

  // traces from in-memory trackCoords
  try {
    if (includeTraces && typeof trackCoords !== 'undefined' && trackCoords && trackCoords.length>0) {
      const gpxText = (function generateGPX(track){
        const header = `<?xml version="1.0" encoding="utf-8"?>
<gpx version="1.1" creator="marche" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Trace marche</name><trkseg>`;
        const pts = track.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n');
        return header + '\n' + pts + '\n' + `</trkseg></trk>\n</gpx>`;
      })(trackCoords);
      const kmlText = (function generateKML(track){
        const coords = track.map(p => `${p.lon},${p.lat},0`).join(' ');
        return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><name>Trace marche</name>
<Placemark><name>Trace</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>
</Document></kml>`;
      })(trackCoords);
      const tracesFolder = zip.folder('traces');
      tracesFolder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, gpxText);
      tracesFolder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.kml`, kmlText);
    }
  } catch(e){
    console.warn('Erreur création traces dans ZIP', e);
  }

  // media from in-memory waypoints (if we stored blobs)
  try {
    if (includeMedia && typeof waypoints !== 'undefined' && waypoints && waypoints.length>0) {
      const mediaFolder = zip.folder('media');
      for (const wp of waypoints) {
        if (wp.blob && wp.file) {
          mediaFolder.file(wp.file, wp.blob);
        }
      }
    }
  } catch(e){
    console.warn('Erreur ajout médias dans ZIP', e);
  }

  const zipBlob = await zip.generateAsync({type:'blob'});
  return zipBlob;
}

/* ------------- enhanced choose folder handler with fallback ------------- */
async function tryPickDirectoryWithFallback() {
  if (!window.showDirectoryPicker) throw new Error('File System Access API non supportée');
  try {
    const dir = await window.showDirectoryPicker();
    return dir;
  } catch (err) {
    // propagate the error to caller (caller will handle fallback)
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
      if (!fallback) {
        setStatus('Choix dossier annulé');
        return;
      }
      setStatus('Création d\'un ZIP de secours (tuiles + traces) ...');
      const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
      const name = `marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
      downloadBlobWithName(zipBlob, name);
      setStatus('ZIP créé et téléchargé');
      showToast('ZIP créé et téléchargé', 4000);
      return;
    }
  } finally {
    if (chooseBtn) chooseBtn.disabled = false;
  }
}

/* ------------- map, UI, PWA install handling ------------- */
let map, planLayer, orthoLayer, startMarker;
let selectedStartMarker = null;
let pwaPromptEvent = null;
let lastTilesCache = {lat:null, lon:null, zmin:null, zmax:null, tiles:null, computedAt:null};

function initMap(){
  map = L.map('map', {preferCanvas:true}).setView([46.5, 2.5], 13);

  const planUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const orthoUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';

  planLayer = L.tileLayer(planUrl, { tileSize: 256, maxZoom: 18, attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2', crossOrigin: true });
  orthoLayer = L.tileLayer(orthoUrl, { tileSize: 256, maxZoom: 18, attribution: '&copy; IGN / GéoPlateforme - Orthophotos', crossOrigin: true });

  planLayer.addTo(map);
  const baseMaps = { "Plan IGN v2": planLayer, "Orthophoto IGN": orthoLayer };
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

  const tileUrlInput = document.getElementById('tile-url');
  if (tileUrlInput) tileUrlInput.value = planUrl;

  map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    const latInput = document.getElementById('lat');
    const lonInput = document.getElementById('lon');
    if (latInput) latInput.value = lat.toFixed(6);
    if (lonInput) lonInput.value = lon.toFixed(6);
    if (selectedStartMarker) selectedStartMarker.setLatLng([lat, lon]);
    else selectedStartMarker = L.marker([lat, lon], {opacity:0.9}).addTo(map).bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")').openPopup();
    setStatus('Point sélectionné (n\'oubliez pas d\'appuyer sur "Enregistrer point de départ")');
  });
}

// beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwaPromptEvent = e;
  const btn = document.getElementById('btn-install');
  if(btn){
    btn.style.display = 'inline-block';
    btn.onclick = async () => {
      if (!pwaPromptEvent) return;
      pwaPromptEvent.prompt();
      const choice = await pwaPromptEvent.userChoice;
      pwaPromptEvent = null;
      btn.style.display = 'none';
      setStatus(choice.outcome === 'accepted' ? 'Application installée' : 'Installation annulée');
    };
  }
});

/* ------------- DOM wiring (DOMContentLoaded) ------------- */
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const latInput = document.getElementById('lat');
  const lonInput = document.getElementById('lon');
  const btnSave = document.getElementById('save-start');
  const btnDownload = document.getElementById('download-tiles');
  const btnChooseFolder = document.getElementById('choose-folder');
  const btnCompute = document.getElementById('compute-tiles');
  const zminInput = document.getElementById('zmin');
  const zmaxInput = document.getElementById('zmax');
  const tileUrlInput = document.getElementById('tile-url');
  const tileEstimateDiv = document.getElementById('tile-estimate');

  // restore saved start
  const s = loadStartPoint();
  if (s){
    if(latInput) latInput.value = Number(s.lat).toFixed(6);
    if(lonInput) lonInput.value = Number(s.lon).toFixed(6);
    centerOnStart();
  }

  // choose folder button: adapt based on FS API support
  if (btnChooseFolder){
    if ('showDirectoryPicker' in window){
      btnChooseFolder.textContent = 'Choisir dossier (optionnel)';
      btnChooseFolder.onclick = enhancedChooseFolderHandler;
    } else {
      btnChooseFolder.textContent = 'Créer ZIP (fallback)';
      btnChooseFolder.title = 'Votre navigateur ne supporte pas la sélection de dossier — création d\'un ZIP fallback';
      btnChooseFolder.onclick = async () => {
        const confirmZip = confirm('Votre navigateur ne supporte pas la sélection de dossier. Voulez-vous créer immédiatement un ZIP contenant tuiles, traces et médias (fallback) ?');
        if (confirmZip){
          setStatus('Création du ZIP fallback ...');
          try {
            const zipBlob = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true});
            const name = `marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
            downloadBlobWithName(zipBlob, name);
            showToast('ZIP créé et téléchargé', 4000);
            setStatus('ZIP créé et téléchargé');
          } catch(e){
            console.error(e);
            alert('Erreur création ZIP fallback: ' + (e.message||e));
            setStatus('Erreur création ZIP');
          }
        } else setStatus('Création ZIP annulée');
      };
    }
  }

  // zmax clamp UI
  if (zmaxInput){
    zmaxInput.addEventListener('change', () => {
      let zmax = parseInt(zmaxInput.value) || 16;
      if (zmax > 16){
        zmax = 16;
        zmaxInput.value = 16;
        showToast('Zoom max limité à 16 pour raison de volume de tuiles');
      }
    });
  }

  if (btnSave) btnSave.addEventListener('click', () => {
    const rawLat = latInput.value.trim().replace(',', '.');
    const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Format: degrés décimaux (ex: 46.123456)');
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return alert('Coordonnées hors plage valide');
    saveStartPoint(lat, lon);
    if (selectedStartMarker) { selectedStartMarker.remove(); selectedStartMarker = null; }
    centerOnStart();
    setStatus('Point de départ enregistré');
  });

  if (btnCompute) btnCompute.addEventListener('click', async () => {
    const rawLat = latInput.value.trim().replace(',', '.');
    const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13;
    let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }

    setStatus('Calcul approximation (instantanée)...');
    const approxCount = quickEstimateTiles(lat, lon, 10000, zmin, zmax);
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const approxMB = Math.round((approxCount * avgKB) / 1024 * 10) / 10;
    tileEstimateDiv.innerHTML = `<strong>≈ ${approxCount}</strong> tuiles (approx.) — estimation ≈ <strong>${approxMB} MB</strong> (moyenne ${avgKB} KB/tuile). Calcul exact en cours...`;

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
      setStatus('Calcul exact terminé');
      showToast(`Calcul exact terminé: ${tiles.length} tuiles.`, 3000);
    } catch (e) {
      console.error(e);
      tileEstimateDiv.innerHTML = `Erreur lors du calcul exact : ${e.message || e}`;
      setStatus('Erreur calcul dalles');
    }
  });

  if (btnDownload) btnDownload.addEventListener('click', async () => {
    const rawLat = latInput.value.trim().replace(',', '.');
    const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13;
    let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }

    setStatus('Vérification du nombre de tuiles avant téléchargement...');
    let tiles = null;
    if (lastTilesCache && lastTilesCache.lat === lat && lastTilesCache.lon === lon && lastTilesCache.zmin === zmin && lastTilesCache.zmax === zmax && lastTilesCache.tiles){
      tiles = lastTilesCache.tiles;
    } else {
      const tileEstimateDiv = document.getElementById('tile-estimate');
      tileEstimateDiv.innerHTML = 'Calcul exact en cours (préparation au téléchargement)...';
      try {
        tiles = await listTilesAsync(lat, lon, 10000, zmin, zmax, (p) => {
          tileEstimateDiv.innerHTML = `Calcul exact: ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z || '-'})`;
        });
        lastTilesCache = { lat, lon, zmin, zmax, tiles, computedAt: Date.now() };
      } catch (e){
        console.error(e);
        alert('Erreur lors du calcul des tuiles: ' + (e.message||e));
        setStatus('Erreur calcul dalles');
        return;
      }
    }

    const count = tiles.length;
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const mb = Math.round((count * avgKB) / 1024 * 10) / 10;

    const MAX_TILES_SAFE = 10000;
    if (count > MAX_TILES_SAFE){
      const warn = `ATTENTION: ${count} tuiles vont être téléchargées (≈ ${mb} MB). C'est plus que ${MAX_TILES_SAFE} tuiles.\n` +
                   `Pour confirmer le téléchargement tapez le mot CONFIRM dans la boîte qui suit. Sinon le téléchargement sera annulé.`;
      const user = prompt(warn, '');
      if (user !== 'CONFIRM'){
        showToast('Téléchargement annulé (confirmation manquante)', 4000);
        setStatus('Téléchargement annulé');
        return;
      }
    } else {
      const proceed = confirm(`Vous êtes sur le point de télécharger ${count} tuiles (≈ ${mb} MB). Continuer ?`);
      if (!proceed){ setStatus('Téléchargement annulé'); return; }
    }

    document.getElementById('download-progress').style.display = 'flex';
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressBar.value = 0;
    progressText.textContent = '';

    try {
      if (rootDirHandle && !sessionDirHandle) await createSessionDir();
      await downloadTilesAroundFromList(tiles, (tileUrlInput || {}).value || '', (p) => {
        progressBar.value = p.pct;
        progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`;
      });
      setStatus('Téléchargement dalles terminé (cache local mis à jour).');
      showToast(`Tuiles: ${count} téléchargées.`, 5000);
    } catch (e){
      console.error(e);
      setStatus('Erreur téléchargement tuiles');
      alert('Erreur lors du téléchargement des tuiles : ' + (e.message||e));
    } finally {
      document.getElementById('download-progress').style.display = 'none';
      progressBar.value = 0;
      progressText.textContent = '';
    }
  });

  // actions for tracking/photo/audio/stop
  document.getElementById('btn-start').addEventListener('click', startTracking);
  document.getElementById('btn-stop').addEventListener('click', stopTracking);
  document.getElementById('btn-photo').addEventListener('click', takePhoto);
  document.getElementById('btn-audio-start').addEventListener('click', async () => {
    try {
      await startAudioRecording();
      document.getElementById('btn-audio-start').disabled = true;
      document.getElementById('btn-audio-stop').disabled = false;
    } catch(e){ alert(e.message || e); }
  });
  document.getElementById('btn-audio-stop').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      document.getElementById('btn-audio-start').disabled = false;
      document.getElementById('btn-audio-stop').disabled = true;
    }
  });

});

/* ------------- tracking / photo / audio / export ------------- */
// state
let tracking = false;
let watchId = null;
let trackCoords = [];
let waypoints = []; // can include {type,lat,lon,ts,file,blob}
let mediaRecorder = null;
let recordedChunks = [];

function centerOnStart(){
  const s = loadStartPoint();
  if (s && typeof s.lat === 'number' && typeof s.lon === 'number'){
    map.setView([s.lat, s.lon], 13);
    if (startMarker) startMarker.remove();
    startMarker = L.marker([s.lat, s.lon]).addTo(map).bindPopup('Départ enregistré').openPopup();
  }
}

function startTracking(){
  if (tracking) return;
  if (!('geolocation' in navigator)) return alert('Géolocalisation non supportée');
  trackCoords = [];
  waypoints = [];
  const options = {enableHighAccuracy:true, maximumAge:1000, timeout:5000};
  watchId = navigator.geolocation.watchPosition(onPosition, onPosError, options);
  tracking = true;
  setStatus('Enregistrement en cours');
}

function onPosition(pos){
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const ts = pos.timestamp;
  trackCoords.push({lat,lon,ts});
  if (!window.trackPolyline) window.trackPolyline = L.polyline([], {color:'red'}).addTo(map);
  window.trackPolyline.addLatLng([lat,lon]);
  if (!window.currentMarker) window.currentMarker = L.circleMarker([lat,lon], {radius:6, color:'blue'}).addTo(map);
  else window.currentMarker.setLatLng([lat,lon]);
}

function onPosError(err){ console.warn('erreur geoloc', err); }

async function stopTracking(){
  if (!tracking) return;
  navigator.geolocation.clearWatch(watchId);
  tracking = false;
  setStatus('Enregistrement stoppé — préparation exports');
  if (trackCoords.length === 0) return alert('Aucune donnée de trace enregistrée');
  const gpx = generateGPX(trackCoords);
  const kml = generateKML(trackCoords);
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const gpxName = `trace_${ts}.gpx`;
  const kmlName = `trace_${ts}.kml`;

  const gpxBlob = new Blob([gpx], {type:'application/gpx+xml'});
  const kmlBlob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});

  if (sessionDirHandle) {
    await writeFileToSession(`traces/${gpxName}`, gpxBlob).catch(()=>{});
    await writeFileToSession(`traces/${kmlName}`, kmlBlob).catch(()=>{});
    showToast(`Traces sauvegardées dans ${sessionDirHandle.name}/traces`, 5000);
  } else {
    downloadBlobWithName(gpxBlob, gpxName);
    downloadBlobWithName(kmlBlob, kmlName);
    showToast('Traces téléchargées (dossier Téléchargements)', 4000);
  }
  setStatus('Exports GPX/KML prêts');
}

function generateGPX(track){
  const header = `<?xml version="1.0" encoding="utf-8"?>
<gpx version="1.1" creator="marche" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Trace marche</name><trkseg>`;
  const pts = track.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n');
  const footer = `</trkseg></trk>\n</gpx>`;
  return header + '\n' + pts + '\n' + footer;
}

function generateKML(track){
  const coords = track.map(p => `${p.lon},${p.lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><name>Trace marche</name>
<Placemark><name>Trace</name><LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>
</Document></kml>`;
}

/* ------------- photo capture ------------- */
async function getCurrentPosition(options={enableHighAccuracy:true,timeout:5000}){
  return new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,options));
}

async function takePhoto(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    await new Promise(r => setTimeout(r, 500));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pos = await getCurrentPosition();
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, canvas.height - 40, 360, 30);
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText(lat.toFixed(6) + ', ' + lon.toFixed(6), 16, canvas.height - 18);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
    const filename = formatCoordFilename(lat, lon) + '.jpg';

    // store blob in waypoints array to potentially include in ZIP
    try {
      await (async () => {
        if (sessionDirHandle) {
          await writeFileToSession(`media/${filename}`, blob).catch(()=>{});
          showToast(`Photo sauvegardée dans ${sessionDirHandle.name}/media/${filename}`, 5000);
        } else {
          downloadBlobWithName(blob, filename);
          showToast(`Photo téléchargée (${filename})`, 4000);
        }
      })();
    } catch(e){
      console.warn('Erreur sauvegarde photo', e);
    }

    // push waypoint with blob for ZIP fallback (if desired)
    waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename,blob});

    L.marker([lat, lon]).addTo(map).bindPopup('Photo @ ' + filename);
    const tracks = video.srcObject.getTracks();
    tracks.forEach(t => t.stop());
  } catch (e) {
    console.warn('Capture caméra impossible, fallback file input', e);
    const input = document.getElementById('photo-input');
    input.onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(10, canvas.height - 40, 360, 30);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText(lat.toFixed(6) + ', ' + lon.toFixed(6), 16, canvas.height - 18);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
      const filename = formatCoordFilename(lat, lon) + '.jpg';
      if (sessionDirHandle) {
        await writeFileToSession(`media/${filename}`, blob).catch(()=>{});
        showToast(`Photo sauvegardée dans ${sessionDirHandle.name}/media/${filename}`, 5000);
      } else {
        downloadBlobWithName(blob, filename);
        showToast(`Photo téléchargée (${filename})`, 4000);
      }
      L.marker([lat, lon]).addTo(map).bindPopup('Photo @ ' + filename);
      waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename,blob});
    };
    input.click();
  }
}

/* ------------- audio recording ------------- */
async function startAudioRecording(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Micro non supporté');
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => { if (e.data.size>0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, {type:'audio/webm'});
    const pos = await getCurrentPosition();
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const filename = formatCoordFilename(lat, lon) + '.webm';
    if (sessionDirHandle) {
      await writeFileToSession(`media/${filename}`, blob).catch(()=>{});
      showToast(`Enregistrement audio sauvegardé dans ${sessionDirHandle.name}/media/${filename}`, 5000);
    } else {
      downloadBlobWithName(blob, filename);
      showToast(`Enregistrement audio téléchargé (${filename})`, 4000);
    }
    waypoints.push({type:'audio',lat,lon,ts:Date.now(),file:filename,blob});
    stream.getTracks().forEach(t=>t.stop());
  };
  mediaRecorder.start();
  setStatus('Enregistrement audio en cours');
}