// ================= CARTE =================
let map = L.map('map').setView([43.5, 6.3], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

let lastLat = null;
let lastLon = null;
let marker = null;

// ================= CLIC CARTE =================
map.on('click', e => {
  lastLat = e.latlng.lat;
  lastLon = e.latlng.lng;

  if (marker) map.removeLayer(marker);
  marker = L.marker(e.latlng).addTo(map);

  document.getElementById('coords').textContent =
    lastLat.toFixed(6) + " , " + lastLon.toFixed(6);

  document.getElementById('coordBox').classList.remove('hidden');
});

// ================= FORMAT SEXAGÉSIMAL DMS =================
function toDMS(value, isLat) {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  const dir = isLat
    ? (value >= 0 ? "N" : "S")
    : (value >= 0 ? "E" : "W");

  return `${deg}°${min}′${sec.toFixed(2)}″${dir}`;
}

// ================= BOUTONS EXISTANTS =================
document.getElementById('btnDec').onclick = () => {
  navigator.clipboard.writeText(
    lastLat.toFixed(6) + "," + lastLon.toFixed(6)
  );
};

document.getElementById('btnSexa').onclick = () => {
  const txt =
    toDMS(lastLat, true) + " " +
    toDMS(lastLon, false);
  navigator.clipboard.writeText(txt);
};

document.getElementById('btnLocate').onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView(
      [pos.coords.latitude, pos.coords.longitude],
      15
    );
  });
};

// ================= UTILITAIRES =================
function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}_${m}_${da}`;
}

function saveFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ================= EXPORT GPX =================
document.getElementById('btnGPX').onclick = () => {
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="localise"
 xmlns="http://www.topografix.com/GPX/1/1">
<wpt lat="${lastLat}" lon="${lastLon}">
  <name>Point localisé</name>
</wpt>
</gpx>`;

  saveFile(
    `${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.gpx`,
    gpx,
    "application/gpx+xml"
  );
};

// ================= EXPORT HTML =================
document.getElementById('btnHTML').onclick = () => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>localise</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
<style>#map{height:100vh}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
const lat=${lastLat};
const lon=${lastLon};
const map=L.map('map').setView([lat,lon],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© OpenStreetMap'
}).addTo(map);
L.marker([lat,lon]).addTo(map);
</script>
</body>
</html>`;

  saveFile(
    `${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.html`,
    html,
    "text/html"
  );
};
