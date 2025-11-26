let map = L.map('map').setView([0,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let currentGeoJSON = null;

document.getElementById("fileInput").onchange = async (e)=>{
  const file=e.target.files[0];
  const text=await file.text();
  const xml=new DOMParser().parseFromString(text,"application/xml");

  if (xml.getElementsByTagName("parsererror").length) {
    alert("Erreur : fichier XML invalide.");
    return;
  }

  let geojson = null;

  try {
    const test = toGeoJSON.gpx(xml);
    if (test && test.features && test.features.length > 0) {
      geojson = test;
    }
  } catch(e){}

  if (!geojson) {
    try {
      const test = toGeoJSON.kml(xml);
      if (test && test.features && test.features.length > 0) {
        geojson = test;
      }
    } catch(e){}
  }

  if (!geojson) {
    alert("Erreur parsing : fichier GPX/KML non reconnu.");
    return;
  }

  if(currentGeoJSON) map.removeLayer(currentGeoJSON);
  currentGeoJSON = L.geoJSON(geojson).addTo(map);
  map.fitBounds(currentGeoJSON.getBounds());
  window._geo = geojson;
};

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
