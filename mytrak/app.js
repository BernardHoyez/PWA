let map;
let markers = [];

// Initialisation Leaflet + fond PLAN IGN V2
function initMap() {
  map = L.map('map');

  // PLAN IGN V2 libre, sans clé
  L.tileLayer(
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    {
      attribution: '© IGN – Plan v2',
      minZoom: 0,
      maxZoom: 19
    }
  ).addTo(map);
}

// Export HTML carte_des_randos.html
function exportHTML() {
  if (!markers || markers.length === 0) {
    alert("Aucun marqueur à exporter");
    return;
  }

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>carte_des_randos</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>#map{height:100vh;width:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>
const map = L.map('map');
L.tileLayer(
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
  { attribution:'© IGN – Plan v2', minZoom:0, maxZoom:19 }
).addTo(map);

const markers = [];
`;

  markers.forEach((m) => {
    const latlng = m.getLatLng();
    const popup = m.getPopup() ? m.getPopup().getContent() : "";
    html += `L.marker([${latlng.lat}, ${latlng.lng}]).addTo(map).bindPopup("${popup}");\n`;
  });

  html += `
const group = L.featureGroup(markers);
map.fitBounds(group.getBounds().pad(0.2));
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "carte_des_randos.html";
  a.click();
}

// Sélection du dossier + parsing
document.getElementById("folderInput").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  document.getElementById("status").textContent =
    files.length + " fichier(s) détecté(s)";

  markers = [];

  document.getElementById("step-folder").style.display = "none";
  document.getElementById("step-map").style.display = "block";

  initMap();

  for (const file of files) {
    if (!file.name.endsWith(".html")) continue;

    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    // Cherche le script GPX
    const gpxScript = doc.querySelector('script[type="application/gpx+xml"]');
    if (!gpxScript) continue;

    const gpxDoc = parser.parseFromString(gpxScript.textContent, "application/xml");
    const trkpt = gpxDoc.querySelector("trkpt");
    if (!trkpt) continue;

    const lat = parseFloat(trkpt.getAttribute("lat"));
    const lon = parseFloat(trkpt.getAttribute("lon"));

    const marker = L.marker([lat, lon]).addTo(map).bindPopup(file.name);
    markers.push(marker);
  }

  // Zoom sur tous les marqueurs si présents
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
  } else {
    map.setView([46.5, 2.5], 6);
  }

  // Sécurité Leaflet
  setTimeout(() => map.invalidateSize(), 200);
});
