// app.js - editpoi (mis à jour : visite title, EXIF -> lat/lon, extrait Leaflet, audio/video players)
// Dépendances nécessaires (CDN dans index.html) : Leaflet, JSZip, FileSaver, EXIF.js

'use strict';

/* ---------- Modèle en mémoire ---------- */
const visit = {
  title: 'Visite',
  referenceMode: 'fixed', // 'fixed' ou 'gps'
  referencePos: { lat: 0, lon: 0 },
  pois: [] // chaque POI : { id, title, lat, lon, zIndex, comment, image(File), video(File), audio(File), distance, bearing }
};

/* ---------- Cartes / marqueurs ---------- */
let map, poiLayer, refMarker;
let excerptMap, excerptMarker; // petit extrait dans le formulaire

/* ---------- Helpers géo ---------- */
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function bearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2 - lon1));
  let br = toDeg(Math.atan2(y, x));
  br = (br + 360) % 360;
  return Math.round(br);
}

/* ---------- Utilitaires DOM ---------- */
const $ = id => document.getElementById(id);

/* ---------- Initialisation ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMap();
  initExcerptMap();
  bindEvents();
  renderAll();
});

/* ---------- UI / cartes init ---------- */
function initMap() {
  map = L.map('map').setView([visit.referencePos.lat, visit.referencePos.lon], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19 }).addTo(map);
  poiLayer = L.layerGroup().addTo(map);
  refMarker = L.marker([visit.referencePos.lat, visit.referencePos.lon], { draggable: false }).addTo(map).bindPopup('Référence');
  map.on('click', e => {
    // cliquer sur la carte principal remplit lat/lon du formulaire
    setFormLatLon(e.latlng.lat, e.latlng.lng);
    moveExcerptTo(e.latlng.lat, e.latlng.lng);
  });
}

function initExcerptMap() {
  // petit extrait pour vérification / correction de la géolocalisation d'un POI
  excerptMap = L.map('mapExcerpt', { attributionControl: false, zoomControl: true }).setView([0, 0], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom: 19 }).addTo(excerptMap);
  excerptMarker = L.marker([0,0], { draggable: true }).addTo(excerptMap);
  excerptMarker.on('dragend', () => {
    const latlng = excerptMarker.getLatLng();
    setFormLatLon(latlng.lat, latlng.lng);
    updateDistanceAndBearingInForm();
  });
}

/* ---------- Liaison UI ---------- */
function initUI(){
  // charger titre de visite existant
  $('visitTitle').value = visit.title;
}

function bindEvents() {
  // Mode référence radio
  document.querySelectorAll('input[name="refmode"]').forEach(r => r.addEventListener('change', e => {
    visit.referenceMode = e.target.value;
    if (visit.referenceMode === 'fixed') {
      visit.referencePos = { lat: 0, lon: 0 };
      refMarker.setLatLng([0,0]);
      map.setView([0,0], 2);
    } else {
      // GPS mode: try to obtain position when selected if possible
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          visit.referencePos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          refMarker.setLatLng([visit.referencePos.lat, visit.referencePos.lon]);
          map.setView([visit.referencePos.lat, visit.referencePos.lon], 14);
          updateAllComputed();
          renderPOIList();
        }, err => {
          console.warn('GPS error', err);
          alert('Impossible d\'obtenir la position GPS : ' + err.message);
        });
      }
    }
  }));

  // Bouton obtenir GPS manuellement
  $('getpos').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('GPS non disponible'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      visit.referenceMode = 'gps';
      visit.referencePos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      refMarker.setLatLng([visit.referencePos.lat, visit.referencePos.lon]);
      map.setView([visit.referencePos.lat, visit.referencePos.lon], 14);
      updateAllComputed();
      renderPOIList();
    }, err => alert('Erreur GPS: ' + err.message));
  });

  // Titre de la visite
  $('visitTitle').addEventListener('input', e => { visit.title = e.target.value; });

  // Formulaire POI
  $('poiForm').addEventListener('submit', onPoiFormSubmit);
  $('cancelEdit').addEventListener('click', () => { clearForm(); });

  // Inputs lat / lon -> mettre à jour excerpt & distance
  $('lat').addEventListener('input', () => { moveExcerptToInputs(); updateDistanceAndBearingInForm(); });
  $('lon').addEventListener('input', () => { moveExcerptToInputs(); updateDistanceAndBearingInForm(); });

  // Image EXIF -> mise à jour lat/lon si présente
  $('image').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) { $('thumbPreview').innerHTML = ''; return; }
    // vignette
    const img = document.createElement('img'); img.src = URL.createObjectURL(f); img.style.maxWidth = '160px';
    $('thumbPreview').innerHTML = ''; $('thumbPreview').appendChild(img);

    // EXIF extraction (s'il y en a)
    try{
      EXIF.getData(f, function(){
        const latDMS = EXIF.getTag(this, 'GPSLatitude');
        const lonDMS = EXIF.getTag(this, 'GPSLongitude');
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
        const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E';
        if (latDMS && lonDMS) {
          const latDec = dmsToDecimal(latDMS, latRef);
          const lonDec = dmsToDecimal(lonDMS, lonRef);
          setFormLatLon(latDec, lonDec);
          moveExcerptTo(latDec, lonDec);
          updateDistanceAndBearingInForm();
        }
      });
    } catch(e) { console.warn('EXIF error', e); }
  });

  // Video / Audio previews
  $('video').addEventListener('change', ev => {
    const f = ev.target.files[0];
    const box = $('videoPreview'); box.innerHTML = '';
    if (f) {
      const v = document.createElement('video'); v.controls = true; v.src = URL.createObjectURL(f); v.style.maxWidth = '280px';
      box.appendChild(v);
    }
  });
  $('audio').addEventListener('change', ev => {
    const f = ev.target.files[0];
    const box = $('audioPreview'); box.innerHTML = '';
    if (f) {
      const a = document.createElement('audio'); a.controls = true; a.src = URL.createObjectURL(f);
      box.appendChild(a);
    }
  });

  // Import / Export
  $('importZip').addEventListener('change', handleZipInput);
  $('startupImport').addEventListener('change', handleZipInput); // import au démarrage
  $('validateVisit').addEventListener('click', exportVisitZip);
}

/* ---------- Form helpers ---------- */
function setFormLatLon(lat, lon) {
  $('lat').value = Number(lat).toFixed(6);
  $('lon').value = Number(lon).toFixed(6);
}

function moveExcerptTo(lat, lon) {
  try {
    excerptMarker.setLatLng([lat, lon]);
    excerptMap.setView([lat, lon], excerptMap.getZoom());
  } catch(e){ /* si la map n'est pas prête, ignore */ }
}

function moveExcerptToInputs(){
  const lat = parseFloat($('lat').value);
  const lon = parseFloat($('lon').value);
  if (!isNaN(lat) && !isNaN(lon)) moveExcerptTo(lat, lon);
}

function updateDistanceAndBearingInForm() {
  const lat = parseFloat($('lat').value);
  const lon = parseFloat($('lon').value);
  if (isNaN(lat) || isNaN(lon)) { $('distance').textContent = '-'; $('bearing').textContent = '-'; return; }
  const d = haversineDist(visit.referencePos.lat, visit.referencePos.lon, lat, lon);
  const b = bearing(visit.referencePos.lat, visit.referencePos.lon, lat, lon);
  $('distance').textContent = d;
  $('bearing').textContent = 'N' + String(b).padStart(3,'0') + '°';
}

/* ---------- EXIF helper ---------- */
function dmsToDecimal(dms, ref) {
  // dms: array [deg, min, sec] each as {numerator, denominator} or number
  function val(x){
    if (typeof x === 'number') return x;
    if (x.numerator !== undefined && x.denominator !== undefined) return x.numerator / x.denominator;
    return Number(x);
  }
  const deg = val(dms[0]), min = val(dms[1]), sec = val(dms[2]);
  let dec = deg + min/60 + sec/3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

/* ---------- Form submit (ajout / modification POI) ---------- */
function onPoiFormSubmit(ev) {
  ev.preventDefault();
  const id = $('poiId').value || ('poi_' + Date.now());
  const title = $('title').value.trim();
  const lat = parseFloat($('lat').value);
  const lon = parseFloat($('lon').value);
  const zIndex = parseInt($('zIndex').value || '0', 10) || 0;
  const comment = $('comment').value || '';

  if (!title || isNaN(lat) || isNaN(lon)) { alert('Titre et coordonnées obligatoires'); return; }

  // Récupération fichiers
  const imageFile = $('image').files[0] || null;
  const videoFile = $('video').files[0] || null;
  const audioFile = $('audio').files[0] || null;

  // si existant => mise à jour
  const existing = visit.pois.find(p => p.id === id);
  if (existing) {
    existing.title = title; existing.lat = lat; existing.lon = lon; existing.zIndex = zIndex; existing.comment = comment;
    if (imageFile) existing.image = imageFile;
    if (videoFile) existing.video = videoFile;
    if (audioFile) existing.audio = audioFile;
  } else {
    visit.pois.push({
      id, title, lat, lon, zIndex, comment,
      image: imageFile, video: videoFile, audio: audioFile
    });
  }

  updateAllComputed();
  renderAll();
  clearForm();
}

/* ---------- Clear / load edit ---------- */
function clearForm() {
  $('poiForm').reset();
  $('poiId').value = '';
  $('thumbPreview').innerHTML = '';
  $('videoPreview').innerHTML = '';
  $('audioPreview').innerHTML = '';
  $('distance').textContent = '-';
  $('bearing').textContent = '-';
  // reset excerpt marker
  try { excerptMarker.setLatLng([0,0]); excerptMap.setView([0,0], 2); } catch(e){}
}

function loadPoiIntoForm(id) {
  const p = visit.pois.find(x => x.id === id);
  if (!p) return;
  $('poiId').value = p.id;
  $('title').value = p.title;
  $('lat').value = Number(p.lat).toFixed(6);
  $('lon').value = Number(p.lon).toFixed(6);
  $('zIndex').value = p.zIndex || 0;
  $('comment').value = p.comment || '';
  // previews
  $('thumbPreview').innerHTML = '';
  if (p.image) {
    const img = document.createElement('img'); img.src = URL.createObjectURL(p.image); img.style.maxWidth = '160px';
    $('thumbPreview').appendChild(img);
  }
  $('videoPreview').innerHTML = '';
  if (p.video) {
    const v = document.createElement('video'); v.controls = true; v.src = URL.createObjectURL(p.video); v.style.maxWidth = '280px';
    $('videoPreview').appendChild(v);
  }
  $('audioPreview').innerHTML = '';
  if (p.audio) {
    const a = document.createElement('audio'); a.controls = true; a.src = URL.createObjectURL(p.audio);
    $('audioPreview').appendChild(a);
  }
  moveExcerptTo(p.lat, p.lon);
  updateDistanceAndBearingInForm();
}

/* ---------- Calculs sur tous les POI ---------- */
function updateAllComputed() {
  visit.pois.forEach(p => {
    p.distance = haversineDist(visit.referencePos.lat, visit.referencePos.lon, p.lat, p.lon);
    p.bearing = bearing(visit.referencePos.lat, visit.referencePos.lon, p.lat, p.lon);
  });
}

/* ---------- Affichage liste POI et marqueurs ---------- */
function renderPOIList() {
  const list = $('poiList'); list.innerHTML = '';
  // vider couche marqueurs
  poiLayer.clearLayers();

  // trier par zIndex
  visit.pois.sort((a,b) => (a.zIndex||0) - (b.zIndex||0));

  for (const p of visit.pois) {
    // DOM
    const item = document.createElement('div'); item.className = 'poi-item';
    const thumb = document.createElement('img'); thumb.className = 'poi-thumb';
    if (p.image) { thumb.src = URL.createObjectURL(p.image); thumb.onerror = ()=>thumb.style.display='none'; } else { thumb.style.display = 'none'; }
    const meta = document.createElement('div'); meta.className = 'poi-meta';
    meta.innerHTML = `<strong>${escapeHtml(p.title)}</strong><br>${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}<br>dist ${p.distance} m • N${String(p.bearing).padStart(3,'0')}°<br><small>${escapeHtml(p.comment||'')}</small>`;
    const actions = document.createElement('div'); actions.className = 'poi-actions';
    const btnMove = document.createElement('button'); btnMove.textContent = 'Déplacer';
    btnMove.onclick = () => startMoveOnMap(p.id);
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Edit';
    btnEdit.onclick = () => loadPoiIntoForm(p.id);
    const btnDel = document.createElement('button'); btnDel.textContent = 'Suppr';
    btnDel.onclick = () => { if (confirm('Supprimer ce POI ?')) { visit.pois = visit.pois.filter(x => x.id !== p.id); updateAllComputed(); renderAll(); } };
    actions.append(btnMove, btnEdit, btnDel);

    // media preview players inside list
    const mediaBox = document.createElement('div');
    if (p.video) { const v = document.createElement('video'); v.controls = true; v.src = URL.createObjectURL(p.video); v.style.maxWidth='240px'; mediaBox.appendChild(v); }
    if (p.audio) { const a = document.createElement('audio'); a.controls = true; a.src = URL.createObjectURL(p.audio); mediaBox.appendChild(a); }

    item.appendChild(thumb); item.appendChild(meta); item.appendChild(actions); item.appendChild(mediaBox);
    list.appendChild(item);

    // marqueur sur la carte principale
    const m = L.marker([p.lat, p.lon], { title: p.title, riseOnHover: true }).addTo(poiLayer);
    m.bindPopup(`<strong>${escapeHtml(p.title)}</strong><br>${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`);
  }
}

function renderAll() {
  updateAllComputed();
  renderPOIList();
  // mise à jour marqueur référence
  try { refMarker.setLatLng([visit.referencePos.lat, visit.referencePos.lon]); } catch(e){}
}

/* ---------- Déplacer un POI (drag) ---------- */
function startMoveOnMap(poiId) {
  const p = visit.pois.find(x => x.id === poiId); if (!p) return;
  alert('Déplacez le marqueur qui va apparaître, puis relâchez pour positionner le POI.');
  const mk = L.marker([p.lat, p.lon], { draggable: true }).addTo(map);
  mk.on('dragend', () => {
    const latlng = mk.getLatLng();
    p.lat = latlng.lat; p.lon = latlng.lng;
    updateAllComputed();
    mk.remove();
    renderAll();
  });
}

/* ---------- Import ZIP (startup ou latéral) ---------- */
async function handleZipInput(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const zip = await JSZip.loadAsync(file);
    if (!zip.files['visit.json']) { alert('ZIP invalide : visit.json manquant'); return; }
    const content = await zip.files['visit.json'].async('string');
    const imported = JSON.parse(content);

    // reconstruire visit
    visit.title = imported.title || visit.title;
    $('visitTitle').value = visit.title;
    visit.referenceMode = imported.referenceMode || visit.referenceMode;
    visit.referencePos = imported.referencePos || visit.referencePos;
    visit.pois = [];

    // charger medias depuis data/
    for (const p of imported.pois || []) {
      const newP = { id: p.id, title: p.title, lat: p.lat, lon: p.lon, zIndex: p.zIndex, comment: p.comment };
      // image
      if (p.imageName && zip.file('data/' + p.imageName)) {
        const ab = await zip.file('data/' + p.imageName).async('arraybuffer');
        const mime = mimeFromFilename(p.imageName) || 'image/jpeg';
        newP.image = new File([ab], p.imageName, { type: mime });
      }
      if (p.videoName && zip.file('data/' + p.videoName)) {
        const ab = await zip.file('data/' + p.videoName).async('arraybuffer');
        const mime = mimeFromFilename(p.videoName) || 'video/mp4';
        newP.video = new File([ab], p.videoName, { type: mime });
      }
      if (p.audioName && zip.file('data/' + p.audioName)) {
        const ab = await zip.file('data/' + p.audioName).async('arraybuffer');
        const mime = mimeFromFilename(p.audioName) || 'audio/mpeg';
        newP.audio = new File([ab], p.audioName, { type: mime });
      }
      visit.pois.push(newP);
    }

    // update reference marker + affichage
    refMarker.setLatLng([visit.referencePos.lat, visit.referencePos.lon]);
    map.setView([visit.referencePos.lat, visit.referencePos.lon], 13);
    updateAllComputed();
    renderAll();
    alert('Import OK');
  } catch (err) {
    console.error(err);
    alert('Erreur import ZIP : ' + (err.message || err));
  } finally {
    // réinitialiser l'input de fichier pour pouvoir re-importer le même fichier si nécessaire
    ev.target.value = '';
  }
}

/* ---------- Export ZIP ---------- */
async function exportVisitZip() {
  if (!visit.pois.length) { alert('Aucun POI à exporter'); return; }
  const zip = new JSZip();
  const dataFolder = zip.folder('data');
  const exported = {
    title: visit.title,
    referenceMode: visit.referenceMode,
    referencePos: visit.referencePos,
    pois: []
  };

  for (const p of visit.pois) {
    const obj = { id: p.id, title: p.title, lat: p.lat, lon: p.lon, zIndex: p.zIndex, comment: p.comment };
    if (p.image) {
      const ext = extensionOf(p.image.name) || '.jpg';
      const fname = `${p.id}_image${ext}`;
      dataFolder.file(fname, p.image);
      obj.imageName = fname;
    }
    if (p.video) {
      const ext = extensionOf(p.video.name) || '.mp4';
      const fname = `${p.id}_video${ext}`;
      dataFolder.file(fname, p.video);
      obj.videoName = fname;
    }
    if (p.audio) {
      const ext = extensionOf(p.audio.name) || '.mp3';
      const fname = `${p.id}_audio${ext}`;
      dataFolder.file(fname, p.audio);
      obj.audioName = fname;
    }
    exported.pois.push(obj);
  }

  zip.file('visit.json', JSON.stringify(exported, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'visit_export.zip');
}

/* ---------- Utilitaires ---------- */
function extensionOf(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}
function mimeFromFilename(name) {
  const ext = (extensionOf(name) || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  return '';
}
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

/* ---------- Mise à jour calculs et affichage ---------- */
function updateAllComputed() {
  visit.pois.forEach(p => {
    p.distance = haversineDist(visit.referencePos.lat, visit.referencePos.lon, p.lat, p.lon);
    p.bearing = bearing(visit.referencePos.lat, visit.referencePos.lon, p.lat, p.lon);
  });
}

/* ---------- Chargement / rendu complet ---------- */
function renderAll() {
  updateAllComputed();
  renderPOIList();
}

/* ---------- Edition : chargement d'un POI (facilité) ---------- */
function editPOI(poiId){
  loadPoiIntoForm(poiId);
}

/* ---------- Déplacer le marker d'extrait vers les inputs (déclenché par inputs) ---------- */
/* déjà géré par moveExcerptToInputs() */

function startMoveOnMapById(id) { startMoveOnMap(id); }

/* ---------- Service Worker (enregistrement) ---------- */
function registerServiceWorker(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/PWA/editpoi/sw.js').catch(e => console.warn('sw register failed', e));
  }
}

/* ---------- Gestion ZIP input wrapper ---------- */
function handleZipInput(ev){ handleZipInputEvent(ev); } // alias - défini plus haut

/* ---------- Fonction d'export public pour bouton ---------- */
$('validateVisit').addEventListener ? null : null; // no-op : bouton déjà lié dans bindEvents

// note : startMoveOnMap, editPOI etc. sont exposés via closures ci-dessus

/* ---------- Fin du fichier ---------- */
