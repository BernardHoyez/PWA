// main.js — ajout : calcul du nombre de tuiles + estimation poids avant téléchargement
// et limitation du zoom max à 16. Intègre et adapte les fonctions précédentes.

// --- utilitaires ---
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

function showToast(msg, ms=3500){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(()=>{ t.style.display='none'; }, ms);
}

// --- stockage point de départ ---
const START_KEY = 'marche_start_point';
function saveStartPoint(lat, lon){ localStorage.setItem(START_KEY, JSON.stringify({lat,lon,ts:Date.now()})); }
function loadStartPoint(){ const v = localStorage.getItem(START_KEY); return v ? JSON.parse(v) : null; }

// --- File System Access (session) - inchangé ---
let rootDirHandle = null;
let sessionDirHandle = null;

async function chooseRootDir(){
  if (!window.showDirectoryPicker) throw new Error('File System Access non supportée');
  rootDirHandle = await window.showDirectoryPicker();
  return rootDirHandle;
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

// --- tuiles: liste + téléchargement avec progression ---
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

async function listTiles(lat, lon, radiusMeters=10000, zmin=13, zmax=16){
  // Ensure zmax <= 16
  if (zmax > 16) zmax = 16;
  const bbox = bboxAround(lat, lon, radiusMeters);
  const tiles = [];
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
        if (d <= radiusMeters + 1000) {
          tiles.push({z,x,y});
        }
      }
    }
  }
  return tiles;
}

async function downloadTilesAround(lat, lon, radiusMeters=10000, zmin=13, zmax=16, tileUrlTemplate, dirHandle=null, progressCb=(p)=>{}){
  if (zmax > 16) zmax = 16;
  const tiles = await listTiles(lat, lon, radiusMeters, zmin, zmax);
  const total = tiles.length;
  const cache = await caches.open('marche-tiles-v1');
  if (dirHandle && !sessionDirHandle) {
    await createSessionDir();
  }
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
            await writeFileToSession(rel, blob).catch(()=>{ /* ignore FS write errors */ });
          } catch(e){ /* ignore */ }
        }
      }
    } catch(e){
      console.warn('tile fetch err', e);
    }
    count++;
    const pct = Math.round((count/total)*100);
    progressCb({count,total,pct});
  }
  return {count,total};
}

// --- carte / UI + PWA handling ---
let map, planLayer, orthoLayer, startMarker;
let selectedStartMarker = null;
let pwaPromptEvent = null;

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
  tileUrlInput.value = planUrl;

  map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    document.getElementById('lat').value = lat.toFixed(6);
    document.getElementById('lon').value = lon.toFixed(6);
    if (selectedStartMarker) selectedStartMarker.setLatLng([lat, lon]);
    else selectedStartMarker = L.marker([lat, lon], {opacity:0.9}).addTo(map).bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")').openPopup();
    setStatus('Point sélectionné (n\'oubliez pas d\'appuyer sur "Enregistrer point de départ")');
  });
}

// PWA beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwaPromptEvent = e;
  const btn = document.getElementById('btn-install');
  btn.style.display = 'inline-block';
  btn.onclick = async () => {
    if (!pwaPromptEvent) return;
    pwaPromptEvent.prompt();
    const choice = await pwaPromptEvent.userChoice;
    pwaPromptEvent = null;
    btn.style.display = 'none';
    setStatus(choice.outcome === 'accepted' ? 'Application installée' : 'Installation annulée');
  };
});

function setStatus(text){ document.getElementById('status').textContent = 'Statut: ' + text; }

// --- DOM listeners ---
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const latInput = document.getElementById('lat');
  const lonInput = document.getElementById('lon');
  const btnSave = document.getElementById('save-start');
  const btnDownload = document.getElementById('download-tiles');
  const btnChooseFolder = document.getElementById('choose-folder');
  const btnCompute = document.getElementById('compute-tiles');

  const tileUrlInput = document.getElementById('tile-url');
  const zminInput = document.getElementById('zmin');
  const zmaxInput = document.getElementById('zmax');
  const tileEstimateDiv = document.getElementById('tile-estimate');

  const s = loadStartPoint();
  if (s) {
    latInput.value = Number(s.lat).toFixed(6);
    lonInput.value = Number(s.lon).toFixed(6);
    centerOnStart();
  }

  // ensure zmax not > 16
  zmaxInput.addEventListener('change', () => {
    let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) {
      zmax = 16;
      zmaxInput.value = 16;
      showToast('Zoom max limité à 16 pour raison de volume de tuiles');
    }
  });

  btnSave.addEventListener('click', () => {
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

  btnChooseFolder.addEventListener('click', async () => {
    try {
      await chooseRootDir();
      await createSessionDir();
      showToast('Dossier choisi: ' + rootDirHandle.name, 3000);
      setStatus('Dossier choisi pour sauvegarde');
    } catch (e) {
      console.warn(e);
      alert('Choix du dossier impossible : ' + e.message);
    }
  });

  // compute estimate
  btnCompute.addEventListener('click', async () => {
    const rawLat = latInput.value.trim().replace(',', '.');
    const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13;
    let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }
    setStatus('Calcul du nombre de tuiles...');
    const tiles = await listTiles(lat, lon, 10000, zmin, zmax);
    const count = tiles.length;
    // choose average size heuristically
    let avgKB = map.hasLayer(orthoLayer) ? 80 : 40;
    const mb = Math.round((count * avgKB) / 1024 * 10) / 10;
    tileEstimateDiv.innerHTML = `<strong>${count}</strong> tuiles (zoom ${zmin}→${zmax}), estimation ≈ <strong>${mb} MB</strong> (moyenne ${avgKB} KB/tuile). Cliquez sur "Télécharger dalles" pour confirmer.`;
    setStatus('Calcul terminé');
  });

  // download with confirmation
  btnDownload.addEventListener('click', async () => {
    const rawLat = latInput.value.trim().replace(',', '.');
    const rawLon = lonInput.value.trim().replace(',', '.');
    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point sur la carte.');
    let zmin = parseInt(zminInput.value) || 13;
    let zmax = parseInt(zmaxInput.value) || 16;
    if (zmax > 16) { zmax = 16; zmaxInput.value = 16; showToast('Zoom max limité à 16'); }

    // compute tiles and estimate before starting
    setStatus('Calcul du nombre de tuiles avant téléchargement...');
    const tiles = await listTiles(lat, lon, 10000, zmin, zmax);
    const count = tiles.length;
    let avgKB = map.hasLayer(orthoLayer) ? 80 : 40;
    const mb = Math.round((count * avgKB) / 1024 * 10) / 10;

    const proceed = confirm(`Vous êtes sur le point de télécharger ${count} tuiles (zoom ${zmin}→${zmax}). Estimation ≈ ${mb} MB (moyenne ${avgKB} KB/tuile). Continuer ?`);
    if (!proceed) { setStatus('Téléchargement annulé'); return; }

    // show progress UI
    document.getElementById('download-progress').style.display = 'flex';
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressBar.value = 0;
    progressText.textContent = '';

    try {
      // ensure session folder created if rootDirHandle available but no session
      if (rootDirHandle && !sessionDirHandle) await createSessionDir();
      await downloadTilesAround(lat, lon, 10000, zmin, zmax, tileUrlInput.value.trim(), sessionDirHandle, (p)=>{
        progressBar.value = p.pct;
        progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`;
      });
      setStatus('Téléchargement dalles terminé (cache local mis à jour).');
      showToast(`Tuiles: ${count} téléchargées.`, 5000);
    } catch (e) {
      console.error(e);
      setStatus('Erreur téléchargement tuiles');
      alert('Erreur lors du téléchargement des tuiles : ' + e);
    } finally {
      document.getElementById('download-progress').style.display = 'none';
      progressBar.value = 0;
      progressText.textContent = '';
    }
  });

  // map center on saved start
  centerOnStart();

  // Controls for start/photo/audio/stop
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

// --- tracking/photo/audio/export functions ---
// (les fonctions startTracking, onPosition, stopTracking, generateGPX, generateKML,
// downloadBlob, takePhoto, getCurrentPosition, startAudioRecording etc. doivent être présentes
// telles qu'implémentées précédemment ; pour concision on suppose qu'elles sont inchangées dans ce fichier
// et compatibles avec la logique de sessionDirHandle utilisée ci-dessus.)

// Pour rappel, les fonctions de capture et d'export utilisées par l'UI existent dans la version précédente
// (takePhoto, startAudioRecording, stopTracking, generateGPX/generateKML, downloadBlob) et écrivent dans
// sessionDirHandle quand il est présent.