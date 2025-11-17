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
let isOfflineMode = false;
let offlineTiles = {};

// Fonction pour initialiser la carte
function initMap() {
  map = L.map('map').setView([46.5, 2.5], 13);

  // Initialiser en mode en ligne par défaut
  setOnlineMode();

  // Création des couches IGN
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
    document.getElementById('download-lat').value = lat.toFixed(6);
    document.getElementById('download-lon').value = lng.toFixed(6);
  });
}

// Fonction pour basculer en mode en ligne
function setOnlineMode() {
  isOfflineMode = false;
  document.getElementById('controls-online').style.display = 'block';
  document.getElementById('controls-offline').style.display = 'none';
  if (planLayer) {
    map.removeLayer(planLayer);
  }
  planLayer = L.tileLayer('https://wxs.ign.fr/choisirgeoportail/geoportail/wmts?LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', {
    attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2',
    maxZoom: 18,
    tileSize: 256,
    crossOrigin: true
  }).addTo(map);
  document.getElementById('online-mode').classList.add('active');
  document.getElementById('offline-mode').classList.remove('active');
}

// Fonction pour basculer en mode hors ligne
function setOfflineMode() {
  isOfflineMode = true;
  document.getElementById('controls-online').style.display = 'none';
  document.getElementById('controls-offline').style.display = 'block';
  if (planLayer) {
    map.removeLayer(planLayer);
  }

  // Utiliser une couche personnalisée pour les tuiles hors ligne
  planLayer = L.tileLayer('', {
    attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2 (hors ligne)',
    maxZoom: 18,
    tileSize: 256,
    errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  });

  // Remplacer la méthode createTile pour utiliser les tuiles hors ligne
  planLayer.createTile = function(coords, done) {
    const tile = document.createElement('img');
    const z = coords.z;
    const x = coords.x;
    const y = coords.y;
    const tileId = `${z}/${x}/${y}`;

    // Vérifier si la tuile est disponible hors ligne
    const tileUrl = offlineTiles[tileId];
    if (tileUrl) {
      tile.src = tileUrl;
    } else {
      tile.src = this.options.errorTileUrl;
    }

    done(null, tile);
    return tile;
  };

  planLayer.addTo(map);
  document.getElementById('offline-mode').classList.add('active');
  document.getElementById('online-mode').classList.remove('active');
}

// Fonction pour centrer la carte sur la position de l'utilisateur
async function centerOnUserPosition() {
  if (!navigator.geolocation) {
    alert('La géolocalisation n\'est pas supportée par votre navigateur.');
    return;
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
    });

    const { latitude, longitude } = position.coords;
    map.setView([latitude, longitude], 15);
    return { latitude, longitude };
  } catch (error) {
    console.error('Erreur lors de la récupération de la position:', error);
    alert('Impossible de récupérer votre position. La carte est centrée sur la France.');
    map.setView([46.5, 2.5], 13);
    return { latitude: 46.5, longitude: 2.5 };
  }
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

// Fonction pour démarrer l'enregistrement en mode en ligne
document.getElementById('start-online').addEventListener('click', () => {
  if (isRecording) return;
  isRecording = true;
  document.getElementById('start-online').disabled = true;
  document.getElementById('stop-online').disabled = false;
  startTime = new Date();
  trackCoords = JSON.parse(localStorage.getItem('matrace4Trace')) || [];
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
      localStorage.setItem('matrace4Trace', JSON.stringify(trackCoords));
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
      localStorage.setItem('matrace4Trace', JSON.stringify(trackCoords));
    }
  }, 60000);
});

// Fonction pour arrêter l'enregistrement en mode en ligne
document.getElementById('stop-online').addEventListener('click', () => {
  if (!isRecording) return;
  isRecording = false;
  document.getElementById('start-online').disabled = false;
  document.getElementById('stop-online').disabled = true;
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

// Fonction pour démarrer l'enregistrement en mode hors ligne
document.getElementById('start-offline').addEventListener('click', () => {
  if (isRecording) return;
  isRecording = true;
  document.getElementById('start-offline').disabled = true;
  document.getElementById('stop-offline').disabled = false;
  startTime = new Date();
  trackCoords = JSON.parse(localStorage.getItem('matrace4Trace')) || [];
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
      localStorage.setItem('matrace4Trace', JSON.stringify(trackCoords));
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
      localStorage.setItem('matrace4Trace', JSON.stringify(trackCoords));
    }
  }, 60000);
});

// Fonction pour arrêter l'enregistrement en mode hors ligne
document.getElementById('stop-offline').addEventListener('click', () => {
  if (!isRecording) return;
  isRecording = false;
  document.getElementById('start-offline').disabled = false;
  document.getElementById('stop-offline').disabled = true;
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
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

// Fonction pour exporter la trace en mode en ligne
document.getElementById('export-online').addEventListener('click', () => {
  if (trackCoords.length === 0) {
    alert("Aucune trace enregistrée.");
    return;
  }
  exportTrace();
});

// Fonction pour exporter la trace en mode hors ligne
document.getElementById('export-offline').addEventListener('click', () => {
  if (trackCoords.length === 0) {
    alert("Aucune trace enregistrée.");
    return;
  }
  exportTrace();
});

// Fonction pour exporter la trace
async function exportTrace() {
  const kml = generateKML(trackCoords);
  const gpx = generateGPX(trackCoords);

  try {
    const dirHandle = await window.showDirectoryPicker();
    const tracesDirHandle = await dirHandle.getDirectoryHandle('traces', { create: true });

    const kmlFileHandle = await tracesDirHandle.getFileHandle(`trace_${new Date().toISOString().replace(/[:.]/g, '-')}.kml`, { create: true });
    const kmlWritable = await kmlFileHandle.createWritable();
    await kmlWritable.write(kml);
    await kmlWritable.close();

    const gpxFileHandle = await tracesDirHandle.getFileHandle(`trace_${new Date().toISOString().replace(/[:.]/g, '-')}.gpx`, { create: true });
    const gpxWritable = await gpxFileHandle.createWritable();
    await gpxWritable.write(gpx);
    await gpxWritable.close();

    alert('Traces exportées avec succès dans Android/data/traces !');
  } catch (error) {
    console.error('Erreur lors de l\'export des traces:', error);
    alert('Erreur lors de l\'export des traces.');
  }
}

// Génération KML
function generateKML(track) {
  const coords = track.map(p => `${p.lng},${p.lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Trace matrace4</name>
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
<gpx version="1.1" creator="matrace4" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trace matrace4</name>
    <trkseg>${pts}</trkseg>
  </trk>
</gpx>`;
}

// Fonction pour afficher le panneau de téléchargement des cartes
document.getElementById('download-map').addEventListener('click', () => {
  document.getElementById('download-panel').style.display = 'block';
});

// Fonction pour fermer le panneau de téléchargement des cartes
document.getElementById('close-download-panel').addEventListener('click', () => {
  document.getElementById('download-panel').style.display = 'none';
});

// Fonction pour annuler le téléchargement des cartes
document.getElementById('download-cancel').addEventListener('click', () => {
  document.getElementById('download-panel').style.display = 'none';
});

// Fonction pour confirmer le téléchargement des cartes
document.getElementById('download-confirm').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('download-lat').value);
  const lon = parseFloat(document.getElementById('download-lon').value);
  const radius = parseInt(document.getElementById('download-radius').value);

  if (isNaN(lat) || isNaN(lon)) {
    alert("Veuillez entrer des coordonnées valides.");
    return;
  }

  document.getElementById('download-progress').style.display = 'block';
  downloadTiles(lat, lon, radius);
});

// Fonction pour centrer sur la position de l'utilisateur dans le panneau de téléchargement
document.getElementById('center-on-user-download').addEventListener('click', async () => {
  const position = await centerOnUserPosition();
  document.getElementById('download-lat').value = position.latitude.toFixed(6);
  document.getElementById('download-lon').value = position.longitude.toFixed(6);
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
  const progressBar = document.getElementById('download-progress-bar');
  const progressText = document.getElementById('download-progress-text');

  // Initialiser IndexedDB pour stocker les tuiles
  const dbName = 'matrace4MBTilesDB';
  const storeName = 'tiles';

  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: 'id' });
    }
  };

  request.onsuccess = async (event) => {
    const db = event.target.result;
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    for (const tile of tiles) {
      const url = `https://wxs.ign.fr/choisirgeoportail/geoportail/wmts?LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${tile.z}&TILEROW=${tile.y}&TILECOL=${tile.x}&FORMAT=image/png`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const tileId = `${tile.z}/${tile.x}/${tile.y}`;
          const tileData = {
            id: tileId,
            z: tile.z,
            x: tile.x,
            y: tile.y,
            blob: blobUrl
          };
          store.put(tileData);
          offlineTiles[tileId] = blobUrl;
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

    transaction.oncomplete = () => {
      if (failedDownloads > 0) {
        alert(`Téléchargement terminé avec ${failedDownloads} échec(s) sur ${totalTiles} tuiles.`);
      } else {
        alert(`Téléchargement terminé avec succès !`);
        saveMBTilesFile();
      }
    };
  };
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

// Fonction pour sauvegarder les tuiles dans un fichier MBTiles
async function saveMBTilesFile() {
  const dbName = 'matrace4MBTilesDB';
  const storeName = 'tiles';

  const request = indexedDB.open(dbName, 1);

  request.onsuccess = async (event) => {
    const db = event.target.result;
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = async (event) => {
      const tiles = event.target.result;
      if (tiles.length === 0) {
        alert("Aucune tuile n'a été téléchargée.");
        return;
      }

      // Initialiser la base de données SQLite
      const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
      const mbTilesDB = new SQL.Database();

      // Créer les tables nécessaires pour un fichier MBTiles
      mbTilesDB.run(`
        CREATE TABLE metadata (name text, value text);
        CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
      `);

      // Ajouter les métadonnées obligatoires pour un fichier MBTiles
      const metadata = [
        { name: 'name', value: 'matrace4' },
        { name: 'format', value: 'png' },
        { name: 'version', value: '1' },
        { name: 'type', value: 'baselayer' },
        { name: 'description', value: 'Tuiles IGN pour matrace4' }
      ];

      metadata.forEach(m => {
        mbTilesDB.run(`INSERT INTO metadata (name, value) VALUES (?, ?)`, [m.name, m.value]);
      });

      // Ajouter les tuiles à la base de données
      for (const tile of tiles) {
        if (tile.blob) {
          const response = await fetch(tile.blob);
          const arrayBuffer = await response.arrayBuffer();
          mbTilesDB.run(
            `INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)`,
            [tile.z, tile.x, tile.y, new Uint8Array(arrayBuffer)]
          );
        }
      }

      // Exporter la base de données en tant que fichier binaire
      const mbtilesData = mbTilesDB.export();
      const mbtilesBlob = new Blob([mbtilesData], { type: 'application/x-sqlite3' });

      // Demander à l'utilisateur de sélectionner un dossier
      try {
        const dirHandle = await window.showDirectoryPicker();
        const cartesDirHandle = await dirHandle.getDirectoryHandle('cartes', { create: true });

        const fileName = `tiles_${new Date().toISOString().replace(/[:.]/g, '-')}.mbtiles`;
        const fileHandle = await cartesDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(mbtilesBlob);
        await writable.close();
        alert(`Fichier MBTiles enregistré avec succès dans Android/data/cartes/${fileName}.`);
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du fichier MBTiles:', error);
        alert('Erreur lors de l\'enregistrement du fichier MBTiles.');
      }
    };
  };
}

// Fonction pour afficher le panneau de chargement des cartes
document.getElementById('load-map').addEventListener('click', () => {
  document.getElementById('load-map-panel').style.display = 'block';
});

// Fonction pour fermer le panneau de chargement des cartes
document.getElementById('close-load-map-panel').addEventListener('click', () => {
  document.getElementById('load-map-panel').style.display = 'none';
});

// Fonction pour sélectionner un fichier MBTiles
document.getElementById('select-mbtiles').addEventListener('click', () => {
  document.getElementById('import-mbtiles').click();
});

// Fonction pour importer un fichier MBTiles
document.getElementById('import-mbtiles').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('load-map-progress').style.display = 'block';

  try {
    const buffer = await file.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    const db = new SQL.Database(new Uint8Array(buffer));

    // Lire les métadonnées
    const metadata = db.exec("SELECT * FROM metadata");
    console.log("Métadonnées:", metadata);

    // Lire les tuiles
    const tiles = db.exec("SELECT * FROM tiles");
    if (tiles && tiles.length > 0) {
      for (const row of tiles[0].values) {
        const z = row[0];
        const x = row[1];
        const y = row[2];
        const tileData = row[3];
        const tileId = `${z}/${x}/${y}`;

        const blob = new Blob([tileData], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);
        offlineTiles[tileId] = blobUrl;
      }
      alert('Fichier MBTiles importé avec succès !');
      document.getElementById('load-map-progress').style.display = 'none';
      // Rafraîchir la carte pour afficher les nouvelles tuiles
      if (isOfflineMode) {
        setOfflineMode();
      }
    } else {
      alert('Aucune tuile trouvée dans le fichier MBTiles.');
      document.getElementById('load-map-progress').style.display = 'none';
    }
  } catch (error) {
    console.error('Erreur lors de l\'import du fichier MBTiles:', error);
    alert('Erreur lors de l\'import du fichier MBTiles.');
    document.getElementById('load-map-progress').style.display = 'none';
  }
});

// Gestion des boutons de mode en ligne/hors ligne
document.getElementById('online-mode').addEventListener('click', () => {
  setOnlineMode();
  centerOnUserPosition();
});

document.getElementById('offline-mode').addEventListener('click', setOfflineMode);

// Initialisation de la carte au chargement
window.addEventListener('load', () => {
  initMap();
  const savedTrace = localStorage.getItem('matrace4Trace');
  if (savedTrace) {
    trackCoords = JSON.parse(savedTrace);
    trackPolyline.setLatLngs(trackCoords);
    const lastCoord = trackCoords[trackCoords.length - 1];
    map.setView([lastCoord.lat, lastCoord.lng], 15);
  }

  // Mise à jour de l'affichage du rayon
  document.getElementById('download-radius').addEventListener('input', (e) => {
    document.getElementById('download-radius-value').textContent = e.target.value;
  });

  // Centrer sur la position de l'utilisateur au chargement
  centerOnUserPosition();
});
