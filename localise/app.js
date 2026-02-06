// ================= CARTE : IGN PLAN V2 (WMTS PUBLIC) =================

const map = L.map('map').setView([43.5, 6.3], 8);

L.tileLayer(
  "https://data.geopf.fr/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
  "&STYLE=normal" +
  "&TILEMATRIXSET=PM" +
  "&FORMAT=image/png" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  {
    attribution: "© IGN – Géoplateforme",
    maxZoom: 18
  }
).addTo(map);

// ================= ÉTAT =================

let marker = null;
let lastLat = null;
let lastLon = null;

// ================= CLIC CARTE =================

map.on('click', e => {
  setPoint(e.latlng.lat, e.latlng.lng);
});

// ================= UTILITAIRES =================

function setPoint(lat, lon) {
  lastLat = lat;
  lastLon = lon;

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  document.getElementById('coords').textContent =
    lat.toFixed(6) + " , " + lon.toFixed(6);

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

// ================= FIXER COORDONNÉES =================

btnGo.onclick = () => {
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  if (!isNaN(lat) && !isNaN(lon)) setPoint(lat, lon);
};

// ================= NAVIGATION =================

btnGMaps.onclick = () => {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lastLat},${lastLon}`,
    "_blank"
  );
};

btnWaze.onclick = () => {
  window.open(
    `https://waze.com/ul?ll=${lastLat},${lastLon}&navigate=yes`,
    "_blank"
  );
};

// ================= BOUTONS EXISTANTS =================

btnDec.onclick = () =>
  navigator.clipboard.writeText(`${lastLat},${lastLon}`);

btnSexa.onclick = () =>
  navigator.clipboard.writeText(
    `${toDMS(lastLat,true)} ${toDMS(lastLon,false)}`
  );

btnLocate.onclick = () =>
  navigator.geolocation.getCurrentPosition(p =>
    setPoint(p.coords.latitude, p.coords.longitude)
  );

// ================= EXPORTS =================

btnGPX.onclick = () => saveFile(
  `${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.gpx`,
  `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="localise"
 xmlns="http://www.topografix.com/GPX/1/1">
<wpt lat="${lastLat}" lon="${lastLon}">
  <name>Point localisé</name>
</wpt>
</gpx>`,
  "application/gpx+xml"
);

btnHTML.onclick = () => saveFile(
  `${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.html`,
  document.documentElement.outerHTML,
  "text/html"
);
