let map, userMarker, currentLayer;
let osmLayer, ignLayer;

// Désactive les boutons jusqu'à l'init de la carte
document.getElementById('osmBtn').disabled = true;
document.getElementById('ignBtn').disabled = true;

const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function initMap(lat, lon) {
  osmLayer = L.tileLayer(osmUrl, { attribution: '© OSM contributors' });
  ignLayer = L.tileLayer('', { // URL vide, fonction getTileUrl utilisée
    attribution: '© IGN',
    tileSize: 256,
    minZoom: 0,
    maxZoom: 19,
    continuousWorld: true,
    noWrap: true,
    getTileUrl: function(coords) {
      const z = coords.z;
      const x = coords.x;
      const y = Math.pow(2, z) - 1 - coords.y;
      return `https://wxs.ign.fr/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
    }
  });

  map = L.map('map', {
    center: [lat, lon],
    zoom: 17,
    layers: [osmLayer]
  });
  currentLayer = osmLayer;
  userMarker = L.marker([lat, lon]).addTo(map);

  document.getElementById('osmBtn').disabled = false;
  document.getElementById('ignBtn').disabled = false;

  document.getElementById('osmBtn').onclick = () => switchLayer(osmLayer);
  document.getElementById('ignBtn').onclick = () => switchLayer(ignLayer);
}

function switchLayer(layer) {
  if (!map) return;
  if (currentLayer) map.removeLayer(currentLayer);
  map.addLayer(layer);
  currentLayer = layer;
}

if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      initMap(latitude, longitude);
    },
    err => {
      alert('Impossible d’obtenir la position GPS');
      initMap(48.858370, 2.294481); // Défaut : Paris
    }
  );
} else {
  alert('Géolocalisation non supportée');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}