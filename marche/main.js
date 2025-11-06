// main.js — améliorations : installation PWA, progression téléchargement, sauvegarde dans dossier session,
// messages photo/audio, boutons audio séparés, regroupement media+traces dans dossier unique.

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

// --- gestion session dossier (File System Access) ---
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
  // create subfolders
  await sessionDirHandle.getDirectoryHandle('tiles', {create:true});
  await sessionDirHandle.getDirectoryHandle('media', {create:true});
  await sessionDirHandle.getDirectoryHandle('traces', {create:true});
  return sessionDirHandle;
}

async function writeFileToSession(relativePath, blob){
  // relativePath e.g. 'media/photo.jpg' or 'traces/trace.gpx' or 'tiles/13/123_456.png'
  if (!sessionDirHandle) {
    // try to create one automatically under rootDirHandle
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
function deg2rad(d){ return d * Math.PI / 180; } // duplicate safe
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

async function listTiles(lat, lon, radiusMeters=10000, zmin=13, zmax=18){
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

async function downloadTilesAround(lat, lon, radiusMeters=10000, zmin=13, zmax=18, tileUrlTemplate, dirHandle=null, progressCb=(p)=>{}){
  const tiles = await listTiles(lat, lon, radiusMeters, zmin, zmax);
  const total = tiles.length;
  const cache = await caches.open('marche-tiles-v1');
  // ensure session dir exists
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

// --- carte / UI + PWA install handling ---
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

// set status util
function setStatus(text){ document.getElementById('status').textContent = 'Statut: ' + text; }

// --- init DOM listeners, folder selection, download with progress ---
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const latInput = document.getElementById('lat');
  const lonInput = document.getElementById('lon');
  const btnSave = document.getElementById('save-start');
  const btnDownload = document.getElementById('download-tiles');
  const btnChooseFolder = document.getElementById('choose-folder');

  const tileUrlInput = document.getElementById('tile-url');

  const s = loadStartPoint();
  if (s) {
    latInput.value = Number(s.lat).toFixed(6);
    lonInput.value = Number(s.lon).toFixed(6);
    centerOnStart();
  }

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

  btnDownload.addEventListener('click', async () => {
    const s = loadStartPoint();
    if (!s) return alert('Enregistrez d’abord un point de départ.');
    const tileUrl = tileUrlInput.value.trim();
    setStatus('Téléchargement dalles démarré...');
    document.getElementById('download-progress').style.display = 'flex';
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    try {
      // ensure session folder created if rootDirHandle available but no session
      if (rootDirHandle && !sessionDirHandle) await createSessionDir();
      const res = await downloadTilesAround(s.lat, s.lon, 10000, 13, 18, tileUrl, sessionDirHandle, (p)=>{
        progressBar.value = p.pct;
        progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`;
      });
      setStatus('Téléchargement dalles terminé (cache local mis à jour).');
      showToast(`Tuiles: ${res.count} téléchargées.`, 5000);
    } catch (e) {
      console.error(e);
      setStatus('Erreur téléchargement tuiles');
      alert('Erreur lors du téléchargement des tuiles : ' + e);
    } finally {
      document.getElementById('download-progress').style.display = 'none';
      progressBar.value = 0;
      document.getElementById('progress-text').textContent = '';
    }
  });

  // Map center on saved start
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

// --- tracking, photo, audio, export (improved writes into session if present) ---
let tracking = false;
let watchId = null;
let trackCoords = [];
let waypoints = [];
let mediaRecorder = null;
let recordedChunks = [];

function centerOnStart(){
  const s = loadStartPoint();
  if (s && typeof s.lat === 'number' && typeof s.lon === 'number') {
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
  const gpx = generateGPX(trackCoords, waypoints);
  const kml = generateKML(trackCoords, waypoints);
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const gpxName = `trace_${ts}.gpx`;
  const kmlName = `trace_${ts}.kml`;

  const gpxBlob = new Blob([gpx], {type:'application/gpx+xml'});
  const kmlBlob = new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});

  if (sessionDirHandle) {
    await writeFileToSession(`traces/${gpxName}`, gpxBlob).catch(()=>{ /* ignore */ });
    await writeFileToSession(`traces/${kmlName}`, kmlBlob).catch(()=>{ /* ignore */ });
    showToast(`Traces sauvegardées dans ${sessionDirHandle.name}/traces`, 5000);
  } else {
    downloadBlob(gpxBlob, gpxName);
    downloadBlob(kmlBlob, kmlName);
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

// --- photo capture (message + save to session if present) ---
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

    if (sessionDirHandle) {
      await writeFileToSession(`media/${filename}`, blob).catch(()=>{ /* ignore */ });
      showToast(`Photo sauvegardée dans ${sessionDirHandle.name}/media/${filename}`, 5000);
    } else {
      downloadBlob(blob, filename);
      showToast(`Photo téléchargée (${filename})`, 4000);
    }
    const marker = L.marker([lat, lon]).addTo(map).bindPopup('Photo @ ' + filename);
    waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename});
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
        downloadBlob(blob, filename);
        showToast(`Photo téléchargée (${filename})`, 4000);
      }
      L.marker([lat, lon]).addTo(map).bindPopup('Photo @ ' + filename);
      waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename});
    };
    input.click();
  }
}

// --- audio recording with explicit start/stop and save into session if present ---
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
      downloadBlob(blob, filename);
      showToast(`Enregistrement audio téléchargé (${filename})`, 4000);
    }
    waypoints.push({type:'audio',lat,lon,ts:Date.now(),file:filename});
    // stop tracks
    stream.getTracks().forEach(t=>t.stop());
  };
  mediaRecorder.start();
  setStatus('Enregistrement audio en cours');
}
