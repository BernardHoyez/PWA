let map, userMarker, currentLayer;

const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Fonction pour inverser le Y (TileRow) pour WMTS IGN
function getIgnUrlTemplate() {
  return function(data) {
    // Inversion du Y pour correspondre au schéma WMTS de l'IGN
    const y = Math.pow(2, data.z) - 1 - data.y;
    return `https://wxs.ign.fr/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX=${data.z}&TILEROW=${y}&TILECOL=${data.x}`;
  }
}

const osmLayer = L.tileLayer(osmUrl, { attribution: '© OSM contributors' });
const ignLayer = L.tileLayer(getIgnUrlTemplate(), {
  attribution: '© IGN',
  tileSize: 256,
  minZoom: 0,
  maxZoom: 19,
  continuousWorld: true,
  noWrap: true
});

function initMap(lat, lon) {
  map = L.map('map', {
    center: [lat, lon],
    zoom: 17,
    layers: [osmLayer]
  });
  currentLayer = osmLayer;
  userMarker = L.marker([lat, lon]).addTo(map);
}

function switchLayer(layer) {
  if (currentLayer) map.removeLayer(currentLayer);
  map.addLayer(layer);
  currentLayer = layer;
}

document.getElementById('osmBtn').onclick = () => switchLayer(osmLayer);
document.getElementById('ignBtn').onclick = () => switchLayer(ignLayer);

if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      const {latitude, longitude} = pos.coords;
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