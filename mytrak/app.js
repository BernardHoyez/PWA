// app.js

let directoryHandle;
let map;
let markers = [];

/* =========================
   Sélection ou création dossier
   ========================= */

async function selectFolder(create = false) {
  directoryHandle = await window.showDirectoryPicker({ mode: "read" });

  document.getElementById("status").textContent =
    "Dossier sélectionné : " + directoryHandle.name;

  await parseTraces();
}

/* =========================
   Parsing des traces HTML
   ========================= */

async function parseTraces() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "file" && entry.name.endsWith(".html")) {
      const file = await entry.getFile();
      const text = await file.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      const gpxScript = doc.querySelector(
        'script[type="application/gpx+xml"]'
      );
      if (!gpxScript) continue;

      const gpxDoc = parser.parseFromString(
        gpxScript.textContent,
        "application/xml"
      );

      const trkpt = gpxDoc.querySelector("trkpt");
      if (!trkpt) continue;

      const lat = parseFloat(trkpt.getAttribute("lat"));
      const lon = parseFloat(trkpt.getAttribute("lon"));

      const marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(entry.name);

      markers.push(marker);
    }
  }

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

/* =========================
   Génération HTML export
   ========================= */

function exportHTML() {
  const data = markers.map(m => {
    const p = m.getLatLng();
    return {
      nom: m.getPopup().getContent(),
      lat: p.lat,
      lon: p.lng
    };
  });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Carte des randos</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet"
 href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{height:100%;margin:0}
</style>
</head>
<body>
<div id="map"></div>
<script>
const randos = ${JSON.stringify(data)};
const map = L.map('map');
L.tileLayer(
  "https://data.geopf.fr/wmts?" +
  "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
  "&STYLE=normal&TI
