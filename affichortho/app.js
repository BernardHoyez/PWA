let map, userMarker, currentLayer;

const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ignUrl = 'https://wxs.ign.fr/geoportail/wmts?' +
  'layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&' +
  'Format=image/jpeg&TileMatrix={z}&TileCol={x}&TileRow={y}';

const osmLayer = L.tileLayer(osmUrl, { attribution: '© OSM contributors' });
const ignLayer = L.tileLayer(ignUrl, { attribution: '© IGN' });

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
    });
} else {
  alert('Géolocalisation non supportée');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}