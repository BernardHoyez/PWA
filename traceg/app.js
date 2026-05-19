// app.js - traceg (popups zoomables)
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('file');
let selectedMapSource = 'osm';

// Sélection du fond de carte
function selectMap(source) {
  selectedMapSource = source;
  document.getElementById('map-osm').classList.remove('selected');
  document.getElementById('map-ign').classList.remove('selected');
  document.getElementById('map-ortho').classList.remove('selected');
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

// Compter les waypoints
function countWaypoints(geojson) {
  let count = 0;
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        count++;
      }
    });
  }
  return count;
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
  const waypointCount = countWaypoints(geojson);
  
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
  } else if (selectedMapSource === 'ign') {
    tileLayerConfig = `L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',{attribution:'&copy; IGN - Plan v2',maxZoom:19}).addTo(map);`;
  } else if (selectedMapSource === 'ortho') {
    tileLayerConfig = `L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',{attribution:'&copy; IGN - Orthophoto 20cm',maxZoom:19}).addTo(map);`;
  }
  
  // Sérialiser le GeoJSON de manière sûre
  const geojsonString = JSON.stringify(geojson)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, "\\'");
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<title>${filename}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
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

/* Modal overlay pour popup zoomable sur mobile */
.popup-modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;overflow:auto;-webkit-overflow-scrolling:touch}
.popup-modal-overlay.active{display:block}
.popup-modal-content{position:relative;background:white;margin:20px auto;padding:20px;border-radius:12px;max-width:90%;width:500px;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.popup-modal-close{position:absolute;top:10px;right:10px;background:#007bff;color:white;border:none;border-radius:50%;width:36px;height:36px;font-size:24px;line-height:32px;cursor:pointer;z-index:10001}
.popup-modal-close:hover{background:#0056b3}
.popup-modal-content h4{margin:0 0 15px 0;color:#007bff;font-size:20px;padding-right:40px}
.popup-modal-content p{margin:10px 0;line-height:1.6;font-size:16px}
.popup-modal-content img{max-width:100%;height:auto;border-radius:8px;margin:10px 0;cursor:zoom-in}
.popup-modal-content img.zoomed{cursor:zoom-out;max-width:none;width:auto;max-height:90vh}

/* Style des popups Leaflet normales (desktop) */
.leaflet-popup-content{font-size:14px;line-height:1.5;max-width:300px}
.leaflet-popup-content h4{margin:0 0 8px 0;color:#007bff}
.leaflet-popup-content img{max-width:100%;height:auto;border-radius:4px;margin:8px 0}
.leaflet-popup-content .open-modal-btn{display:inline-block;margin-top:10px;padding:8px 16px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px}
.leaflet-popup-content .open-modal-btn:hover{background:#0056b3}

@media (max-width: 768px){
  .controls{padding:10px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
  .controls button{margin:0;padding:16px 24px;font-size:17px;min-width:140px;flex:1 1 calc(50% - 5px);font-weight:700}
  .stats{font-size:13px;padding:12px}
  .stats h3{font-size:15px}
  
  /* Sur mobile, ouvrir directement le modal au lieu du popup Leaflet */
  .leaflet-popup{display:none !important}
}
@media print{.controls{display:none}.stats{bottom:auto;top:10px;right:10px;left:auto}.popup-modal-overlay{display:none !important}}
</style>
</head><body>
<div id="map"></div>

<!-- Modal pour affichage zoomable des waypoints -->
<div class="popup-modal-overlay" id="popupModal" onclick="if(event.target===this) closeModal()">
  <div class="popup-modal-content" id="popupModalContent">
    <button class="popup-modal-close" onclick="closeModal()">×</button>
    <div id="modalBody"></div>
  </div>
</div>

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
${waypointCount > 0 ? `<p><strong>📍 Waypoints:</strong> ${waypointCount}</p>` : ''}
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/tokml@0.4.0/tokml.js"><\/script>
<script>
const g = ${geojsonString};

// Utiliser Canvas renderer pour éviter les décalages lors de la capture PDF
const map = L.map('map', {
  preferCanvas: true,
  renderer: L.canvas()
}).fitBounds(L.geoJSON(g).getBounds());

${tileLayerConfig}

// Afficher les traces (lignes) - utiliser Canvas renderer
const trackLayer = L.geoJSON(g,{
  style:{color:'#c00',weight:6},
  filter: function(feature) {
    return feature.geometry.type !== 'Point';
  },
  renderer: L.canvas()
}).addTo(map);

// Détecter si on est sur mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

// Fonction pour ouvrir le modal
function openModal(content) {
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('popupModal').classList.add('active');
  
  // Gérer le zoom sur les images
  const images = document.querySelectorAll('#modalBody img');
  images.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
    });
  });
}

// Fonction pour fermer le modal
function closeModal() {
  document.getElementById('popupModal').classList.remove('active');
}
window.closeModal = closeModal;

// Afficher les waypoints (points)
const waypointLayer = L.geoJSON(g,{
  filter: function(feature) {
    return feature.geometry.type === 'Point';
  },
  pointToLayer: function(feature, latlng) {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'waypoint-marker',
        html: '<div style="background:#007bff;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    });
    
    // Construire le contenu de la popup
    let popupContent = '<div>';
    if (feature.properties.name) {
      popupContent += '<h4>📍 ' + feature.properties.name + '</h4>';
    }
    if (feature.properties.description || feature.properties.desc) {
      const desc = feature.properties.description || feature.properties.desc;
      popupContent += '<p>' + desc + '</p>';
    }
    if (feature.geometry.coordinates[2]) {
      popupContent += '<p><strong>Altitude:</strong> ' + Math.round(feature.geometry.coordinates[2]) + ' m</p>';
    }
    popupContent += '</div>';
    
    // Sur mobile, ouvrir directement le modal au clic
    if (isMobile) {
      marker.on('click', function() {
        openModal(popupContent);
      });
    } else {
      // Sur desktop, utiliser le popup Leaflet classique avec un bouton pour agrandir
      const popupWithButton = popupContent.replace('</div>', '<button class="open-modal-btn" onclick="openModal(\\'' + popupContent.replace(/'/g, "\\\\'") + '\\')">🔍 Agrandir</button></div>');
      marker.bindPopup(popupWithButton);
    }
    
    return marker;
  }
}).addTo(map);

// Fonction de conversion GeoJSON vers GPX manuelle (corrigée)
function geojsonToGpx(geojson) {
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\\n';
  gpx += '<gpx version="1.1" creator="traceg" xmlns="http://www.topografix.com/GPX/1/1">\\n';
  gpx += '  <metadata>\\n';
  gpx += '    <name>${filename}</name>\\n';
  gpx += '    <time>' + new Date().toISOString() + '</time>\\n';
  gpx += '  </metadata>\\n';
  
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      // Waypoints (Points)
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        gpx += '  <wpt lat="' + coords[1] + '" lon="' + coords[0] + '">\\n';
        if (coords[2] !== undefined) {
          gpx += '    <ele>' + coords[2] + '</ele>\\n';
        }
        if (feature.properties.name) {
          gpx += '    <name>' + escapeXml(feature.properties.name) + '</name>\\n';
        }
        if (feature.properties.description || feature.properties.desc) {
          gpx += '    <desc>' + escapeXml(feature.properties.description || feature.properties.desc) + '</desc>\\n';
        }
        gpx += '  </wpt>\\n';
      }
      
      // Traces (LineString)
      if (feature.geometry.type === 'LineString') {
        gpx += '  <trk>\\n';
        if (feature.properties.name) {
          gpx += '    <name>' + escapeXml(feature.properties.name) + '</name>\\n';
        }
        gpx += '    <trkseg>\\n';
        feature.geometry.coordinates.forEach((coord, idx) => {
          gpx += '      <trkpt lat="' + coord[1] + '" lon="' + coord[0] + '">\\n';
          if (coord[2] !== undefined) {
            gpx += '        <ele>' + coord[2] + '</ele>\\n';
          }
          if (feature.properties.coordTimes && feature.properties.coordTimes[idx]) {
            gpx += '        <time>' + feature.properties.coordTimes[idx] + '</time>\\n';
          }
          gpx += '      </trkpt>\\n';
        });
        gpx += '    </trkseg>\\n';
        gpx += '  </trk>\\n';
      }
      
      // MultiLineString
      if (feature.geometry.type === 'MultiLineString') {
        feature.geometry.coordinates.forEach(line => {
          gpx += '  <trk>\\n';
          if (feature.properties.name) {
            gpx += '    <name>' + escapeXml(feature.properties.name) + '</name>\\n';
          }
          gpx += '    <trkseg>\\n';
          line.forEach((coord, idx) => {
            gpx += '      <trkpt lat="' + coord[1] + '" lon="' + coord[0] + '">\\n';
            if (coord[2] !== undefined) {
              gpx += '        <ele>' + coord[2] + '</ele>\\n';
            }
            if (feature.properties.coordTimes && feature.properties.coordTimes[idx]) {
              gpx += '        <time>' + feature.properties.coordTimes[idx] + '</time>\\n';
            }
            gpx += '      </trkpt>\\n';
          });
          gpx += '    </trkseg>\\n';
          gpx += '  </trk>\\n';
        });
      }
    });
  }
  
  gpx += '</gpx>';
  return gpx;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function download(f){
  let data, ext, type;
  
  if(f==='gpx'){
    data = geojsonToGpx(g);
    ext = 'gpx';
    type = 'application/gpx+xml';
  }
  if(f==='kml'){
    data = tokml(g);
    ext = 'kml';
    type = 'application/vnd.google-earth.kml+xml';
  }
  if(f==='geojson'){
    data = JSON.stringify(g,null,2);
    ext = 'geojson';
    type = 'application/geo+json';
  }
  
  const blob = new Blob([data],{type});
  
  if ('showSaveFilePicker' in window) {
    const opts = {
      suggestedName: '${filename}.' + ext,
      types: [{
        description: ext.toUpperCase() + ' File',
        accept: {[type]: ['.' + ext]}
      }],
      startIn: 'documents'
    };
    
    window.showSaveFilePicker(opts).then(fileHandle => {
      return fileHandle.createWritable();
    }).then(writable => {
      writable.write(blob);
      return writable.close();
    }).catch(err => {
      if (err.name !== 'AbortError') {
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='${filename}.'+ext;
        a.click();
      }
    });
  } else {
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='${filename}.'+ext;
    a.click();
  }
}

function share(){
  const blob = new Blob([document.documentElement.outerHTML], {type: 'text/html'});
  const file = new File([blob], '${filename}.html', {type: 'text/html'});
  
  if ('showSaveFilePicker' in window) {
    const opts = {
      suggestedName: '${filename}.html',
      types: [{
        description: 'HTML File',
        accept: {'text/html': ['.html']}
      }],
      startIn: 'documents'
    };
    
    window.showSaveFilePicker(opts).then(fileHandle => {
      return fileHandle.createWritable();
    }).then(writable => {
      writable.write(blob);
      return writable.close();
    }).then(() => {
      alert('Fichier HTML sauvegardé avec succès !');
    }).catch(err => {
      if (err.name === 'AbortError') {
        return;
      }
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'${filename}',text:'Découvrez ma trace GPS'})
          .catch(err=>console.log('Partage annulé'));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '${filename}.html';
        a.click();
        URL.revokeObjectURL(url);
        alert('Fichier téléchargé. Vous pouvez le partager par email ou autre moyen.');
      }
    });
  } else if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'${filename}',text:'Découvrez ma trace GPS'})
      .catch(err=>console.log('Partage annulé'));
  } else {
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
    
    // Fermer le modal s'il est ouvert
    closeModal();
    map.closePopup();
    
    map.invalidateSize(true);
    
    await new Promise(resolve => {
      let tilesLoading = 0;
      let resolved = false;
      
      map.eachLayer(layer => {
        if (layer._tiles) {
          Object.keys(layer._tiles).forEach(key => {
            const tile = layer._tiles[key];
            if (!tile.complete) {
              tilesLoading++;
              tile.onload = tile.onerror = () => {
                tilesLoading--;
                if (tilesLoading === 0 && !resolved) {
                  resolved = true;
                  resolve();
                }
              };
            }
          });
        }
      });
      
      if (tilesLoading === 0 && !resolved) {
        resolved = true;
        resolve();
      }
      
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 6000);
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    map.invalidateSize(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale: 2,
      backgroundColor: '#ffffff',
      onclone: function(clonedDoc) {
        const clonedMap = clonedDoc.getElementById('map');
        if (clonedMap) {
          clonedMap.style.height = '100vh';
        }
        const clonedModal = clonedDoc.getElementById('popupModal');
        if (clonedModal) {
          clonedModal.style.display = 'none';
        }
      }
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
    
    if ('showSaveFilePicker' in window) {
      const pdfBlob = pdf.output('blob');
      const opts = {
        suggestedName: '${filename}.pdf',
        types: [{
          description: 'PDF Document',
          accept: {'application/pdf': ['.pdf']}
        }],
        startIn: 'documents'
      };
      
      try {
        const fileHandle = await window.showSaveFilePicker(opts);
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        
        btn.textContent = '✅ PDF sauvegardé';
      } catch(saveErr) {
        if (saveErr.name !== 'AbortError') {
          pdf.save('${filename}.pdf');
          btn.textContent = '✅ PDF créé';
        } else {
          btn.textContent = '📄 PDF';
        }
      }
    } else {
      pdf.save('${filename}.pdf');
      btn.textContent = '✅ PDF créé';
    }
    
    setTimeout(() => {
      btn.textContent = '📄 PDF';
      btn.disabled = false;
    }, 2000);
    
  } catch(err){
    console.error('Erreur PDF:', err);
    alert('Erreur lors de la génération du PDF: ' + err.message);
    btn.textContent = '📄 PDF';
    btn.disabled = false;
  }
}
<\/script>
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