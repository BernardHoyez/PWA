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
    document.getElementById('preload-lat').value = lat.toFixed(6);
    document.getElementById('preload-lon').value = lng.toFixed(6);
  });
}

// Fonction pour basculer en mode en ligne
function setOnlineMode() {
  isOfflineMode = false;
  if (planLayer) {
    map.removeLayer(planLayer);
  }
  planLayer = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', {
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
    document.getElementById('preload-lat').value = latitude.toFixed(6);
    document.getElementById('preload-lon').value = longitude.toFixed(6);
  } catch (error) {
    console.error('Erreur lors de la récupération de la position:', error);
    alert('Impossible de récupérer votre position. La carte est centrée sur la France.');
    map.setView([46.5, 2.5], 13);
  }
}

// Fonction pour afficher le panneau de téléchargement préalable
document.getElementById('preload').addEventListener('click', () => {
  document.getElementById('preload-panel').style.display = 'block';
});

// Fonction pour fermer le panneau de téléchargement préalable
document.getElementById('close-preload-panel').addEventListener('click', () => {
  document.getElementById('preload-panel').style.display = 'none';
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
  simulateDownloadTiles(lat, lon, radius);
});

// Fonction pour centrer sur la position de l'utilisateur
document.getElementById('center-on-user').addEventListener('click', centerOnUserPosition);

// Fonction pour simuler le téléchargement des tuiles
function simulateDownloadTiles(lat, lon, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const zoomLevels = [13, 14, 15, 16];
  const tiles = [];

  // Calculer les tuiles nécessaires
  for (const zoom of zoomLevels) {
    const bbox = calculateBoundingBox(lat, lon, radiusMeters, zoom);
    const tilesForZoom = calculateTilesInBBox(bbox, zoom);
    tiles.push(...tilesForZoom);
  }

  // Simuler le téléchargement des tuiles
  const totalTiles = tiles.length;
  let downloadedTiles = 0;
  const progressBar = document.getElementById('preload-progress-bar');
  const progressText = document.getElementById('preload-progress-text');

  tiles.forEach(tile => {
    const tileId = `${tile.z}/${tile.x}/${tile.y}`;
    const tileUrl = `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${tile.z}&TILEROW=${tile.y}&TILECOL=${tile.x}&FORMAT=image/png`;

    // Stocker la tuile dans offlineTiles pour le mode hors ligne
    offlineTiles[tileId] = tileUrl;

    downloadedTiles++;
    const progress = Math.round((downloadedTiles / totalTiles) * 100);
    progressBar.value = progress;
    progressText.textContent = `${progress}%`;
  });

  setTimeout(() => {
    document.getElementById('preload-progress').style.display = 'none';
    alert('Téléchargement terminé avec succès !');
  }, 1000);
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

// Gestion des boutons de mode en ligne/hors ligne
document.getElementById('online-mode').addEventListener('click', () => {
  setOnlineMode();
  centerOnUserPosition();
});

document.getElementById('offline-mode').addEventListener('click', setOfflineMode);

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

  // Centrer sur la position de l'utilisateur au chargement
  centerOnUserPosition();
});
