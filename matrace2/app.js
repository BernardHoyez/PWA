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

  // Gestion du clic sur la carte pour définir le point central
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    document.getElementById('preload-lat').value = lat.toFixed(6);
    document.getElementById('preload-lon').value = lng.toFixed(6);
  });
}

// Fonction pour calculer la distance entre deux points (en mètres)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

// Fonction pour afficher le panneau de téléchargement préalable
document.getElementById('preload').addEventListener('click', () => {
  document.getElementById('preload-panel').style.display = 'block';
});

// Fonction pour annuler le téléchargement préalable
document.getElementById('preload-cancel').addEventListener('click', () => {
  document.getElementById('preload-panel').style.display = 'none';
});

// Fonction pour confirmer le téléchargement préalable
document.getElementById('preload-confirm').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('preload-lat').value);
  const lon = parseFloat(document.getElementById('preload-lon').value);
  const radius = parseInt(document.getElementById('preload-radius').value);

  if (isNaN(lat) || isNaN(lon)) {
    alert("Veuillez entrer des coordonnées valides.");
    return;
  }

  document.getElementById('preload-progress').style.display = 'block';
  downloadTiles(lat, lon, radius);
});

// Fonction pour télécharger les tuiles
async function downloadTiles(lat, lon, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const zoomLevels = [13, 14, 15, 16];
  const tiles = [];
  let failedDownloads = 0;

  // Calculer les tuiles nécessaires
  for (const zoom of zoomLevels) {
    const bbox = calculateBoundingBox(lat, lon, radiusMeters, zoom);
    const tilesForZoom = calculateTilesInBBox(bbox, zoom);
    tiles.push(...tilesForZoom);
  }

  // Télécharger les tuiles
  const totalTiles = tiles.length;
  let downloadedTiles = 0;
  const progressBar = document.getElementById('preload-progress-bar');
  const progressText = document.getElementById('preload-progress-text');

  for (const tile of tiles) {
    const url = `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${tile.z}&TILEROW=${tile.y}&TILEROW=${tile.y}&TILECOL=${tile.x}&FORMAT=image/png`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        try {
          await saveTileToMBTiles(tile, blob);
        } catch (saveError) {
          console.error(`Échec de la sauvegarde de la tuile ${tile.z}/${tile.x}/${tile.y}:`, saveError);
          failedDownloads++;
        }
      } else {
        console.warn(`Échec du téléchargement de la tuile ${url}: statut HTTP ${response.status}`);
        failedDownloads++;
      }
    } catch (error) {
      console.error(`Erreur lors du téléchargement de la tuile ${url}:`, error);
      failedDownloads++;
    }

    downloadedTiles++;
    const progress = Math.round((downloadedTiles / totalTiles) * 100);
    progressBar.value = progress;
    progressText.textContent = `${progress}% (${failedDownloads} échec(s))`;
  }

  if (failedDownloads > 0) {
    alert(`Téléchargement terminé avec ${failedDownloads} échec(s) sur ${totalTiles} tuiles.`);
  } else {
    alert(`Téléchargement terminé avec succès !`);
  }

  // Générer le fichier MBTiles
  generateMBTilesFile();
}

// Fonction pour calculer la bounding box
function calculateBoundingBox(lat, lon, radiusMeters, zoom) {
  const earthCircumference = 40075016.686;
  const latRad = lat * Math.PI / 180;
  const latDelta = (radiusMeters / earthCircumference) * 360;
  const lonDelta = (radiusMeters / (earthCircumference * Math.cos(latRad))) * 360;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}

// Fonction pour calculer les tuiles dans une bounding box
function calculateTilesInBBox(bbox, zoom) {
  const tiles = [];

  const n = Math.pow(2, zoom);
  const xMin = Math.floor((bbox.minLon + 180) / 360 * n);
  const xMax = Math.ceil((bbox.maxLon + 180) / 360 * n) - 1;
  const yMin = Math.floor((1 - Math.log(Math.tan(bbox.maxLat * Math.PI / 180) + 1 / Math.cos(bbox.maxLat * Math.PI / 180)) / Math.PI) / 2 * n);
  const yMax = Math.ceil((1 - Math.log(Math.tan(bbox.minLat * Math.PI / 180) + 1 / Math.cos(bbox.minLat * Math.PI / 180)) / Math.PI) / 2 * n) - 1;

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ z: zoom, x: x, y: y });
    }
  }

  return tiles;
}

// Fonction pour sauvegarder une tuile dans IndexedDB
function saveTileToMBTiles(tile, blob) {
  return new Promise((resolve, reject) => {
    const dbName = 'matrace2MBTilesDB';
    const storeName = 'tiles';

    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const tileId = `${tile.z}/${tile.x}/${tile.y}`;
      const tileData = {
        id: tileId,
        z: tile.z,
        x: tile.x,
        y: tile.y,
        blob: blob
      };

      const putRequest = store.put(tileData);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Fonction pour générer le fichier MBTiles
function generateMBTilesFile() {
  const dbName = 'matrace2MBTilesDB';
  const storeName = 'tiles';

  const request = indexedDB.open(dbName, 1);

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = (event) => {
      const tiles = event.target.result;
      if (tiles.length === 0) {
        alert("Aucune tuile n'a été téléchargée.");
        return;
      }

      // Générer un fichier MBTiles
      const mbtiles = createMBTiles(tiles);
      downloadBlob(mbtiles, 'tiles.mbtiles', 'application/x-sqlite3');
    };
  };
}

// Fonction pour créer un fichier MBTiles
function createMBTiles(tiles) {
  // Note: En pratique, vous devrez utiliser une bibliothèque comme sqlite3-wasm ou un service backend pour créer le fichier MBTiles.
  // Ici, nous allons simuler la création d'un fichier MBTiles en téléchargeant un fichier vide pour l'instant.
  return new Blob([], { type: 'application/x-sqlite3' });
}

// Fonction pour télécharger un blob
function downloadBlob(blob, filename, type) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Fonction pour démarrer l'enregistrement
document.getElementById('start').addEventListener('click', () => {
  if (isRecording) return;
  isRecording = true;
  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
  startTime = new Date();
  trackCoords = JSON.parse(localStorage.getItem('matrace2Trace')) || [];
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
      localStorage.setItem('matrace2Trace', JSON.stringify(trackCoords));
      trackPolyline.setLatLngs(trackCoords);
      map.setView([latitude, longitude], 15);
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
  intervalId = setInterval(() => {
    if (trackCoords.length > 0) {
      localStorage.setItem('matrace2Trace', JSON.stringify(trackCoords));
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
  localStorage.removeItem('matrace2Trace');
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
};

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
      <name>Trace matrace2</name>
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
<gpx version="1.1" creator="matrace2" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trace matrace2</name>
    <trkseg>${pts}</trkseg>
  </trk>
</gpx>`;
}

// Initialisation de la carte au chargement
window.addEventListener('load', () => {
  initMap();
  const savedTrace = localStorage.getItem('matrace2Trace');
  if (savedTrace) {
    trackCoords = JSON.parse(savedTrace);
    trackPolyline.setLatLngs(trackCoords);
    const lastCoord = trackCoords[trackCoords.length - 1];
    map.setView([lastCoord.lat, lastCoord.lng], 15);
  }

  // Mise à jour de l'affichage du rayon
  document.getElementById('preload-radius').addEventListener('input', (e) => {
    document.getElementById('preload-radius-value').textContent = e.target.value;
  });
});
