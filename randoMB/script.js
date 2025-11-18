let map, mbtilesLayer;
let watchId = null;
let trackPoints = [];
let startTime = null;
let timerInterval = null;
let directoryHandle = null;

const $ = id => document.getElementById(id);

// Initialisation de sql.js avec le wasm local
initSqlJs({ locateFile: file => file === 'sql-wasm.wasm' ? 'sql-wasm.wasm' : file }).then(SQL => {
  window.SQL = SQL;
  initMap();
});

async function initMap() {
  map = L.map('map').setView([46.5, 2], 6);

  try {
    const [fileHandle] = await window.showOpenPicker({
      types: [{ description: 'MBTiles', accept: {'application/octet-stream': ['.mbtiles']}}],
      multiple: false
    });
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);

    mbtilesLayer = new L.TileLayer.MBTiles(url, {
      minZoom: 0,
      maxZoom: 18,
      tms: true
    }, window.SQL).addTo(map);  // on passe SQL au plugin

    alert("Fond MBTiles chargé !");
  } catch (e) {
    alert("Aucun MBTiles sélectionné → fond blanc");
  }
}

// ← Le reste du code est STRICTEMENT IDENTIQUE à celui que je t’ai donné précédemment
// (getTracesDirectory, formatTime, haversine, updateInfos, start/stop/save, export GPX/KML)
// Je te le remets complet pour éviter toute erreur de copie :

async function getTracesDirectory() {
  if (directoryHandle) return directoryHandle;
  try {
    const root = await window.showDirectoryPicker();
    let traces = await root.getDirectoryHandle('traces', { create: true });
    directoryHandle = await traces.getDirectoryHandle('randoMB', { create: true });
    return directoryHandle;
  } catch (err) {
    alert("Accès stockage refusé");
    return null;
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2,'0');
  const m = Math.floor((seconds % 3600)/60).toString().padStart(2,'0');
  const s = (seconds % 60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function haversine(lat1,lon1,lat2,lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateInfos() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime)/1000);
  $('time').textContent = formatTime(elapsed);
  let dist = 0;
  for (let i=1; i<trackPoints.length; i++) {
    dist += haversine(trackPoints[i-1].lat, trackPoints[i-1].lon, trackPoints[i].lat, trackPoints[i].lon);
  }
  $('distance').textContent = dist.toFixed(0);
}

$('startBtn').onclick = () => {
  if (watchId) return;
  navigator.geolocation.getCurrentPosition(p => map.setView([p.coords.latitude, p.coords.longitude], 16));
  watchId = navigator.geolocation.watchPosition(pos => {
    const {latitude, longitude} = pos.coords;
    $('pos').textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    trackPoints.push({lat: latitude, lon: longitude, alt: pos.coords.altitude || 0, time: new Date(pos.timestamp)});
    updateInfos();
    if (window.polyline) map.removeLayer(window.polyline);
    window.polyline = L.polyline(trackPoints.map(p=>[p.lat,p.lon]), {color:'#d50000',weight:5}).addTo(map);
    map.fitBounds(window.polyline.getBounds());
  }, err=>alert("GPS : "+err.message), {enableHighAccuracy:true});

  startTime = Date.now();
  timerInterval = setInterval(updateInfos,1000);
  $('startBtn').disabled = true;
  $('stopBtn').disabled = false;
};

$('stopBtn').onclick = () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  clearInterval(timerInterval);
  $('startBtn').disabled = false;
  $('stopBtn').disabled = true;
  $('saveBtn').disabled = false;
};

function exportGPX() {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="randoMB" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Rando ${new Date().toISOString().slice(0,10)}</name><trkseg>`;
  trackPoints.forEach(p => {
    gpx += `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.alt}</ele><time>${p.time.toISOString()}</time></trkpt>`;
  });
  gpx += `</trkseg></trk></gpx>`;
  return new Blob([gpx], {type:'application/gpx+xml'});
}

function exportKML() {
  const coords = trackPoints.map(p => `${p.lon},${p.lat},${p.alt||0}`).join(' ');
  const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Rando ${new Date().toISOString().slice(0,10)}</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`;
  return new Blob([kml], {type:'application/vnd.google-earth.kml+xml'});
}

$('saveBtn').onclick = async () => {
  const dir = await getTracesDirectory();
  if (!dir) return;
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const name = `randoMB_${ts}`;

  const gpxH = await dir.getFileHandle(`${name}.gpx`, {create:true});
  const w1 = await gpxH.createWritable();
  await w1.write(exportGPX()); await w1.close();

  const kmlH = await dir.getFileHandle(`${name}.kml`, {create:true});
  const w2 = await kmlH.createWritable();
  await w2.write(exportKML()); await w2.close();

  alert(`Trace sauvegardée !\nDocuments/traces/randoMB/${name}.gpx et .kml`);
  trackPoints = [];
  $('saveBtn').disabled = true;
  if (window.polyline) map.removeLayer(window.polyline);
};