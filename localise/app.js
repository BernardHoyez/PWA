// ================= FONDS DE CARTE =================

const ign = L.tileLayer(
  "https://data.geopf.fr/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
  "&STYLE=normal" +
  "&TILEMATRIXSET=PM" +
  "&FORMAT=image/png" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  { attribution: "© IGN – Géoplateforme", maxZoom: 18 }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap", maxZoom: 19 }
);

// ================= CARTE =================

const map = L.map('map', {
  center: [43.5, 6.3],
  zoom: 8,
  layers: [ign]
});

L.control.layers(
  { "IGN Plan V2": ign, "OSM": osm },
  null,
  { position: "topright" }
).addTo(map);

// ================= ÉTAT =================

let marker = null;
let lastLat = null;
let lastLon = null;

// ================= UTILITAIRES =================

function setPoint(lat, lon) {
  lastLat = lat;
  lastLon = lon;

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  coords.textContent = lat.toFixed(6) + " , " + lon.toFixed(6);
  latInput.value = lat.toFixed(6);
  lonInput.value = lon.toFixed(6);

  map.setView([lat, lon], 15);
}

function toDMS(v, isLat) {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = ((a - d) * 60 - m) * 60;
  const dir = isLat ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "W");
  return `${d}°${m}′${s.toFixed(2)}″${dir}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}_${String(d.getDate()).padStart(2,'0')}`;
}

function saveFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

// ================= INTERACTIONS =================

map.on('click', e => setPoint(e.latlng.lat, e.latlng.lng));

btnGo.onclick = () => {
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  if (!isNaN(lat) && !isNaN(lon)) setPoint(lat, lon);
};

btnLocate.onclick = () =>
  navigator.geolocation.getCurrentPosition(p =>
    setPoint(p.coords.latitude, p.coords.longitude)
  );

btnDec.onclick = () =>
  navigator.clipboard.writeText(`${lastLat},${lastLon}`);

btnSexa.onclick = () =>
  navigator.clipboard.writeText(
    `${toDMS(lastLat,true)} ${toDMS(lastLon,false)}`
  );

btnGMaps.onclick = () =>
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lastLat},${lastLon}`,
    "_blank"
  );

btnWaze.onclick = () =>
  window.open(
    `https://waze.com/ul?ll=${lastLat},${lastLon}&navigate=yes`,
    "_blank"
  );

// ================= EXPORT GPX =================

btnGPX.onclick = () => {
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

// ================= EXPORT HTML (GPX EMBARQUÉ) =================

btnHTML.onclick = () => {

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="localise"
 xmlns="http://www.topografix.com/GPX/1/1">
<wpt lat="${lastLat}" lon="${lastLon}">
  <name>Point localisé</name>
</wpt>
</gpx>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Localisation</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}</style>
</head>
<body>

<div id="map"></div>

<script type="application/gpx+xml" id="gpxData">
${gpx}
</script>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
const xml = new DOMParser()
  .parseFromString(
    document.getElementById("gpxData").textContent,
    "application/xml"
  );

const wpt = xml.querySelector("wpt");
const lat = parseFloat(wpt.getAttribute("lat"));
const lon = parseFloat(wpt.getAttribute("lon"));

const ign = L.tileLayer(
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM" +
  "&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  { attribution:"© IGN – Géoplateforme", maxZoom:18 }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution:"© OpenStreetMap", maxZoom:19 }
);

const map = L.map("map",{center:[lat,lon],zoom:15,layers:[ign]});

L.control.layers(
  {"IGN Plan V2":ign,"OSM":osm},
  null
).addTo(map);

L.marker([lat,lon]).addTo(map).openPopup();
</script>

</body>
</html>`;

  saveFile(
    `${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.html`,
    html,
    "text/html"
  );
};
