let zip; // Variable globale pour stocker le ZIP chargé

// Enregistrement du Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/PWA/Visite/sw.js")
      .then((registration) => {
        console.log("ServiceWorker enregistré :", registration.scope);
      })
      .catch((err) => {
        console.error("Échec de l'enregistrement du ServiceWorker :", err);
      });
  });
}

// Gestion du chargement du ZIP
document.getElementById('zipFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  JSZip.loadAsync(file)
    .then(z => {
      zip = z;
      return zip.file("visit.json").async("string");
    })
    .then(jsonData => {
      const visitData = JSON.parse(jsonData);
      initMap(visitData);
    })
    .catch(err => {
      console.error("Erreur lors du chargement du ZIP :", err);
      alert("Erreur lors du chargement du fichier ZIP. Vérifie sa structure.");
    });
});

// Initialisation de la carte
function initMap(visitData) {
  const firstPoi = visitData.pois[0];
  const [lat, lng] = parseLocation(firstPoi.location);
  const map = L.map('map').setView([lat, lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  visitData.pois.forEach(poi => {
    const [lat, lng] = parseLocation(poi.location);
    const markerColor = getMarkerColor(poi);
    const marker = L.circleMarker([lat, lng], {
      color: markerColor,
      radius: 10,
      fillOpacity: 0.5
    }).addTo(map);

    // Popup basique
    marker.bindPopup(`
      <b>${poi.title}</b><br>
      ${poi.comment}<br>
      Coordonnées : \${poi.location}
    `);

    // Charger les médias au clic
    marker.on('click', () => {
      loadMediaForPOI(poi.id, (mediaHtml) => {
        marker.setPopupContent(`
          <b>\${poi.title}</b><br>
          ${poi.comment}<br>
          Coordonnées : ${poi.location}<br><br>
          \${mediaHtml}
        `);
      });
    });
  });
}

// Parse la localisation (ex: "50.04525N, 1.32983E")
function parseLocation(locationStr) {
  const [latStr, lngStr] = locationStr.split(", ");
  const lat = parseFloat(latStr.replace("N", ""));
  const lng = parseFloat(lngStr.replace("E", ""));
  return [lat, lng];
}

// Couleur du marker
function getMarkerColor(poi) {
  if (poi.image && poi.audio) return "purple";
  if (poi.video) return "red";
  if (poi.image) return "blue";
  return "gray";
}

// Charge les médias pour un POI
function loadMediaForPOI(poiId, callback) {
  const folder = zip.folder(`data/${poiId}`);
  if (!folder) {
    callback("Aucun média disponible.");
    return;
  }

  let mediaHtml = "";
  let mediaCount = 0;
  const files = Object.keys(folder.files);

  files.forEach(fileName => {
    if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
      folder.file(fileName).async("blob").then(blob => {
        const url = URL.createObjectURL(blob);
        mediaHtml += `
