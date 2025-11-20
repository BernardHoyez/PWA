let map, userMarker, mbtilesLayer;

document.getElementById('mbtilesPicker').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('status').textContent = 'Chargement de ' + file.name + '...';

  const url = URL.createObjectURL(file);

  if (mbtilesLayer) map.removeLayer(mbtilesLayer);
  if (map) map.remove();

  initMap();

  try {
    mbtilesLayer = new L.TileLayer.MBTiles(url, {
      minZoom: 0,
      maxZoom: 18,
      tms: true,               // la plupart des MBTiles sont en TMS
      attribution: 'Carte hors-ligne'
    }).addTo(map);

    // Récupérer les métadonnées pour centrer la carte
    const metadata = await mbtilesLayer.getMetadata();
    const bounds = L.latLngBounds(
      L.latLng(metadata.bounds[1], metadata.bounds[0]),
      L.latLng(metadata.bounds[3], metadata.bounds[2])
    );
    map.fitBounds(bounds);

    document.getElementById('status').textContent = file.name + ' chargé – ' + metadata.name;
  } catch (err) {
    document.getElementById('status').textContent = 'Erreur : ' + err.message;
    console.error(err);
  }
});

function initMap() {
  map = L.map('map', { zoomControl: true });

  // Marqueur de position GPS
  userMarker = L.circleMarker([0,0], {
    radius: 8,
    fillColor: '#ff0000',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(map);

  // Suivi GPS
  map.locate({ setView: true, watch: true, enableHighAccuracy: true });
  map.on('locationfound', (e) => {
    userMarker.setLatLng(e.latlng);
    // optionnel : recentrer doucement
    // map.panTo(e.latlng);
  });
  map.on('locationerror', () => {
    alert('Impossible d’obtenir la position GPS');
  });
}

// Enregistre le Service Worker pour le mode hors-ligne complet
if ('serviceWorker' in navigator) {
  navigator.registerServiceWorker('sw.js');
}