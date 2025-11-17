// Variables globales
let map;
let planLayer;
let orthoLayer;
let vectorLayer;
let trace = [];
let watchId = null;
let intervalId = null;
let startTime = null;
let totalDistance = 0;
let isRecording = false;
let alertShown = false;

// Initialisation de la carte
function initMap() {
  // Création des couches IGN
  planLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
      attributions: '&copy; IGN / GéoPlateforme - Plan IGN v2',
      crossOrigin: 'anonymous'
    }),
    visible: true,
    minZoom: 12,
    maxZoom: 18
  });

  orthoLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',
      attributions: '&copy; IGN / GéoPlateforme - Orthophotos',
      crossOrigin: 'anonymous'
    }),
    visible: false,
    minZoom: 12,
    maxZoom: 18
  });

  // Couche pour la trace
  vectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'red',
        width: 3
      })
    })
  });

  // Initialisation de la carte
  map = new ol.Map({
    target: 'map',
    layers: [planLayer, orthoLayer, vectorLayer],
    view: new ol.View({
      center: ol.proj.fromLonLat([2.5, 46.5]),
      zoom: 13,
      minZoom: 12,
      maxZoom: 18
    })
  });
}

// Fonction pour calculer la distance entre deux points (en mètres)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
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
  trace = JSON.parse(localStorage.getItem('matraceTrace')) || [];
  if (trace.length > 0) {
    const lineString = new ol.geom.LineString(trace);
    const feature = new ol.Feature({ geometry: lineString });
    vectorLayer.getSource().addFeature(feature);
  }
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const now = new Date();
      const lastPoint = trace.length > 0 ? trace[trace.length - 1] : null;
      if (lastPoint) {
        const distance = calculateDistance(lastPoint[1], lastPoint[0], latitude, longitude);
        totalDistance += distance;
      }
      trace.push([longitude, latitude]);
      localStorage.setItem('matraceTrace', JSON.stringify(trace));
      const lineString = new ol.geom.LineString(trace);
      const feature = new ol.Feature({ geometry: lineString });
      vectorLayer.getSource().clear();
      vectorLayer.getSource().addFeature(feature);
      map.getView().setCenter(ol.proj.fromLonLat([longitude, latitude]));
      map.getView().setZoom(15);
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
    if (trace.length > 0) {
      localStorage.setItem('matraceTrace', JSON.stringify(trace));
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
  if (trace.length === 0) {
    alert("Aucune trace enregistrée.");
    return;
  }
  const kml = generateKML(trace);
  const gpx = generateGPX(trace);
  downloadFile(kml, 'trace.kml', 'application/vnd.google-earth.kml+xml');
  downloadFile(gpx, 'trace.gpx', 'application/gpx+xml');
});

// Génération KML
function generateKML(trace) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Trace matrace</name>
      <LineString>
        <coordinates>
          ${trace.map(point => `${point[0]},${point[1]}`).join(' ')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

// Génération GPX
function generateGPX(trace) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="matrace">
  <trk>
    <name>Trace matrace</name>
    <trkseg>
      ${trace.map(point => `<trkpt lat="${point[1]}" lon="${point[0]}"></trkpt>`).join('')}
    </trkseg>
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

// Ajout d'un élément pour afficher les stats
const statsDiv = document.createElement('div');
statsDiv.id = 'stats';
statsDiv.style.position = 'fixed';
statsDiv.style.bottom = '20px';
statsDiv.style.left = '20px';
statsDiv.style.backgroundColor = 'white';
statsDiv.style.padding = '10px';
statsDiv.style.borderRadius = '5px';
statsDiv.style.zIndex = '1000';
statsDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
document.body.appendChild(statsDiv);

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PWA/matrace/sw.js');
  });
}

// Initialisation de la carte au chargement
window.addEventListener('load', () => {
  initMap();
  const savedTrace = localStorage.getItem('matraceTrace');
  if (savedTrace) {
    trace = JSON.parse(savedTrace);
    const lineString = new ol.geom.LineString(trace);
    const feature = new ol.Feature({ geometry: lineString });
    vectorLayer.getSource().addFeature(feature);
    map.getView().setCenter(ol.proj.fromLonLat(trace[trace.length - 1]));
    map.getView().setZoom(15);
  }
});
