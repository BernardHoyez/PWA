// app.js — version robuste de parsing GPX/KML
let map = L.map('map').setView([0,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let currentGeoJSON = null;

function cleanTextForXML(text){
  // retire BOM
  text = text.replace(/^\uFEFF/, '');
  // retire caractères invisibles fréquents
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  // remplace entités non-standards
  text = text.replace(/&nbsp;/g,' ');
  // supprime namespace par défaut qui casse parfois togeojson
  text = text.replace(/xmlns="[^"]*"/g, '');
  return text;
}

function tryParseXML(text){
  // plusieurs tentatives avec variantes
  const variants = [
    text,
    text.replace(/<kml[^>]*>/i, '<kml>'), // simplification tag kml
    text.replace(/<\?xml[^>]*\?>/i, ''),  // sans déclaration xml
  ];
  for (let v of variants){
    try {
      const xml = new DOMParser().parseFromString(v, "application/xml");
      if (xml.getElementsByTagName("parsererror").length) {
        console.warn("parsererror trouvé pour variante", v.slice(0,200));
        continue;
      }
      return xml;
    } catch(e){
      console.warn("DOMParser exception:", e);
    }
  }
  return null;
}

document.getElementById("fileInput").onchange = async (e)=>{
  const file = e.target.files[0];
  if (!file) return alert("Aucun fichier sélectionné.");
  console.log("Fichier:", file.name, file.type, file.size);

  const text = await file.text();
  let cleaned = cleanTextForXML(text);

  // petit diagnostic rapide
  const lower = cleaned.toLowerCase();
  const looksLikeGpx = lower.includes('<gpx') || lower.includes('<trk') || lower.includes('<wpt');
  const looksLikeKml = lower.includes('<kml') || lower.includes('<placemark') || lower.includes('<coordinates');

  console.log("Détection heuristique -> GPX:", looksLikeGpx, "KML:", looksLikeKml);

  const xml = tryParseXML(cleaned);
  if (!xml) {
    console.error("Impossible de parser le XML après nettoyages. Début du fichier:", cleaned.slice(0,500));
    return alert("Erreur : fichier XML invalide ou corrompu (voir console).");
  }

  // maintenant conversion
  let geojson = null;
  // prefer explicit parsing depending on detection
  if (looksLikeGpx) {
    try {
      const candidate = toGeoJSON.gpx(xml);
      if (candidate && candidate.features && candidate.features.length) geojson = candidate;
      console.log("Tentative toGeoJSON.gpx ->", !!geojson);
    } catch(err){ console.warn("toGeoJSON.gpx threw:", err); }
  }

  if (!geojson && looksLikeKml) {
    try {
      const candidate = toGeoJSON.kml(xml);
      if (candidate && candidate.features && candidate.features.length) geojson = candidate;
      console.log("Tentative toGeoJSON.kml ->", !!geojson);
    } catch(err){ console.warn("toGeoJSON.kml threw:", err); }
  }

  // fallback : essayer les deux quoi qu'il arrive (utile si heuristique ratée)
  if (!geojson) {
    try { 
      const candidate = toGeoJSON.gpx(xml);
      if (candidate && candidate.features && candidate.features.length) geojson = candidate;
      console.log("Fallback gpx ->", !!geojson);
    } catch(err){ console.warn("fallback toGeoJSON.gpx threw:", err); }
  }
  if (!geojson) {
    try {
      const candidate = toGeoJSON.kml(xml);
      if (candidate && candidate.features && candidate.features.length) geojson = candidate;
      console.log("Fallback kml ->", !!geojson);
    } catch(err){ console.warn("fallback toGeoJSON.kml threw:", err); }
  }

  if (!geojson) {
    // debug: extraire racine du XML pour inspection
    const root = xml.documentElement ? xml.documentElement.nodeName : "no-root";
    console.error("Parsing failed. Root element:", root, "File start:", cleaned.slice(0,500));
    return alert("Erreur parsing : le fichier n'a pas pu être converti (voir console pour diagnostic).");
  }

  // OK affichage
  if(currentGeoJSON) map.removeLayer(currentGeoJSON);
  currentGeoJSON = L.geoJSON(geojson).addTo(map);
  try { map.fitBounds(currentGeoJSON.getBounds()); } catch(e){ console.warn("fitBounds failed:", e); }
  window._geo = geojson;
  console.log("Trace chargée avec", geojson.features.length, "features.");
};

// exports et génération HTML inchangés mais avec checks
function download(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportGeoJSON").onclick=()=>{
  if (!window._geo) return alert("Aucune trace chargée.");
  download(new Blob([JSON.stringify(window._geo)],{type:"application/json"}),"trace.geojson");
};
document.getElementById("exportGPX").onclick=()=>{
  if (!window._geo) return alert("Aucune trace chargée.");
  download(new Blob([togpx(window._geo)],{type:"application/gpx+xml"}),"trace.gpx");
};
document.getElementById("exportKML").onclick=()=>{
  if (!window._geo) return alert("Aucune trace chargée.");
  download(new Blob([tokml(window._geo)],{type:"application/vnd.google-earth.kml+xml"}),"trace.kml");
};

document.getElementById("generateHtml").onclick=()=>{
  if (!window._geo) return alert("Aucune trace chargée.");
  const content=`<html><head>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>#map{height:90vh}</style></head>
<body><div id="map"></div>
<script>
const geo=${JSON.stringify(window._geo)};
let map=L.map('map').setView([0,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let layer=L.geoJSON(geo).addTo(map);
map.fitBounds(layer.getBounds());
</`+`script></body></html>`;
  download(new Blob([content],{type:"text/html"}),"tracecarte.html");
};
