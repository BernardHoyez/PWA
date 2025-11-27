// Zone de drag & drop
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('file');

// Gestion des événements de drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Effet visuel au survol
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.remove('drag-over');
  }, false);
});

// Gestion du drop
dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}, false);

// Gestion du clic sur la zone
dropZone.addEventListener('click', () => {
  fileInput.click();
});

// Gestion du changement de fichier via input
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Fonction principale de traitement du fichier
async function handleFile(file) {
  // Vérifier l'extension
  if (!file.name.endsWith('.gpx') && !file.name.endsWith('.kml')) {
    return alert('Veuillez choisir un fichier .gpx ou .kml');
  }

  document.getElementById('msg').textContent = 'Conversion en cours…';
  
  // Attente que togeojson soit chargé
  while (!window.toGeoJSON) await new Promise(r => setTimeout(r, 100));
  
  const text = await file.text();
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  
  if (dom.querySelector('parsererror')) {
    document.getElementById('msg').textContent = '';
    return alert('Fichier invalide');
  }
  
  const geojson = file.name.endsWith('.gpx') 
    ? toGeoJSON.gpx(dom) 
    : toGeoJSON.kml(dom);
  
  const name = file.name.split('.').slice(0,-1).join('.');
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${file.name}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>body{margin:0}#map{height:100vh}</style>
</head><body>
<div id="map"></div>
<div style="position:absolute;top:10px;left:10px;z-index:1000;background:white;padding:10px;border-radius:8px">
<button onclick="download('gpx')">GPX</button>
<button onclick="download('kml')">KML</button>
<button onclick="download('geojson')">GeoJSON</button>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/togpx@0.5.4/togpx.js"></script>
<script src="https://unpkg.com/tokml@0.4.0/tokml.js"></script>
<script>
const g = ${JSON.stringify(geojson)};
const map = L.map('map').fitBounds(L.geoJSON(g).getBounds());
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
L.geoJSON(g,{style:{color:'#c00',weight:6}}).addTo(map);
function download(f){
  let data, ext, type;
  if(f==='gpx'){data=togpx(g);ext='gpx';type='application/gpx+xml';}
  if(f==='kml'){data=tokml(g);ext='kml';type='application/vnd.google-earth.kml+xml';}
  if(f==='geojson'){data=JSON.stringify(g,null,2);ext='geojson';type='application/geo+json';}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type}));
  a.download='${name}.'+ext;
  a.click();
}
</script>
</body></html>`;

  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '-carte.html';
  a.click();
  URL.revokeObjectURL(url);
  
  document.getElementById('msg').textContent = 'Terminé !';
  fileInput.value = '';
}