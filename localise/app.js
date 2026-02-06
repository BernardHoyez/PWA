let map = L.map('map').setView([43.5, 6.3], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

let lastLat = null;
let lastLon = null;
let marker = null;

// ---------- CLIC SUR LA CARTE ----------
map.on('click', e => {
  lastLat = e.latlng.lat;
  lastLon = e.latlng.lng;

  if (marker) map.removeLayer(marker);
  marker = L.marker(e.latlng).addTo(map);

  document.getElementById('coords').textContent =
    lastLat.toFixed(6) + ' , ' + lastLon.toFixed(6);

  document.getElementById('coordBox').classList.remove('hidden');
});

// ---------- EXISTANT : COPIE DEC ----------
document.getElementById('btnDec').onclick = () => {
  navigator.clipboard.writeText(
    lastLat.toFixed(6) + ',' + lastLon.toFixed(6)
  );
};

// ---------- EXISTANT : COPIE SEXA ----------
function toSexa(val) {
  const deg = Math.floor(Math.abs(val));
  const min = (Math.abs(val) - deg) * 60;
  return `${deg}°${min.toFixed(3)}'`;
}

document.getElementById('btnSexa').onclick = () => {
  const txt = toSexa(lastLat) + ' , ' + toSexa(lastLon);
  navigator.clipboard.writeText(txt);
};

// ---------- EXISTANT : GEOLOCALISATION ----------
document.getElementById('btnLocate').onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    map.setView([lat, lon], 15);
  });
};

// =================================================
// =============== NOUVEAUX BOUTONS =================
// =================================================

function saveFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- EXPORT GPX ----------
document.getElementById('btnGPX').onclick = () => {
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="localise"
 xmlns="http://www.topografix.com/GPX/1/1">
<wpt lat="${lastLat}" lon="${lastLon}">
  <name>Point localisé</name>
</wpt>
</gpx>`;

  saveFile(
    `localise_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.gpx`,
    gpx,
    'application/gpx+xml'
  );
};

// ---------- EXPORT HTML ----------
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
  attribution:'© OSM'
}).addTo(map);
L.marker([lat,lon]).addTo(map);
</script>
</body>
</html>`;

  saveFile(
    `localise_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.html`,
    html,
    'text/html'
  );
};
