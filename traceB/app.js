// app.js - traceB
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

// Extraire les photos géolocalisées du KML
function extractPhotos(dom, photoFiles) {
  const photos = [];
  const placemarks = dom.getElementsByTagName('Placemark');
  
  for (let placemark of placemarks) {
    const point = placemark.getElementsByTagName('Point')[0];
    if (point) {
      const coords = point.getElementsByTagName('coordinates')[0];
      if (coords) {
        const [lon, lat] = coords.textContent.trim().split(',').map(parseFloat);
        
        // Chercher l'icône/photo dans la description
        const description = placemark.getElementsByTagName('description')[0];
        let photoData = null;
        let photoName = null;
        
        if (description) {
          const descText = description.textContent;
          // Chercher les références d'images
          const imgMatch = descText.match(/src="([^"]+)"/);
          if (imgMatch) {
            photoName = imgMatch[1].replace('files/', '');
            // Chercher la photo correspondante dans les fichiers extraits
            if (photoFiles[photoName]) {
              photoData = photoFiles[photoName];
            }
          }
        }
        
        const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Photo';
        
        if (photoData) {
          photos.push({
            coords: [lon, lat],
            name: name,
            photo: photoData,
            photoName: photoName
          });
        }
      }
    }
  }
  
  return photos;
}

// Obtenir le nom de lieu depuis les coordonnées
async function getLocationName(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || data.address.municipality || 'Trace';
  } catch (error) {
    return 'Trace';
  }
}

// Prétraitement pour OruxMaps KML
function preprocessOruxMapsKML(xmlText) {
  // OruxMaps utilise parfois gx:Track au lieu de LineString
  // Convertir gx:Track en LineString standard
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  
  // Chercher les gx:Track
  const tracks = doc.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'Track');
  
  for (let track of tracks) {
    const coordinates = [];
    const whens = track.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'when');
    const coords = track.getElementsByTagNameNS('http://www.google.com/kml/ext/2.2', 'coord');
    
    // Extraire les coordonnées
    for (let i = 0; i < coords.length; i++) {
      const coordText = coords[i].textContent.trim();
      coordinates.push(coordText);
    }
    
    if (coordinates.length > 0) {
      // Créer un LineString standard
      const lineString = doc.createElementNS('http://earth.google.com/kml/2.2', 'LineString');
      const coordsElement = doc.createElementNS('http://earth.google.com/kml/2.2', 'coordinates');
      coordsElement.textContent = coordinates.join(' ');
      lineString.appendChild(coordsElement);
      
      // Remplacer gx:Track par LineString
      track.parentNode.replaceChild(lineString, track);
    }
  }
  
  // Retourner le XML corrigé
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

// Fonction principale de traitement du fichier
async function handleFile(file) {
  // Vérifier l'extension
  if (!file.name.endsWith('.gpx') && !file.name.endsWith('.kml') && !file.name.endsWith('.kmz')) {
    return alert('Veuillez choisir un fichier .gpx, .kml ou .kmz');
  }

  document.getElementById('msg').textContent = 'Conversion en cours…';
  
  // Attente que les bibliothèques soient chargées
  while (!window.toGeoJSON || (file.name.endsWith('.kmz') && !window.JSZip)) {
    await new Promise(r => setTimeout(r, 100));
  }
  
  let text, dom, geojson, photos = [], photoFiles = {};
  
  if (file.name.endsWith('.kmz')) {
    // Traitement KMZ
    document.getElementById('msg').textContent = 'Extraction du KMZ…';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      console.log('Fichiers dans le KMZ:', Object.keys(zip.files));
      
      // Extraire le fichier KML (chercher doc.kml ou tout .kml)
      let kmlFile = null;
      for (let filename in zip.files) {
        if (filename.toLowerCase().endsWith('.kml') && !zip.files[filename].dir) {
          kmlFile = zip.files[filename];
          console.log('KML trouvé:', filename);
          break;
        }
      }
      
      if (!kmlFile) {
        document.getElementById('msg').textContent = '';
        return alert('Aucun fichier KML trouvé dans le KMZ. Fichiers présents: ' + Object.keys(zip.files).join(', '));
      }
      
      text = await kmlFile.async('text');
      console.log('KML extrait, longueur:', text.length);
      
      // Extraire les photos
      document.getElementById('msg').textContent = 'Extraction des photos…';
      for (let filename in zip.files) {
        if (filename.match(/\.(jpg|jpeg|png|gif)$/i) && !zip.files[filename].dir) {
          console.log('Photo trouvée:', filename);
          const photoBlob = await zip.files[filename].async('blob');
          const photoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(photoBlob);
          });
          const cleanFilename = filename.split('/').pop();
          photoFiles[cleanFilename] = photoBase64;
        }
      }
      
      console.log('Photos extraites:', Object.keys(photoFiles).length);
      
      // Prétraiter le KML pour OruxMaps
      text = preprocessOruxMapsKML(text);
      
      dom = new DOMParser().parseFromString(text, 'text/xml');
      
      // Vérifier les erreurs de parsing
      if (dom.querySelector('parsererror')) {
        console.error('Erreur parsing KML:', dom.querySelector('parsererror').textContent);
        document.getElementById('msg').textContent = '';
        return alert('Erreur de parsing du KML');
      }
      
      photos = extractPhotos(dom, photoFiles);
      console.log('Photos géolocalisées:', photos.length);
      
      geojson = toGeoJSON.kml(dom);
      console.log('GeoJSON créé:', geojson);
      
    } catch (error) {
      console.error('Erreur traitement KMZ:', error);
      document.getElementById('msg').textContent = '';
      return alert('Erreur lors du traitement du KMZ: ' + error.message);
    }
    
  } else {
    // Traitement GPX/KML classique
    text = await file.text();
    
    // Si c'est un KML, prétraiter pour OruxMaps
    if (file.name.endsWith('.kml')) {
      text = preprocessOruxMapsKML(text);
    }
    
    dom = new DOMParser().parseFromString(text, 'text/xml');
    
    if (dom.querySelector('parsererror')) {
      document.getElementById('msg').textContent = '';
      return alert('Fichier invalide');
    }
    
    geojson = file.name.endsWith('.gpx') 
      ? toGeoJSON.gpx(dom) 
      : toGeoJSON.kml(dom);
  }
  
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
      return `L.marker([${wp.coords[1]}, ${wp.coords[0]}])
        .bindPopup('<b>${wp.name}</b>${wp.desc ? '<br>' + wp.desc : ''}')
        .addTo(map);`;
    }).join('\n');
  }
  
  // Générer le code des photos
  let photosCode = '';
  let photosData = '';
  if (photos.length > 0) {
    photosData = `const photos = ${JSON.stringify(photos)};`;
    photosCode = `
    const photoIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23e74c3c"><circle cx="12" cy="12" r="10"/><path fill="white" d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>'),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
    
    photos.forEach(photo => {
      const popupContent = '<div style="text-align:center"><b>' + photo.name + '</b><br><img src="' + photo.photo + '" style="max-width:300px;max-height:300px;margin-top:10px"/></div>';
      L.marker([photo.coords[1], photo.coords[0]], {icon: photoIcon})
        .bindPopup(popupContent, {maxWidth: 320})
        .addTo(map);
    });`;
  }
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${filename}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
body{margin:0;font-family:system-ui}
#map{height:100vh}
.controls{position:absolute;top:10px;left:10px;z-index:1000;background:white;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);max-width:90vw}
.controls button{margin:5px;padding:12px 18px;border:none;border-radius:5px;cursor:pointer;background:#007bff;color:white;font-size:15px;font-weight:600;white-space:nowrap}
.controls button:hover{background:#0056b3}
.controls button:active{transform:scale(0.95)}
.stats{position:absolute;bottom:10px;left:10px;z-index:1000;background:white;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px;max-width:90vw}
.stats h3{margin:0 0 10px 0;font-size:16px}
.stats p{margin:5px 0}
@media (max-width: 768px){
  .controls{padding:10px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
  .controls button{margin:0;padding:14px 20px;font-size:16px;min-width:120px;flex:1 1 calc(50% - 4px)}
  .stats{font-size:13px;padding:12px}
  .stats h3{font-size:15px}
}
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
${photos.length > 0 ? `<p><strong>📸 Photos:</strong> ${photos.length}</p>` : ''}
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/togpx@0.5.4/togpx.js"></script>
<script src="https://unpkg.com/tokml@0.4.0/tokml.js"></script>
<script>
const g = ${JSON.stringify(geojson)};
${photosData}
const map = L.map('map').fitBounds(L.geoJSON(g).getBounds());
${tileLayerConfig}
L.geoJSON(g,{
  style:{color:'#c00',weight:6},
  filter: function(feature) {
    return feature.geometry.type !== 'Point';
  }
}).addTo(map);
${waypointsCode}
${photosCode}

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
    navigator.share({files:[file],title:'${filename}',text:'Découvrez ma trace GPS avec photos'})
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
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF non chargé');
    }
    
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 2
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    
    const orientation = canvas.width > canvas.height ? 'l' : 'p';
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > pageHeight) {
      finalHeight = pageHeight;
      finalWidth = (canvas.width * pageHeight) / canvas.height;
    }
    
    pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
    pdf.save('${filename}.pdf');
    
    btn.textContent = '✅ PDF créé';
    setTimeout(() => {
      btn.textContent = '📄 PDF';
    }, 2000);
  } catch(err){
    console.error('Erreur PDF:', err);
    try {
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
      alert('Export PDF non disponible, image PNG générée à la place.');
    } catch(err2) {
      alert('Erreur lors de la génération: ' + err2.message);
    }
    btn.textContent = '📄 PDF';
  } finally{
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
  
  document.getElementById('msg').textContent = `✅ Terminé ! ${filename}.html${photos.length > 0 ? ' avec ' + photos.length + ' photo(s)' : ''}`;
  fileInput.value = '';
}