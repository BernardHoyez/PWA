// =======================
// Fonds de carte
// =======================

const ign = L.tileLayer(
  "https://data.geopf.fr/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
  "&STYLE=normal&TILEMATRIXSET=PM" +
  "&FORMAT=image/png" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  {
    attribution: "© IGN – Géoplateforme",
    maxZoom: 18
  }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap",
    maxZoom: 19
  }
);

// =======================
// Carte
// =======================

const map = L.map("map", {
  center: [43.5, 6.3],
  zoom: 8,
  layers: [ign]
});

L.control.layers(
  { "IGN Plan V2": ign, "OSM": osm },
  null,
  { position: "topright" }
).addTo(map);

// =======================
// État
// =======================

let marker = null;
let lastLat = null;
let lastLon = null;

// =======================
// Utilitaires
// =======================

function setPoint(lat, lon) {
  lastLat = lat;
  lastLon = lon;

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);

  coords.textContent = `${lat.toFixed(6)} , ${lon.toFixed(6)}`;
  latInput.value = lat.toFixed(6);
  lonInput.value = lon.toFixed(6);

  map.setView([lat, lon], 15);
}

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

function today() {
  const d = new Date();
  return (
    d.getFullYear() + "_" +
    String(d.getMonth() + 1).padStart(2, "0") + "_" +
    String(d.getDate()).padStart(2, "0")
  );
}

function saveFile(filename, conten
