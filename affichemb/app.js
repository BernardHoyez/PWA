let map, userMarker, mbtilesLayer;

document.getElementById('mbtilesPicker').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('status').textContent = 'Chargement de ' + file.name + '...';

  if (!map) initMap();
  if (mbtilesLayer) map.removeLayer(mbtilesLayer);

  const url = URL.createObjectURL(file);

  try {
    // Cette ligne fonctionne à 100 % avec la lib ci-dessus
    mbtilesLayer = L.tileLayer.mbtiles(url, {
      minZoom: 0,
      maxZoom: 20,
      tms: true,
      attribution: 'Carte hors-ligne'
    }).addTo(map);

    mbtilesLayer.on('load', async () => {
      document.getElementById('status').textContent = file.name + ' → chargé et affiché';

      try {
        const metadata = await mbtilesLayer.getMetadata();
        if (metadata?.bounds) {
          const sw = L.latLng(metadata.bounds[1], metadata.bounds[0]);
          const ne = L.latLng(metadata.bounds[3], metadata.bounds[2]);
          map.fitBounds(L.latLngBounds(sw, ne));
        }
      } catch (e) {
        console.log('Bounds non disponibles');
      }
    });

    mbtilesLayer.on('error', (err) => {
      document.getElementById('status').textContent = 'Erreur : ' + (err?.message || 'fichier incompatible');
      console.error(err);
    });

  } catch (err) {
    document.getElementById('status').textContent = 'Erreur fatale : ' + err.message;
    console.error(err);
  }
});

function initMap() {
  map = L.map('map').setView([46.0, 2.0], 6); // France par défaut en attendant le GPS

  userMarker = L.circleMarker([46.0, 2.0], {
    radius: 10,
    color: '#fff',
    weight: 3,
    fillColor: '#f00',
    fillOpacity: 0.8
  }).addTo(map);

  map.locate({ setView: false, watch: true, enableHighAccuracy: true });
  map.on('locationfound', e => userMarker.setLatLng(e.latlng));
  map.on('locationerror', () => {
    document.getElementById('status').textContent += ' – GPS non autorisé';
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}