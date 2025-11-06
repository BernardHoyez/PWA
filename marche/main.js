// main app script: adaptation pour utiliser les tuiles WMTS GéoPlateforme (Plan IGN v2 & Orthophoto)

// --- utilitaires géodésiques / tuiles webmercator ---
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
const EARTH_RADIUS = 6371000;

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
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

function formatCoordFilename(lat,lon){
  return lat.toFixed(6) + '_' + lon.toFixed(6);
}

// --- stockage du point de départ ---
const START_KEY = 'marche_start_point';
function saveStartPoint(lat, lon){
  localStorage.setItem(START_KEY, JSON.stringify({lat,lon,ts:Date.now()}));
}
function loadStartPoint(){
  const v = localStorage.getItem(START_KEY);
  return v ? JSON.parse(v) : null;
}

// --- tuiles: téléchargement ---
async function downloadTilesAround(lat, lon, radiusMeters=10000, zmin=13, zmax=18, tileUrlTemplate, dirHandle=null, onProgress=(s)=>{}) {
  const bbox = bboxAround(lat, lon, radiusMeters);
  const cache = await caches.open('marche-tiles-v1');

  for (let z = zmin; z <= zmax; z++){
    const t1 = latLonToTileXY(bbox.maxLat, bbox.minLon, z); // top-left
    const t2 = latLonToTileXY(bbox.minLat, bbox.maxLon, z); // bottom-right
    const xmin = Math.min(t1.x, t2.x);
    const xmax = Math.max(t1.x, t2.x);
    const ymin = Math.min(t1.y, t2.y);
    const ymax = Math.max(t1.y, t2.y);

    const promises = [];
    for (let x = xmin; x <= xmax; x++){
      for (let y = ymin; y <= ymax; y++){
        const {lat: tileLat, lon: tileLon} = tileXYToLonLat(x + 0.5, y + 0.5, z);
        const d = haversineDistance(lat, lon, tileLat, tileLon);
        if (d <= radiusMeters + 1000) {
          const url = tileUrlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
          promises.push(fetchAndCacheTile(url, cache, dirHandle, z, x, y, onProgress));
        }
      }
    }
    for (const p of promises) await p;
  }
}

function haversineDistance(lat1,lon1,lat2,lon2){
  const dlat = deg2rad(lat2-lat1);
  const dlon = deg2rad(lon2-lon1);
  const a = Math.sin(dlat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dlon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

async function fetchAndCacheTile(url, cache, dirHandle, z, x, y, onProgress){
  try {
    const req = new Request(url, {mode:'cors'});
    const resp = await fetch(req);
    if (!resp.ok) return onProgress && onProgress({url,ok:false,code:resp.status});
    await cache.put(req, resp.clone());
    onProgress && onProgress({url,ok:true});
    if (dirHandle) {
      try {
        const dirZ = await dirHandle.getDirectoryHandle(String(z), {create:true});
        const fileName = `${x}_${y}.png`;
        const fh = await dirZ.getFileHandle(fileName, {create:true});
        const writable = await fh.createWritable();
        const blob = await resp.blob();
        await writable.write(blob);
        await writable.close();
      } catch (e){
        console.warn('Écriture fichier tile échouée:', e);
      }
    }
  } catch (e) {
    console.warn('Erreur fetch tile', url, e);
  }
}

// --- carte / UI ---
let map, planLayer, orthoLayer, startMarker;
let tracking = false;
let watchId = null;
let trackCoords = [];
let waypoints = [];
let currentDirHandle = null;
let mediaRecorder = null;
let recordedChunks = [];

function initMap(){
  map = L.map('map', {preferCanvas:true}).setView([46.5, 2.5], 13);

  const planUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const orthoUrl = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';

  planLayer = L.tileLayer(planUrl, {
    tileSize: 256,
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.ign.fr/">IGN</a> / GéoPlateforme - Plan IGN v2',
    crossOrigin: true
  });

  orthoLayer = L.tileLayer(orthoUrl, {
    tileSize: 256,
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.ign.fr/">IGN</a> / GéoPlateforme - Orthophotos',
    crossOrigin: true
  });

  planLayer.addTo(map);

  const baseMaps = {
    "Plan IGN v2": planLayer,
    "Orthophoto IGN": orthoLayer
  };
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

  // Set default value for tile-url input so download uses Plan IGN by default
  const tileUrlInput = document.getElementById('tile-url');
  tileUrlInput.value = planUrl;
}

function centerOnStart(){
  const s = loadStartPoint();
  if (s) {
    map.setView([s.lat, s.lon], 13);
    if (startMarker) startMarker.remove();
    startMarker = L.marker([s.lat, s.lon]).addTo(map).bindPopup('Départ enregistré').openPopup();
  }
}

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
    latInput.value = s.lat;
    lonInput.value = s.lon;
    centerOnStart();
  }

  btnSave.addEventListener('click', () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    if (isNaN(lat) || isNaN(lon)) return alert('Coordonnées invalides');
    saveStartPoint(lat, lon);
    centerOnStart();
    setStatus('Point de départ enregistré');
  });

  btnChooseFolder.addEventListener('click', async () => {
    if (!window.showDirectoryPicker) {
      alert('API File System Access non supportée par votre navigateur. Un ZIP sera proposé en fallback.');
      return;
    }
    try {
      currentDirHandle = await window.showDirectoryPicker();
      setStatus('Dossier choisi pour sauvegarde: ' + currentDirHandle.name);
    } catch (e) {
      console.warn('Dossier non choisi', e);
    }
  });

  btnDownload.addEventListener('click', async () => {
    const s = loadStartPoint();
    if (!s) return alert('Enregistrez d’abord un point de départ.');
    const tileUrl = tileUrlInput.value.trim();
    setStatus('Téléchargement dalles démarré...');
    try {
      await downloadTilesAround(s.lat, s.lon, 10000, 13, 18, tileUrl, currentDirHandle, (p)=>console.log('tile',p));
      setStatus('Téléchargement dalles terminé (cache local mis à jour).');
      alert('Téléchargement dalles terminé. Les tuiles sont mises en cache pour l\'usage hors-ligne (Cache Storage).');
    } catch (e) {
      console.error(e);
      setStatus('Erreur téléchargement tuiles');
      alert('Erreur lors du téléchargement des tuiles : ' + e);
    }
  });

  document.getElementById('btn-start').addEventListener('click', startTracking);
  document.getElementById('btn-stop').addEventListener('click', stopTracking);
  document.getElementById('btn-photo').addEventListener('click', takePhoto);
  document.getElementById('btn-audio').addEventListener('click', startOrStopAudio);

  centerOnStart();
});

function setStatus(text){
  document.getElementById('status').textContent = 'Statut: ' + text;
}

// --- tracking GPS / photo / audio / export (identique à la version précédente) ---
// (les fonctions onPosition, onPosError, startTracking, stopTracking, generateGPX, generateKML,
// downloadBlob, takePhoto, getCurrentPosition, startOrStopAudio, startAudioRecording)
// sont inchangées et présentes ci-dessous pour complétude.

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
  if (!window.trackPolyline) {
    window.trackPolyline = L.polyline([], {color:'red'}).addTo(map);
  }
  window.trackPolyline.addLatLng([lat,lon]);
  if (!window.currentMarker) {
    window.currentMarker = L.circleMarker([lat,lon], {radius:6, color:'blue'}).addTo(map);
  } else {
    window.currentMarker.setLatLng([lat,lon]);
  }
}

function onPosError(err){
  console.warn('erreur geoloc', err);
}

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
  downloadBlob(new Blob([gpx], {type:'application/gpx+xml'}), gpxName);
  downloadBlob(new Blob([kml], {type:'application/vnd.google-earth.kml+xml'}), kmlName);
  setStatus('Exports GPX/KML prêts');
}

function generateGPX(track, waypointsList){
  const header = `<?xml version="1.0" encoding="utf-8"?>
<gpx version="1.1" creator="marche" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Trace marche</name><trkseg>`;
  const pts = track.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n');
  const footer = `</trkseg></trk>\n</gpx>`;
  return header + '\n' + pts + '\n' + footer;
}

function generateKML(track, waypointsList){
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

async function takePhoto(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    await new Promise(r => setTimeout(r, 500));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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
    downloadBlob(blob, filename);
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
      downloadBlob(blob, filename);
      const marker = L.marker([lat, lon]).addTo(map).bindPopup('Photo @ ' + filename);
      waypoints.push({type:'photo',lat,lon,ts:Date.now(),file:filename});
    };
    input.click();
  }
}

function getCurrentPosition(options={enableHighAccuracy:true,timeout:5000}){
  return new Promise((resolve,reject) => {
    navigator.geolocation.getCurrentPosition(resolve,reject,options);
  });
}

function startOrStopAudio(){
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    setStatus('Arrêt enregistrement audio');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Micro non supporté');
  startAudioRecording();
}

async function startAudioRecording(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => {
      if (e.data.size>0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, {type:'audio/webm'});
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const filename = formatCoordFilename(lat, lon) + '.webm';
      downloadBlob(blob, filename);
      waypoints.push({type:'audio',lat,lon,ts:Date.now(),file:filename});
    };
    mediaRecorder.start();
    setStatus('Enregistrement audio en cours');
  } catch (e) {
    console.error(e);
    alert('Impossible d\'accéder au micro');
  }
}