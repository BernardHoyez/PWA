// app.js - traceA
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('file');
let selectedMapSource = 'osm';

// Sélection du fond de carte
function selectMap(source) {
  selectedMapSource = source;
  document.getElementById('map-osm').classList.remove('selected');
  document.getElementById('map-ign').classList.remove('selected');
  document.getElementById('map-' + source).classList.add('selected');
}
window.selectMap = selectMap;

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

// Calcul de la distance totale
function calculateDistance(geojson) {
  let distance = 0;
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        distance += turf.length(feature, {units: 'kilometers'});
      } else if (feature.geometry.type === 'MultiLineString') {
        feature.geometry.coordinates.forEach(line => {
          distance += turf.length(turf.lineString(line), {units: 'kilometers'});
        });
      }
    });
  }
  return distance.toFixed(2);
}

// Calcul du dénivelé
function calculateElevation(geojson) {
  let elevationGain = 0;
  let elevationLoss = 0;
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        for (let i = 1; i < coords.length; i++) {
          if (coords[i][2] !== undefined && coords[i-1][2] !== undefined) {
            const diff = coords[i][2] - coords[i-1][2];
            if (diff > 0) elevationGain += diff;
            else elevationLoss += Math.abs(diff);
          }
        }
      }
    });
  }
  
  return {
    gain: Math.round(elevationGain),
    loss: Math.round(elevationLoss)
  };
}

// Calcul de la durée
function calculateDuration(geojson) {
  let startTime = null;
  let endTime = null;
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.properties && feature.properties.coordTimes) {
        const times = feature.properties.coordTimes;
        if (times.length > 0) {
          const start = new Date(times[0]);
          const end = new Date(times[times.length - 1]);
          if (!startTime || start < startTime) startTime = start;
          if (!endTime || end > endTime) endTime = end;
        }
      }
    });
  }
  
  if (startTime && endTime) {
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  
  return null;
}

// Extraire waypoints et POI
function extractWaypoints(geojson) {
  const waypoints = [];
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        waypoints.push({
          coords: feature.geometry.coordinates,
          name: feature.properties.name || 'Point',
          desc: feature.properties.desc || feature.properties.description || ''
        });
      }
    });
  }
  
  return waypoints;
}

// Obtenir le nom de lieu depuis les coordonnées (reverse geocoding simplifié)
async function getLocationName(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || data.address.municipality || 'Trace';
  } catch (error) {
    return 'Trace';
  }
}

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
  
  // Calcul des statistiques
  const distance = calculateDistance(geojson);
  const elevation = calculateElevation(geojson);
  const duration = calculateDuration(geojson);
  const waypoints = extractWaypoints(geojson);
  
  // Obtenir le centre de la trace pour le nom
  const bbox = turf.bbox(geojson);
  const centerLat = (bbox[1] + bbox[3]) / 2;
  const centerLon = (bbox[0] + bbox[2]) / 2;
  
  document.getElementById('msg').textContent = 'Recherche du lieu…';
  const locationName = await getLocationName(centerLat, centerLon);
  
  // Générer le nom de fichier intelligent
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const filename = `trace-${locationName}-${distance}km-${dateStr}`;
  
  // Configuration de la couche de tuiles selon le choix
  let tileLayerConfig;
  if (selectedMapSource === 'osm') {
    tileLayerConfig = `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);`;
  } else {
    tileLayerConfig = `L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',{attribution:'&copy; IGN - Plan v2',maxZoom:19}).addTo(map);`;
  }
  
  // Générer le code des waypoints
  let waypointsCode = '';
  if (waypoints.length > 0) {
    waypointsCode = waypoints.map(wp => {
      const desc = wp.desc ? `, {title: '${wp.name}'}` : '';
      return `L.marker([${wp.coords[1]}, ${wp.coords[0]}])
        .bindPopup('<b>${wp.name}</b>${wp.desc ? '<br>' + wp.desc : ''}')
        .addTo(map);`;
    }).join('\n');
  }
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${filename}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<style>
body{margin:0;font-family:system-ui}
#map{height:100vh}
.controls{position:absolute;top:10px;left:10px;z-index:1000;background:white;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2)}
.controls button{margin:5px;padding:10px 15px;border:none;border-radius:5px;cursor:pointer;background:#007bff;color:white;font-size:14px}
.controls button:hover{background:#0056b3}
.stats{position:absolute;bottom:10px;left:10px;z-index:1000;background:white;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px}
.stats h3{margin:0 0 10px 0;font-size:16px}
.stats p{margin:5px 0}
@media print{.controls{display:none}.stats{bottom:auto;top:10px;right:10px;left:auto}}
</style>
</head><body>
<div id="map"></div>
<div class="controls">
<button onclick="download('gpx')">📥 GPX</button>
<button onclick="download('kml')">📥 KML</button>
<button onclick="download('geojson')">📥 GeoJSON</button>
<button onclick="share()">🔗 Partager</button>
<button onclick="window.print()">🖨️ Imprimer</button>
<button onclick="exportPDF()">📄 PDF</button>
</div>
<div class="stats">
<h3>📊 Statistiques</h3>
<p><strong>Distance:</strong> ${distance} km</p>
${elevation.gain > 0 ? `<p><strong>D+:</strong> ${elevation.gain} m</p>` : ''}
${elevation.loss > 0 ? `<p><strong>D-:</strong> ${elevation.loss} m</p>` : ''}
${duration ? `<p><strong>Durée:</strong> ${duration}</p>` : ''}
${waypoints.length > 0 ? `<p><strong>Points:</strong> ${waypoints.length}</p>` : ''}
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/togpx@0.5.4/togpx.js"></script>
<script src="https://unpkg.com/tokml@0.4.0/tokml.js"></script>
<script>
const g = ${JSON.stringify(geojson)};
const map = L.map('map').fitBounds(L.geoJSON(g).getBounds());
${tileLayerConfig}
L.geoJSON(g,{
  style:{color:'#c00',weight:6},
  filter: function(feature) {
    return feature.geometry.type !== 'Point';
  }
}).addTo(map);
${waypointsCode}

function download(f){
  let data, ext, type;
  if(f==='gpx'){data=togpx(g);ext='gpx';type='application/gpx+xml';}
  if(f==='kml'){data=tokml(g);ext='kml';type='application/vnd.google-earth.kml+xml';}
  if(f==='geojson'){data=JSON.stringify(g,null,2);ext='geojson';type='application/geo+json';}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type}));
  a.download='${filename}.'+ext;
  a.click();
}

function share(){
  const blob = new Blob([document.documentElement.outerHTML], {type: 'text/html'});
  const file = new File([blob], '${filename}.html', {type: 'text/html'});
  if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'${filename}',text:'Découvrez ma trace GPS'})
      .catch(err=>console.log('Partage annulé'));
  }else{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${filename}.html';
    a.click();
    URL.revokeObjectURL(url);
    alert('Fichier téléchargé. Vous pouvez le partager par email ou autre moyen.');
  }
}

async function exportPDF(){
  const btn = event.target;
  btn.textContent = '⏳ Génération...';
  btn.disabled = true;
  try{
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 2
    });
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = '${filename}.png';
    link.href = imgData;
    link.click();
    alert('Image PNG générée (Le PDF nécessiterait une bibliothèque supplémentaire)');
  }catch(err){
    alert('Erreur lors de la génération: ' + err.message);
  }finally{
    btn.textContent = '📄 PDF';
    btn.disabled = false;
  }
}
</script>
</body></html>`;

  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.html';
  a.click();
  URL.revokeObjectURL(url);
  
  document.getElementById('msg').textContent = `✅ Terminé ! ${filename}.html`;
  fileInput.value = '';
}