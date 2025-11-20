// Configuration pour GitHub Pages sous-dossier
const BASE_PATH = '/PWA/lirtuiles';
let map, gpsMarker, mbtilesLayer;

// Initialiser la carte
function initMap() {
  map = L.map('map').setView([48.8566, 2.3522], 13); // Paris par défaut
  
  // Fond neutre temporaire
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OSM'
  }).addTo(map);
}

// Charger MBTiles depuis fichier sélectionné
document.getElementById('mbtilesFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Supprimer ancienne couche
  if (mbtilesLayer) map.removeLayer(mbtilesLayer);
  
  // Créer URL temporaire
  const fileURL = URL.createObjectURL(file);
  
  // Charger MBTiles
  mbtilesLayer = L.tileLayer.mbTiles(fileURL, {
    minZoom: 10,
    maxZoom: 18
  }).addTo(map);
  
  mbtilesLayer.on('databaseloaded', () => {
    console.log('✅ MBTiles chargé');
    // Zoomer sur les bounds si disponibles
    mbtilesLayer.getBounds && map.fitBounds(mbtilesLayer.getBounds());
  });
  
  mbtilesLayer.on('databaseerror', (err) => {
    alert('Erreur de chargement MBTiles : ' + err.message);
  });
});

// Bouton GPS
document.getElementById('gpsBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Géolocalisation non supportée');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (gpsMarker) map.removeLayer(gpsMarker);
      
      gpsMarker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup('Vous êtes ici')
        .openPopup();
      
      map.setView([latitude, longitude], 16);
    },
    (err) => alert('Erreur GPS : ' + err.message),
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
});

// Initialiser au chargement
initMap();

// Enregistrer le Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` });
}