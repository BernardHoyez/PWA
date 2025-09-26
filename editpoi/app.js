/* ===========================================================
   editpoi – app.js
   -----------------------------------------------------------
   Gère : carte Leaflet, ajout/édition POI, import/export ZIP,
   sauvegarde locale IndexedDB, restauration du brouillon.
   =========================================================== */

///// === Variables globales === /////
let map;
let pois = [];
let visitTitle = "";
const dbName = "editpoiDB";
const storeName = "currentVisit";

///// === Initialisation === /////
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindUI();
  registerSW();
  loadDraft();
});

///// === Leaflet Map === /////
function initMap() {
  map = L.map("map").setView([48.8566, 2.3522], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
  map.on("click", e => {
    document.getElementById("lat").value = e.latlng.lat.toFixed(6);
    document.getElementById("lng").value = e.latlng.lng.toFixed(6);
  });
}

///// === UI Bindings === /////
function bindUI() {
  document.getElementById("btnAddPoi").addEventListener("click", addPoi);
  document.getElementById("btnExport").addEventListener("click", exportZip);
  document.getElementById("btnImport").addEventListener("change", importZip);
  document.getElementById("btnClearDraft").addEventListener("click", clearDraft);
  document.getElementById("visitTitle").addEventListener("input", e => {
    visitTitle = e.target.value.trim();
    saveDraft();
  });
  document.getElementById("poiImage").addEventListener("change", readExif);
}

///// === Ajout POI === /////
function addPoi() {
  const title = document.getElementById("poiTitle").value.trim();
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const comment = document.getElementById("poiComment").value.trim();
  if (!title || isNaN(lat) || isNaN(lng)) {
    alert("Titre et coordonnées obligatoires");
    return;
  }

  const id = "poi-" + Date.now();
  const poi = { id, title, lat, lng, comment, files: {} };

  const imageFile = document.getElementById("poiImage").files[0];
  const audioFile = document.getElementById("poiAudio").files[0];
  const videoFile = document.getElementById("poiVideo").files[0];
  if (imageFile) poi.files.image = imageFile;
  if (audioFile) poi.files.audio = audioFile;
  if (videoFile) poi.files.video = videoFile;

  pois.push(poi);
  renderPoiList();
  saveDraft();
  resetPoiForm();
}

function resetPoiForm() {
  document.getElementById("poiTitle").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
  document.getElementById("poiComment").value = "";
  document.getElementById("poiImage").value = "";
  document.getElementById("poiAudio").value = "";
  document.getElementById("poiVideo").value = "";
}

///// === Rendu liste POI === /////
function renderPoiList() {
  const list = document.getElementById("poiList");
  list.innerHTML = "";
  pois.forEach((p, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${p.title}`;
    li.draggable = true;
    li.addEventListener("dragstart", e => e.dataTransfer.setData("index", idx));
    li.addEventListener("dragover", e => e.preventDefault());
    li.addEventListener("drop", e => {
      const from = e.dataTransfer.getData("index");
      movePoi(from, idx);
    });
    const delBtn = document.createElement("button");
    delBtn.textContent = "X";
    delBtn.onclick = () => { pois.splice(idx, 1); renderPoiList(); saveDraft(); };
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function movePoi(from, to) {
  const item = pois.splice(from, 1)[0];
  pois.splice(to, 0, item);
  renderPoiList();
  saveDraft();
}

///// === Export ZIP === /////
async function exportZip() {
  if (!visitTitle) {
    alert("Titre de la visite manquant");
    return;
  }
  const zip = new JSZip();
  const dataFolder = zip.folder("data");
  const jsonPois = [];

  for (const p of pois) {
    const poiFolder = dataFolder.folder(p.id);
    const filesMeta = {};
    for (const [k, f] of Object.entries(p.files)) {
      const arrayBuffer = await f.arrayBuffer();
      poiFolder.file(f.name, arrayBuffer);
      filesMeta[k] = {
        name: f.name,
        type: f.type,
        path: `data/${p.id}/${f.name}`
      };
    }
    jsonPois.push({
      id: p.id,
      title: p.title,
      lat: p.lat,
      lng: p.lng,
      comment: p.comment,
      files: filesMeta
    });
  }

  const visit = { title: visitTitle, pois: jsonPois };
  zip.file("visit.json", JSON.stringify(visit, null, 2));
  zip.generateAsync({ type: "blob" }).then(blob => {
    saveAs(blob, `${sanitizeFileName(visitTitle)}.zip`);
  });
}

function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9-_]/gi, "_");
}

///// === Import ZIP === /////
async function importZip(e) {
  const file = e.target.files[0];
  if (!file) return;
  const zip = await JSZip.loadAsync(file);
  const visitJson = await zip.file("visit.json").async("string");
  const visit = JSON.parse(visitJson);
  visitTitle = visit.title;
  document.getElementById("visitTitle").value = visitTitle;
  pois = [];

  for (const p of visit.pois) {
    const poi = { ...p, files: {} };
    for (const [k, meta] of Object.entries(p.files)) {
      const blob = await zip.file(meta.path).async("blob");
      poi.files[k] = new File([blob], meta.name, { type: meta.type });
    }
    pois.push(poi);
  }
  renderPoiList();
  saveDraft();
}

///// === EXIF Lecture === /////
function readExif(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  EXIF.getData(file, function() {
    const lat = EXIF.getTag(this, "GPSLatitude");
    const lon = EXIF.getTag(this, "GPSLongitude");
    const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
    const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";
    if (lat && lon) {
      document.getElementById("lat").value = dmsToDec(lat, latRef);
      document.getElementById("lng").value = dmsToDec(lon, lonRef);
    }
  });
}

function dmsToDec(dms, ref) {
  const deg = dms[0].numerator / dms[0].denominator;
  const min = dms[1].numerator / dms[1].denominator;
  const sec = dms[2].numerator / dms[2].denominator;
  let dec = deg + min / 60 + sec / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec.toFixed(6);
}

///// === IndexedDB Draft === /////
function saveDraft() {
  const openReq = indexedDB.open(dbName, 1);
  openReq.onupgradeneeded = e => e.target.result.createObjectStore(storeName);
  openReq.onsuccess = e => {
    const db = e.target.result;
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put({ title: visitTitle, pois }, "draft");
  };
}

function loadDraft() {
  const openReq = indexedDB.open(dbName, 1);
  openReq.onupgradeneeded = e => e.target.result.createObjectStore(storeName);
  openReq.onsuccess = e => {
    const db = e.target.result;
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get("draft");
    req.onsuccess = () => {
      if (req.result) {
        if (confirm("Restaurer la dernière session ?")) {
          visitTitle = req.result.title;
          pois = req.result.pois || [];
          document.getElementById("visitTitle").value = visitTitle;
          renderPoiList();
        }
      }
    };
  };
}

function clearDraft() {
  const openReq = indexedDB.open(dbName, 1);
  openReq.onsuccess = e => {
    const db = e.target.result;
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete("draft");
    alert("Brouillon supprimé.");
  };
}

///// === Service Worker === /////
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
}
