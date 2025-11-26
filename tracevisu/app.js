// Variables globales
let traceData = null;
let mapHtml = '';
let currentFileName = '';

// Éléments DOM
const fileInput = document.getElementById('fileInput');
const fileNameDiv = document.getElementById('fileName');
const mapContainer = document.getElementById('mapContainer');
const mapFrame = document.getElementById('mapFrame');
const mapFooter = document.getElementById('mapFooter');
const downloadSection = document.getElementById('downloadSection');
const instructions = document.getElementById('instructions');

// Parser KML
function parseKML(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  const coordinates = [];
  
  const coordElements = xmlDoc.getElementsByTagName('coordinates');
  for (let elem of coordElements) {
    const coordText = elem.textContent.trim();
    const points = coordText.split(/\s+/);
    
    points.forEach(point => {
      const [lon, lat, ele] = point.split(',');
      if (lon && lat) {
        coordinates.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: ele ? parseFloat(ele) : 0
        });
      }
    });
  }
  
  return coordinates;
}

// Parser GPX
function parseGPX(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  const coordinates = [];
  
  const trkpts = xmlDoc.getElementsByTagName('trkpt');
  for (let pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));
    const eleElem = pt.getElementsByTagName('ele')[0];
    const ele = eleElem ? parseFloat(eleElem.textContent) : 0;
    
    coordinates.push({ lat, lon, ele });
  }
  
  return coordinates;
}

// Convertir en GPX
function toGPX(coords) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TraceVisu">
  <trk>
    <n>Trace GPS</n>
    <trkseg>
`;
  coords.forEach(coord => {
    gpx += `      <trkpt lat="${coord.lat}" lon="${coord.lon}">
        <ele>${coord.ele}</ele>
      </trkpt>
`;
  });
  gpx += `    </trkseg>
  </trk>
</gpx>`;
  return gpx;
}

// Convertir en KML
function toKML(coords) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <n>Trace GPS</n>
    <Placemark>
      <n>Route</n>
      <LineString>
        <coordinates>
`;
  coords.forEach(coord => {
    kml += `          ${coord.lon},${coord.lat},${coord.ele}\n`;
  });
  kml += `        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
  return kml;
}

// Convertir en GeoJSON
function toGeoJSON(coords) {
  const geojson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {
        name: "Trace GPS"
      },
      geometry: {
        type: "LineString",
        coordinates: coords.map(c => [c.lon, c.lat, c.ele])
      }
    }]
  };
  return JSON.stringify(geojson, null, 2);
}

// Générer HTML avec carte OSM
function generateMapHTML(coords, filename) {
  if (!coords || coords.length === 0) return '';

  const center = {
    lat: coords.reduce((sum, c) => sum + c.lat, 0) / coords.length,
    lon: coords.reduce((sum, c) => sum + c.lon, 0) / coords.length
  };

  const coordsJSON = JSON.stringify(coords);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceVisu - ${filename}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    #map { width: 100vw; height: 100vh; }
    .info-box {
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 250px;
    }
    .info-box h3 { margin-bottom: 10px; font-size: 16px; color: #4f46e5; }
    .info-box p { margin: 5px 0; font-size: 13px; color: #555; }
    .logo { 
      position: absolute; 
      top: 10px; 
      left: 10px; 
      background: white; 
      padding: 10px 15px; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.2); 
      z-index: 1000; 
      font-weight: bold; 
      color: #4f46e5; 
    }
  </style>
</head>
<body>
  <div class="logo">🗺️ TraceVisu</div>
  <div id="map"></div>
  <div class="info-box">
    <h3>📍 Statistiques</h3>
    <p><strong>Points:</strong> <span id="points"></span></p>
    <p><strong>Distance:</strong> <span id="distance"></span> km</p>
    <p><strong>Dénivelé:</strong> <span id="elevation"></span> m</p>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script>
    const coords = ${coordsJSON};
    
    const map = L.map('map').setView([${center.lat}, ${center.lon}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    
    const latLngs = coords.map(c => [c.lat, c.lon]);
    const polyline = L.polyline(latLngs, {
      color: '#ff4444',
      weight: 4,
      opacity: 0.8
    }).addTo(map);
    
    L.marker([coords[0].lat, coords[0].lon]).addTo(map).bindPopup('🚀 Départ');
    L.marker([coords[coords.length-1].lat, coords[coords.length-1].lon]).addTo(map).bindPopup('🏁 Arrivée');
    
    map.fitBounds(polyline.getBounds());
    
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    
    let totalDist = 0;
    for (let i = 1; i < coords.length; i++) {
      totalDist += haversine(coords[i-1].lat, coords[i-1].lon, coords[i].lat, coords[i].lon);
    }
    
    let elevGain = 0;
    for (let i = 1; i < coords.length; i++) {
      const diff = coords[i].ele - coords[i-1].ele;
      if (diff > 0) elevGain += diff;
    }
    
    document.getElementById('points').textContent = coords.length;
    document.getElementById('distance').textContent = totalDist.toFixed(2);
    document.getElementById('elevation').textContent = Math.round(elevGain);
  </script>
</body>
</html>`;
}

// Télécharger fichier
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Gérer l'upload
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  currentFileName = file.name.replace(/\.[^/.]+$/, '');
  fileNameDiv.textContent = '📁 ' + file.name;
  fileNameDiv.classList.remove('hidden');

  const reader = new FileReader();
  
  reader.onload = function(event) {
    const text = event.target.result;
    let coords = [];

    if (file.name.toLowerCase().endsWith('.kml')) {
      coords = parseKML(text);
    } else if (file.name.toLowerCase().endsWith('.gpx')) {
      coords = parseGPX(text);
    }

    if (coords.length > 0) {
      traceData = coords;
      mapHtml = generateMapHTML(coords, currentFileName);
      
      // Afficher la carte
      mapFrame.srcdoc = mapHtml;
      mapFooter.textContent = coords.length + ' points GPS • Carte OpenStreetMap';
      mapContainer.classList.remove('hidden');
      
      // Afficher les boutons de téléchargement
      downloadSection.classList.remove('hidden');
      
      // Masquer les instructions
      instructions.classList.add('hidden');
    } else {
      alert('Aucune coordonnée trouvée dans le fichier');
    }
  };
  
  reader.readAsText(file);
});

// Boutons de téléchargement
document.getElementById('btnHtml').addEventListener('click', () => {
  downloadFile(mapHtml, currentFileName + '.html', 'text/html');
});

document.getElementById('btnGpx').addEventListener('click', () => {
  downloadFile(toGPX(traceData), currentFileName + '.gpx', 'application/gpx+xml');
});

document.getElementById('btnKml').addEventListener('click', () => {
  downloadFile(toKML(traceData), currentFileName + '.kml', 'application/vnd.google-earth.kml+xml');
});

document.getElementById('btnGeojson').addEventListener('click', () => {
  downloadFile(toGeoJSON(traceData), currentFileName + '.geojson', 'application/geo+json');
});

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('Service Worker enregistré:', registration.scope);
      })
      .catch(error => {
        console.log('Erreur Service Worker:', error);
      });
  });
}