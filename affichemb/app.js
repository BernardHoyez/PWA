let map, userMarker, mbtilesLayer;

document.getElementById('mbtilesPicker').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('status').textContent = 'Chargement de ' + file.name + '...';

  // Crée la carte la première fois seulement
  if (!map) initMap();

  // Supprime l'ancienne couche
  if (mbtilesLayer) map.removeLayer(mbtilesLayer);

  const url = URL.createObjectURL(file);

  try {
    mbtilesLayer = L.tileLayer.mbTiles(url, {
      minZoom: 0,
      maxZoom: 20,
      tms: true,
      attribution: 'Carte hors-ligne'
    }).addTo(map);

    // Quand la carte est prête
    mbtilesLayer.once('load', async () => {
      document.getElementById('status').textContent = file.name + ' → affiché';
      
      // Centre sur les bounds du fichier MBTiles
      try {
        const metadata = await mbtilesLayer.getMetadata();
        if (metadata && metadata.bounds) {
          const bounds = L.latLngBounds(
            [metadata.bounds[1], metadata.bounds[0]],
            [metadata.bounds[3], metadata.bounds[2]]
          );
          map.fitBounds(bounds);
        }
      } catch (e) { console.log("Pas de bounds dans metadata"); }
    });

    mbtilesLayer.on('error', (err) => {
      document.getElementById('status').textContent = 'Erreur MBTiles : ' + (err.message || err);
    });

  } catch (err) {
    document.getElementById('status').textContent = 'Erreur : ' + err.message;
    console.error(err);
  }
});

function initMap() {
  map = L.map('map', { zoomControl: true });

  // Marqueur position GPS
  userMarker = L.circleMarker([0, 0], {
    radius: 10,
    color: '#fff',
    weight: 3,
    fillColor: '#f00',
    fillOpacity: 0.8
  }).addTo(map);

  // Suivi GPS continu
  map.locate({ setView: true, watch: true, enableHighAccuracy: true });
  map.on('locationfound', e => userMarker.setLatLng(e.latlng));
  map.on('locationerror', () => {
    document.getElementById('status').textContent = 'GPS non disponible';
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}