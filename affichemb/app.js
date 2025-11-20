let map, userMarker, mbtilesLayer;

document.getElementById('mbtilesPicker').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('status').textContent = 'Chargement de ' + file.name + '...';

  if (!map) initMap();
  if (mbtilesLayer) map.removeLayer(mbtilesLayer);

  const url = URL.createObjectURL(file);

  try {
    // ← Ligne magique qui fonctionne partout
    mbtilesLayer = new L.TileLayer.MBTiles(url, {
      minZoom: 0,
      maxZoom: 20,
      tms: true,
      attribution: 'Carte hors-ligne'
    }).addTo(map);

    mbtilesLayer.on('load', async () => {
      document.getElementById('status').textContent = file.name + ' → affiché';

      try {
        const metadata = await mbtilesLayer.getMetadata();
        if (metadata?.bounds) {
          const bounds = L.latLngBounds(
            [metadata.bounds[1], metadata.bounds[0]],
            [metadata.bounds[3], metadata.bounds[2]]
          );
          map.fitBounds(bounds);
        }
      } catch (e) { console.log('Pas de bounds dans les métadonnées'); }
    });

    mbtilesLayer.on('error', (err) => {
      document.getElementById('status').textContent = 'Erreur MBTiles : ' + (err.message || 'inconnu');
    });

  } catch (err) {
    document.getElementById('status').textContent = 'Erreur : ' + err.message;
    console.error(err);
  }
});

function initMap() {
  map = L.map('map', { zoomControl: true });

  // Marqueur GPS rouge
  userMarker = L.circleMarker([0, 0], {
    radius: 10,
    color: '#fff',
    weight: 3,
    fillColor: '#f00',
    fillOpacity: 0.8
  }).addTo(map);

  // Suivi GPS en continu
  map.locate({ setView: true, watch: true, enableHighAccuracy: true });
  map.on('locationfound', e => userMarker.setLatLng(e.latlng));
  map.on('locationerror', () => {
    document.getElementById('status').textContent += ' – GPS indisponible';
  });
}

// Service Worker pour le mode hors-ligne
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}