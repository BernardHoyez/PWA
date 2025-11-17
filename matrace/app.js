// Variables globales
let map;
let planLayer;
let orthoLayer;
let trackPolyline;
let trackCoords = [];
let watchId = null;
let intervalId = null;
let startTime = null;
let totalDistance = 0;
let isRecording = false;
let alertShown = false;

// Initialisation de la carte
function initMap() {
  map = L.map('map').setView([46.5, 2.5], 13);

  // Création des couches IGN
  planLayer = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', {
    attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2',
    maxZoom: 18,
    tileSize: 256,
    crossOrigin: true
  }).addTo(map);

  orthoLayer = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg', {
    attribution: '&copy; IGN / GéoPlateforme - Orthophotos',
    maxZoom: 18,
    tileSize: 256,
    crossOrigin: true
  });

  // Ajout du contrôleur de couches
  L.control.layers({
    "Plan IGN v2": planLayer,
    "Orthophoto IGN": orthoLayer
  }).addTo(map);

  // Initialisation de la polyline pour la trace
  trackPolyline = L.polyline([], { color: 'red' }).addTo(map);
}

// Fonction pour calculer la distance entre deux points (en mètres)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fonction pour formater le temps (en hh:mm:ss)
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// Fonction pour démarrer l'enregistrement
document.getElementById('start').addEventListener('click', () => {
  if (isRecording) return;
  isRecording = true;
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
  startTime = new Date();
  trackCoords = JSON.parse(localStorage.getItem('matraceTrace')) || [];
  if (trackCoords.length > 0) {
    trackPolyline.setLatLngs(trackCoords);
  }
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const now = new Date();
      const lastPoint = trackCoords.length > 0 ? trackCoords[trackCoords.length - 1] : null;
      if (lastPoint) {
        const distance = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
        totalDistance += distance;
      }
      trackCoords.push({ lat: latitude, lng: longitude, ts: now.getTime() });
      localStorage.setItem('matraceTrace', JSON.stringify(trackCoords));
      trackPolyline.setLatLngs(trackCoords);
      map.setView([latitude, longitude], 15);
      // Mise à jour de l'affichage
      const elapsedTime = Math.floor((now - startTime) / 1000);
      document.getElementById('stats').innerHTML =
        `Distance: ${(totalDistance / 1000).toFixed(2)} km<br>Temps: ${formatTime(elapsedTime)}`;
    },
    (error) => {
      console.error(error);
      showAlert();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
  // Enregistrement toutes les minutes
  intervalId = setInterval(() => {
    if (trackCoords.length > 0) {
      localStorage.setItem('matraceTrace', JSON.stringify(trackCoords));
    }
  }, 60000);
});

// Fonction pour arrêter l'enregistrement
document.getElementById('stop').addEventListener('click', () => {
  if (!isRecording) return;
  isRecording = false;
  document.getElementById('start').disabled = false;
  document.getElementById('stop').disabled = true;
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  localStorage.removeItem('matraceTrace');
});

// Fonction pour afficher une alerte (pastille rouge)
function showAlert() {
  if (alertShown) return;
  alertShown = true;
  const alertDiv = document.createElement('div');
  alertDiv.id = 'alert';
  alertDiv.style.position = 'fixed';
  alertDiv.style.bottom = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.width = '20px';
  alertDiv.style.height = '20px';
  alertDiv.style.backgroundColor = 'red';
  alertDiv.style.borderRadius = '50%';
  alertDiv.style.zIndex = '2000';
  alertDiv.title = "L'enregistrement a été interrompu !";
  document.body.appendChild(alertDiv);
  alert("L'enregistrement de la trace a été interrompu. Vérifiez votre connexion GPS.");
}

// Fonction pour exporter la trace
document.getElementById('export').addEventListener('click', () => {
  if (trackCoords.length === 0) {
    alert("Aucune trace enregistrée.");
    return;
  }
  const kml = generateKML(trackCoords);
  const gpx = generateGPX(trackCoords);
  downloadFile(kml, 'trace.kml', 'application/vnd.google-earth.kml+xml');
  downloadFile(gpx, 'trace.gpx', 'application/gpx+xml');
});

// Génération KML
function generateKML(track) {
  const coords = track.map(p => `${p.lng},${p.lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Trace matrace</name>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

// Génération GPX
function generateGPX(track) {
  const pts = track.map(p => `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.ts).toISOString()}</time></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<gpx version="1.1" creator="matrace" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trace matrace</name>
    <trkseg>${pts}</trkseg>
  </trk>
</gpx>`;
}

// Téléchargement de fichier
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Initialisation de la carte au chargement
window.addEventListener('load', () => {
  initMap();
  const savedTrace = localStorage.getItem('matraceTrace');
  if (savedTrace) {
    trackCoords = JSON.parse(savedTrace);
    trackPolyline.setLatLngs(trackCoords);
    const lastCoord = trackCoords[trackCoords.length - 1];
    map.setView([lastCoord.lat, lastCoord.lng], 15);
  }
});
