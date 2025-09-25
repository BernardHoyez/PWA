// === Variables globales ===
let map, poiLayer;
let pois = [];       // tableau de POI
let markers = [];    // marqueurs Leaflet
let dragSrcIndex = null;

// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindUI();
});

// --- Carte Leaflet ---
function initMap() {
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
  poiLayer = L.layerGroup().addTo(map);
}

// --- Interface ---
function bindUI() {
  document.getElementById('btnExport').addEventListener('click', exportVisit);
  document.getElementById('btnImport').addEventListener('click', () =>
      document.getElementById('importZip').click()
  );
  document.getElementById('importZip').addEventListener('change', handleImport);
}

// === DRAG & DROP ===
function dragStart(e) {
  dragSrcIndex = +e.currentTarget.dataset.index;
  e.dataTransfer.effectAllowed = 'move';
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
function dropItem(e) {
  e.preventDefault();
  const targetIndex = +e.currentTarget.dataset.index;
  if (dragSrcIndex === targetIndex) return;
  const moved = pois.splice(dragSrcIndex, 1)[0];
  pois.splice(targetIndex, 0, moved);
  pois.forEach((p,i)=>p.z = i); // mise à jour des z
  renderPOIs();
}

// === Affichage liste + marqueurs ===
function renderPOIs() {
  const list = document.getElementById('poiList');
  list.innerHTML = '';
  markers.forEach(m => m.remove());
  markers = [];

  pois.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'poi-item';
    div.draggable = true;
    div.dataset.index = index;
    div.addEventListener('dragstart', dragStart);
    div.addEventListener('dragover', dragOver);
    div.addEventListener('drop', dropItem);

    const meta = document.createElement('div');
    meta.textContent = `${p.title} (${p.lat.toFixed(4)}, ${p.lon.toFixed(4)})`;
    div.appendChild(meta);

    const actions = document.createElement('div');
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => {
      pois = pois.filter(x => x.id !== p.id);
      renderPOIs();
    };
    actions.appendChild(delBtn);
    div.appendChild(actions);

    list.appendChild(div);

    // Marqueur sur la carte
    const marker = L.marker([p.lat, p.lon], { zIndexOffset: p.z || index })
      .bindPopup(p.title)
      .addTo(map);
    markers.push(marker);
  });
}

// === Export ZIP ===
async function exportVisit() {
  const zip = new JSZip();
  const visit = {
    name: document.getElementById('visitName').value || "",
    pois: pois
  };
  zip.file("visit.json", JSON.stringify(visit, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, (visit.name || "visite") + ".zip");
}

// === Import ZIP ===
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const zip = await JSZip.loadAsync(file);
    const visitFile = zip.file("visit.json");
    if (!visitFile) {
      alert("visit.json introuvable");
      return;
    }
    const visitText = await visitFile.async("string");
    const visit = JSON.parse(visitText);

    document.getElementById('visitName').value = visit.name || "";
    pois = [];
    if (Array.isArray(visit.pois)) {
      visit.pois.forEach((p, i) => {
        pois.push({
          id: p.id || crypto.randomUUID(),
          title: p.title || "",
          lat: p.lat,
          lon: p.lon,
          z: (typeof p.z === 'number') ? p.z : i,
          comment: p.comment || "",
          image: p.image || null,
          audio: p.audio || null,
          video: p.video || null
        });
      });
    }
    renderPOIs();
    alert("Visite importée !");
  } catch (err) {
    console.error(err);
    alert("Erreur import : " + err.message);
  }
}

// === Exemple d’ajout manuel de POI (bouton ou autre) ===
// pois.push({id:crypto.randomUUID(),title:'Exemple',lat:43.1,lon:6.2,z:0});
// renderPOIs();
