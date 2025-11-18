let map, mbtilesLayer;
let watchId = null;
let trackPoints = [];
let startTime = null;
let timerInterval = null;
let directoryHandle = null;

const $ = id => document.getElementById(id);

// Cartes gratuites et légales (mises à jour 2025)
const cartesDisponibles = [
  { nom: "France entière (OSM 2025) ~420 Mo", url: "https://download.osmand.net/mbtiles/france.mbtiles" },
  { nom: "Auvergne-Rhône-Alpes ~98 Mo", url: "https://osm.fr/download/mbtiles/auvergne-rhone-alpes.mbtiles" },
  { nom: "Occitanie ~88 Mo", url: "https://osm.fr/download/mbtiles/occitanie.mbtiles" },
  { nom: "PACA ~72 Mo", url: "https://osm.fr/download/mbtiles/paca.mbtiles" },
  { nom: "Île-de-France ~48 Mo", url: "https://osm.fr/download/mbtiles/ile-de-france.mbtiles" },
  { nom: "Alpes (zoom détaillé) ~195 Mo", url: "https://data.mobiteach.eu/mbtiles/alps.mbtiles" },
  { nom: "Pyrénées ~125 Mo", url: "https://data.mobiteach.eu/mbtiles/pyrenees.mbtiles" }
];

initSqlJs({ locateFile: () => 'sql-wasm.wasm' }).then(SQL => {
  window.SQL = SQL;

  $('fromFileBtn').onclick = loadFromFile;
  $('downloadBtn').onclick = showDownloadList;
  $('noMapBtn').onclick = () => {
    initMap();
    $('welcome').style.display = 'none';
  };
});

function initMap() {
  map = L.map('map').setView([46.5, 2], 6);
  if (!mbtilesLayer) L.tileLayer('').addTo(map); // fond blanc si aucune carte
}

async function loadFromFile() {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'Fichier MBTiles', accept: {'application/octet-stream': ['.mbtiles']}}]
    });
    const file = await fileHandle.getFile();
    await loadMBTilesBlob(file);
  } catch (e) {}
}

function showDownloadList() {
  let html = `<div style="text-align:center;padding:20px;color:white;">
    <h2>Télécharger une carte</h2>
    <div style="max-height:65vh;overflow-y:auto;margin:20px 0">`;
  cartesDisponibles.forEach((c,i) => {
    html += `<button class="dlbtn" data-i="${i}" style="display:block;width:90%;margin:10px auto;padding:14px;font-size:1.1em;background:#2196f3;color:white;border:none;border-radius:10px;">${c.nom}</button>`;
  });
  html += `</div><button id="cancelBtn" style="background:#c62828;padding:12px 20px;border:none;border-radius:8px;color:white;">Annuler</button></div>`;

  const overlay = document.createElement('div');
  overlay.id = 'dlOverlay';
  overlay.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:5000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.dlbtn').forEach(b => b.onclick = () => downloadCarte(b.dataset.i));
  $('cancelBtn').onclick = () => overlay.remove();
}

async function downloadCarte(idx) {
  const carte = cartesDisponibles[idx];
  const overlay = $('dlOverlay');
  overlay.innerHTML = `<div style="text-align:center;color:white;">
    <h2>Téléchargement en cours…</h2>
    <p>${carte.nom}</p>
    <progress id="prog" value="0" max="100" style="width:80%;height:20px;"></progress>
    <p id="percent">0%</p>
  </div>`;

  try {
    const response = await fetch(carte.url);
    if (!response.ok) throw new Error('Non trouvé');
    const total = +response.headers.get('content-length');
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) {
        const pct = Math.round(received / total * 100);
        $('prog').value = pct;
        $('percent').textContent = pct + '%';
      }
    }
    const blob = new Blob(chunks);
    await loadMBTilesBlob(blob, carte.nom);
    overlay.remove();
  } catch (e) {
    overlay.innerHTML += `<p style="color:#ff4444">Échec – vérifie ta connexion Wi-Fi</p>`;
  }
}

async function loadMBTilesBlob(blob, name = "carte") {
  const url = URL.createObjectURL(blob);
  if (!map) initMap();
  if (mbtilesLayer) map.removeLayer(mbtilesLayer);

  mbtilesLayer = new L.TileLayer.MBTiles(url, { minZoom:0, maxZoom:20, tms:true }, window.SQL).addTo(map);
  $('welcome').style.display = 'none';
  alert(`Carte chargée avec succès !\n${name}\nBonne randonnée 🥾`);
}

// ====================== TRACKING ======================
async function getTracesDirectory() {
  if (directoryHandle) return directoryHandle;
  try {
    const root = await window.showDirectoryPicker();
    const traces = await root.getDirectoryHandle('traces', {create:true});
    directoryHandle = await traces.getDirectoryHandle('randoMB', {create:true});
    return directoryHandle;
  } catch { alert("Accès refusé – traces non sauvegardées"); return null; }
}

function formatTime(s) {
  const h = String(Math.floor(s/3600)).padStart(2,'0');
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const sec = String(s%60).padStart(2,'0');
  return `${h}:${m}:${sec}`;
}

function haversine(p1,p2) {
  const toRad = x => x*Math.PI/180;
  const dLat = toRad(p2.lat-p1.lat);
  const dLon = toRad(p2.lon-p1.lon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(p1.lat))*Math.cos(toRad(p2.lat))*Math.sin(dLon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateInfos() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime)/1000);
  $('time').textContent = formatTime(elapsed);
  let dist = 0;
  for (let i=1; i<trackPoints.length; i++) dist += haversine(trackPoints[i-1], trackPoints[i]);
  $('distance').textContent = Math.round(dist);
}

$('startBtn').onclick = () => {
  if (watchId) return;
  if (!map) return alert("Charge d’abord une carte !");

  navigator.geolocation.getCurrentPosition(p => map.setView([p.coords.latitude, p.coords.longitude], 16));

  watchId = navigator.geolocation.watchPosition(pos => {
    const {latitude, longitude, altitude} = pos.coords;
    $('pos').textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    trackPoints.push({lat:latitude, lon:longitude, alt:altitude||0, time:new Date()});
    updateInfos();
    if (window.polyline) map.removeLayer(window.polyline);
    window.polyline = L.polyline(trackPoints.map(p=>[p.lat,p.lon]), {color:'#d50000',weight:5}).addTo(map);
    map.fitBounds(window.polyline.getBounds(), {padding:[50,50]});
  }, e=>alert("GPS : "+e.message), {enableHighAccuracy:true});

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
  let gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="randoMB"><trk><name>Rando ${new Date().toISOString().slice(0,10)}</name><trkseg>`;
  trackPoints.forEach(p => gpx += `<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.alt}</ele><time>${p.time.toISOString()}</time></trkpt>`);
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
  const w1 = await gpxH.createWritable(); await w1.write(exportGPX()); await w1.close();

  const kmlH = await dir.getFileHandle(`${name}.kml`, {create:true});
  const w2 = await kmlH.createWritable(); await w2.write(exportKML()); await w2.close();

  alert(`Trace enregistrée !\nDocuments/traces/randoMB/${name}.gpx et .kml`);
  trackPoints = [];
  $('saveBtn').disabled = true;
  if (window.polyline) map.removeLayer(window.polyline);
};