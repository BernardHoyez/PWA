// app.js – version avec correctif d'importation ZIP

/* =========================================================
   Données globales
========================================================= */
let pois = [];
let map, markerLayer;
let refLat = 0, refLon = 0;  // point de référence (fixe par défaut)

/* =========================================================
   Initialisation
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initEvents();
});

/* =========================================================
   Carte Leaflet
========================================================= */
function initMap() {
  map = L.map('map').setView([43, 6], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

/* =========================================================
   Événements
========================================================= */
function initEvents() {
  // Import ZIP au démarrage
  const startupImport = document.getElementById('startupImport');
  if (startupImport) {
    startupImport.addEventListener('change', handleImport);
  }

  // Ajout manuel d’un POI
  document.getElementById('addPoiBtn').addEventListener('click', addPOI);
}

/* =========================================================
   Import d’une visite précédente
========================================================= */
async function handleImport(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  try {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);
    const visitFile = zip.file("visit.json");
    if (!visitFile) {
      alert("visit.json introuvable dans l’archive.");
      return;
    }

    const text = await visitFile.async("string");
    const visit = JSON.parse(text);

    console.log("Contenu importé :", visit);          // diagnostic
    console.log("POI reçus :", visit.pois);           // diagnostic

    pois = []; // réinitialise

    if (Array.isArray(visit.pois)) {
      visit.pois.forEach((p, i) => {
        pois.push({
          id: p.id || crypto.randomUUID(),
          title: p.title || "",
          lat: Number(p.lat),
          lon: Number(p.lon),
          z: (typeof p.z === "number") ? p.z : i,
          comment: p.comment || "",
          image: p.image || null,
          audio: p.audio || null,
          video: p.video || null
        });
      });
    }

    renderPOIs();
  } catch (err) {
    console.error("Erreur d’import :", err);
    alert("Échec de l’import : " + err.message);
  }
}

/* =========================================================
   Affichage des POI
========================================================= */
function renderPOIs() {
  // Vider la carte et la liste
  markerLayer.clearLayers();
  const list = document.getElementById('poiList');
  list.innerHTML = '';

  pois.forEach((p, index) => {
    // --- Marqueur sur la carte
    const marker = L.marker([p.lat, p.lon], {
      zIndexOffset: p.z || index
    }).addTo(markerLayer);

    marker.bindPopup(`<strong>${p.title}</strong><br>${p.comment || ''}`);

    // --- Élément de liste (draggable)
    const li = document.createElement('li');
    li.className = 'poi-item';
    li.draggable = true;
    li.dataset.index = index;
    li.textContent = p.title;

    li.addEventListener('dragstart', dragStart);
    li.addEventListener('dragover', dragOver);
    li.addEventListener('drop', dropItem);

    list.appendChild(li);
  });
}

/* =========================================================
   Drag & Drop pour réorganiser la liste et le z-index
========================================================= */
let dragSrcIndex = null;

function dragStart(e) {
  dragSrcIndex = +e.target.dataset.index;
  e.dataTransfer.effectAllowed = 'move';
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function dropItem(e) {
  e.preventDefault();
  const targetIndex = +e.target.dataset.index;
  if (dragSrcIndex === targetIndex) return;

  // Réorganise le tableau
  const moved = pois.splice(dragSrcIndex, 1)[0];
  pois.splice(targetIndex, 0, moved);

  // Met à jour les z-index (0…n-1)
  pois.forEach((p, i) => p.z = i);

  renderPOIs();
}

/* =========================================================
   Ajout d’un POI vierge
========================================================= */
function addPOI() {
  const newPoi = {
    id: crypto.randomUUID(),
    title: "Nouveau POI",
    lat: refLat,
    lon: refLon,
    z: pois.length,
    comment: "",
    image: null,
    audio: null,
    video: null
  };
  pois.push(newPoi);
  renderPOIs();
}
