/* ═══════════════════════════════════════════════
   AjouteWPT — app.js
   Logique principale de l'application
═══════════════════════════════════════════════ */

'use strict';

// ── État global ─────────────────────────────────
const state = {
  rawWaypoints: [],        // [{id, filename, originalName, thumb, compressedDataUrl, compressedSize, name, comment, exifLat, exifLon}]
  geoWaypoints: [],        // copie enrichie avec lat/lon placés
  selectedGeoIdx: null,    // index du waypoint sélectionné dans Fenêtre B
  editIdx: null,           // index en cours d'édition (step 1)
  map: null,
  tileLayer: null,
  markers: {},             // {idx: leaflet marker}
  traceLayer: null,
};

// ── Onglets ─────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    target.classList.add('active');
    if (btn.dataset.tab === 'step2' && !state.map) initMap();
  });
});

// ══════════════════════════════════════════════
// ÉTAPE 1 — Waypoints bruts
// ══════════════════════════════════════════════

const folderInput = document.getElementById('folderInput');
const dropZone    = document.getElementById('dropZone');
const rawList     = document.getElementById('rawList');
const step1Actions = document.getElementById('step1Actions');

// Drag & drop dossier
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  processFiles(e.dataTransfer.files);
});
dropZone.addEventListener('click', () => folderInput.click());
folderInput.addEventListener('change', () => processFiles(folderInput.files));

async function processFiles(files) {
  const imgs = Array.from(files).filter(f => /\.(jpe?g|png)$/i.test(f.name));
  if (!imgs.length) { showToast('Aucune image JPG/PNG trouvée.', 'error'); return; }
  showToast(`Traitement de ${imgs.length} image(s)…`);

  for (const file of imgs) {
    const wpt = await buildRawWaypoint(file);
    state.rawWaypoints.push(wpt);
  }
  renderRawList();
}

async function buildRawWaypoint(file) {
  const id = crypto.randomUUID();
  // Lire EXIF
  const exif = await readExif(file);
  // Générer vignette 100 px
  const thumb = await resizeImage(file, 100, null, 0.85);
  // Compresser à max 500 ko
  const compressed = await compressTo500k(file);

  return {
    id,
    filename: file.name,
    originalName: file.name.replace(/\.[^.]+$/, ''),
    thumb,                    // dataURL vignette 100 px
    compressedDataUrl: compressed.dataUrl,
    compressedSize: compressed.size,
    name: '',
    comment: '',
    exifLat: exif.lat,
    exifLon: exif.lon,
    exifDate: exif.date,
  };
}

// ── EXIF ────────────────────────────────────────
function readExif(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const view = new DataView(e.target.result);
        const exifData = parseExifGPS(view);
        resolve(exifData);
      } catch {
        resolve({ lat: null, lon: null, date: null });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseExifGPS(view) {
  // Chercher marqueur EXIF APP1 (0xFFE1) dans JPEG
  try {
    if (view.getUint16(0) !== 0xFFD8) return { lat: null, lon: null, date: null };
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) {
        // APP1 - chercher "Exif\0\0"
        const segLen = view.getUint16(offset + 2);
        const exifHeader = String.fromCharCode(...new Uint8Array(view.buffer, offset + 4, 6));
        if (exifHeader.startsWith('Exif')) {
          return parseIFD(view, offset + 10);
        }
        offset += 2 + segLen;
      } else if ((marker & 0xFF00) === 0xFF00) {
        offset += 2 + view.getUint16(offset + 2);
      } else break;
    }
  } catch {}
  return { lat: null, lon: null, date: null };
}

function parseIFD(view, tiffStart) {
  try {
    const little = view.getUint16(tiffStart) === 0x4949;
    const ifdOffset = view.getUint32(tiffStart + 4, little);
    const entries = view.getUint16(tiffStart + ifdOffset, little);
    let gpsIFDOffset = null;
    let dateStr = null;

    for (let i = 0; i < entries; i++) {
      const e = tiffStart + ifdOffset + 2 + i * 12;
      const tag = view.getUint16(e, little);
      if (tag === 0x8825) gpsIFDOffset = view.getUint32(e + 8, little);
      if (tag === 0x9003) {
        // DateTimeOriginal
        const count = view.getUint32(e + 4, little);
        const valOff = view.getUint32(e + 8, little);
        dateStr = '';
        for (let j = 0; j < count - 1; j++)
          dateStr += String.fromCharCode(view.getUint8(tiffStart + valOff + j));
      }
    }

    if (!gpsIFDOffset) return { lat: null, lon: null, date: dateStr };
    const gBase = tiffStart + gpsIFDOffset;
    const gCount = view.getUint16(gBase, little);
    let latRef='', lonRef='', lat=null, lon=null;
    for (let i = 0; i < gCount; i++) {
      const e = gBase + 2 + i * 12;
      const tag = view.getUint16(e, little);
      const valOff = view.getUint32(e + 8, little);
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
      if (tag === 3) lonRef = String.fromCharCode(view.getUint8(e + 8));
      if (tag === 2) lat = readRational3(view, tiffStart + valOff, little);
      if (tag === 4) lon = readRational3(view, tiffStart + valOff, little);
    }
    if (lat !== null) lat = dms2dd(lat, latRef);
    if (lon !== null) lon = dms2dd(lon, lonRef);
    return { lat, lon, date: dateStr };
  } catch { return { lat: null, lon: null, date: null }; }
}

function readRational3(view, off, little) {
  const r = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(off + i * 8, little);
    const den = view.getUint32(off + i * 8 + 4, little);
    r.push(den ? num / den : 0);
  }
  return r;
}
function dms2dd([d, m, s], ref) {
  let dd = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

// ── Redimensionnement / compression ─────────────
function resizeImage(file, maxW, maxH, quality = 0.85) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (maxW && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (maxH && h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(type, quality));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function compressTo500k(file) {
  const MAX = 500 * 1024; // 500 ko
  if (file.size <= MAX) {
    // Déjà assez petit — on lit quand même comme dataURL
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = e => resolve({ dataUrl: e.target.result, size: file.size });
      r.readAsDataURL(file);
    });
  }
  // Comprimer progressivement
  const img = await loadImage(file);
  let quality = 0.9;
  let dataUrl, size;
  const type = 'image/jpeg';
  do {
    const canvas = document.createElement('canvas');
    let w = img.width, h = img.height;
    // Si très grande image, réduire dimensions aussi
    const scale = Math.min(1, Math.sqrt(MAX / file.size) * 1.5);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    dataUrl = canvas.toDataURL(type, quality);
    size = Math.round(dataUrl.length * 0.75); // approx octets
    quality -= 0.07;
  } while (size > MAX && quality > 0.1);
  return { dataUrl, size };
}

function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ko';
  return (bytes / 1024 / 1024).toFixed(2) + ' Mo';
}

// ── Rendu liste step 1 ───────────────────────────
function renderRawList() {
  rawList.innerHTML = '';
  rawList.classList.toggle('hidden', state.rawWaypoints.length === 0);
  step1Actions.classList.toggle('hidden', state.rawWaypoints.length === 0);

  state.rawWaypoints.forEach((wpt, idx) => {
    const card = document.createElement('div');
    card.className = 'wpt-card';
    card.innerHTML = `
      <img class="wpt-thumb" src="${wpt.thumb}" alt="${wpt.filename}" />
      <div class="wpt-info">
        <div class="wpt-filename">📷 ${wpt.filename}</div>
        <div class="wpt-name">${escHtml(wpt.name)}</div>
        <div class="wpt-comment">${wpt.comment}</div>
        ${wpt.exifLat !== null ? `<div class="wpt-exif">📍 ${wpt.exifLat.toFixed(6)}, ${wpt.exifLon.toFixed(6)}</div>` : ''}
        ${wpt.exifDate ? `<div class="wpt-exif">📅 ${wpt.exifDate}</div>` : ''}
        <div class="wpt-size">Compressé : ${formatSize(wpt.compressedSize)}</div>
      </div>
      <div class="wpt-actions">
        <button class="btn-icon" data-edit="${idx}">✏️ Éditer</button>
        <button class="btn-icon danger" data-del="${idx}">🗑 Supprimer</button>
      </div>
    `;
    rawList.appendChild(card);
  });

  rawList.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openEdit(parseInt(btn.dataset.edit))));
  rawList.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => deleteWpt(parseInt(btn.dataset.del))));
}

function deleteWpt(idx) {
  state.rawWaypoints.splice(idx, 1);
  renderRawList();
}

// ── Modal édition ────────────────────────────────
const editModal  = document.getElementById('editModal');
const modalThumb = document.getElementById('modalThumb');
const wptName    = document.getElementById('wptName');
const wptComment = document.getElementById('wptComment');
const nameCount  = document.getElementById('nameCount');
const commentCount = document.getElementById('commentCount');

function openEdit(idx) {
  state.editIdx = idx;
  const wpt = state.rawWaypoints[idx];
  modalThumb.src = wpt.thumb;
  wptName.value = wpt.name;
  wptComment.value = wpt.comment;
  updateCounts();
  editModal.classList.remove('hidden');
}

function updateCounts() {
  nameCount.textContent = `${wptName.value.length}/100`;
  commentCount.textContent = `${wptComment.value.length}/500`;
}
wptName.addEventListener('input', updateCounts);
wptComment.addEventListener('input', updateCounts);

document.getElementById('cancelEdit').addEventListener('click', () => {
  editModal.classList.add('hidden');
  state.editIdx = null;
});
document.getElementById('confirmEdit').addEventListener('click', () => {
  if (state.editIdx === null) return;
  state.rawWaypoints[state.editIdx].name = wptName.value.trim();
  state.rawWaypoints[state.editIdx].comment = wptComment.value.trim();
  editModal.classList.add('hidden');
  state.editIdx = null;
  renderRawList();
});

// ── Effacer tout ─────────────────────────────────
document.getElementById('clearRaw').addEventListener('click', () => {
  state.rawWaypoints = [];
  renderRawList();
  showToast('Liste effacée.');
});

// ── Sauvegarder _raw ─────────────────────────────
document.getElementById('saveRaw').addEventListener('click', () => {
  if (!state.rawWaypoints.length) return;
  const name = (state.rawWaypoints[0].originalName || 'waypoints') + '_raw';
  const data = {
    version: '1.0',
    created: new Date().toISOString(),
    waypoints: state.rawWaypoints.map(w => ({
      id:              w.id,
      filename:        w.filename,
      name:            w.name,
      comment:         w.comment,
      thumb:           w.thumb,
      compressedImage: w.compressedDataUrl,
      compressedSize:  w.compressedSize,
      exifLat:         w.exifLat,
      exifLon:         w.exifLon,
      exifDate:        w.exifDate,
    })),
  };
  downloadJSON(data, name + '.json');
  showToast(`💾 Fichier "${name}.json" sauvegardé.`);
});

// ══════════════════════════════════════════════
// ÉTAPE 2 — Géolocalisation
// ══════════════════════════════════════════════

function initMap() {
  state.map = L.map('map').setView([46.5, 2.5], 6);
  setTileLayer('osm');

  state.map.on('click', onMapClick);
}

function setTileLayer(type) {
  if (state.tileLayer) state.map.removeLayer(state.tileLayer);
  if (type === 'ign') {
    state.tileLayer = L.tileLayer(
      'https://wxs.ign.fr/cartes/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&STYLE=normal&FORMAT=image/png',
      { attribution: '© IGN', maxZoom: 18 }
    ).addTo(state.map);
  } else {
    state.tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', maxZoom: 19 }
    ).addTo(state.map);
  }
}

document.getElementById('layerSelect').addEventListener('change', e => {
  if (state.map) setTileLayer(e.target.value);
});

// Charger fichier _raw
document.getElementById('rawFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const txt = await file.text();
    const data = JSON.parse(txt);
    state.geoWaypoints = data.waypoints.map(w => ({ ...w, lat: w.exifLat, lon: w.exifLon }));
    renderGeoList();
    // Placer les markers EXIF existants
    state.geoWaypoints.forEach((w, i) => {
      if (w.lat !== null && w.lon !== null) addMapMarker(i, w.lat, w.lon);
    });
    document.getElementById('saveLocBtn').disabled = false;
    showToast(`📂 ${data.waypoints.length} waypoints chargés.`);
  } catch { showToast('Erreur lecture fichier _raw.', 'error'); }
});

// Charger tracé GPX / KML / KMZ
document.getElementById('traceInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!state.map) initMap();
  const ext = file.name.split('.').pop().toLowerCase();
  if (state.traceLayer) { state.map.removeLayer(state.traceLayer); state.traceLayer = null; }

  if (ext === 'gpx') {
    const text = await file.text();
    const blob = new Blob([text], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    state.traceLayer = new L.GPX(url, {
      async: true,
      marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
      polyline_options: { color: '#5db87a', weight: 3 }
    }).on('loaded', ev => state.map.fitBounds(ev.target.getBounds())).addTo(state.map);
    showToast('Tracé GPX chargé.');
  } else if (ext === 'kml' || ext === 'kmz') {
    // Lire KML/KMZ et parser manuellement
    let kmlText;
    if (ext === 'kmz') {
      showToast('KMZ : extraction non supportée directement. Utilisez un GPX ou KML.', 'error');
      return;
    } else {
      kmlText = await file.text();
    }
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const coords = parseKMLCoords(kmlDoc);
    if (coords.length) {
      const latlngs = coords.map(c => [c.lat, c.lon]);
      state.traceLayer = L.polyline(latlngs, { color: '#5db87a', weight: 3 }).addTo(state.map);
      state.map.fitBounds(state.traceLayer.getBounds());
      showToast('Tracé KML chargé.');
    }
  }
});

function parseKMLCoords(doc) {
  const out = [];
  doc.querySelectorAll('coordinates').forEach(el => {
    el.textContent.trim().split(/\s+/).forEach(part => {
      const [lon, lat] = part.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) out.push({ lat, lon });
    });
  });
  return out;
}

// Clic carte → poser waypoint sélectionné
function onMapClick(e) {
  const idx = state.selectedGeoIdx;
  if (idx === null) { showToast('Sélectionnez un waypoint dans la liste B d\'abord.', 'error'); return; }
  const { lat, lng } = e.latlng;
  state.geoWaypoints[idx].lat = lat;
  state.geoWaypoints[idx].lon = lng;
  addMapMarker(idx, lat, lng);
  renderGeoList();
  showToast(`📍 Waypoint "${state.geoWaypoints[idx].name || idx}" placé.`);
}

// Icône personnalisée
function makeIcon(idx) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#5db87a;color:#0f1f15;border-radius:50% 50% 50% 0;
      width:24px;height:24px;transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.5);
    "><span style="transform:rotate(45deg)">${idx + 1}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

function addMapMarker(idx, lat, lon) {
  if (state.markers[idx]) state.map.removeLayer(state.markers[idx]);
  const wpt = state.geoWaypoints[idx];
  const marker = L.marker([lat, lon], { icon: makeIcon(idx) })
    .bindPopup(`<b>${escHtml(wpt.name) || '(sans nom)'}</b><br/>${lat.toFixed(6)}, ${lon.toFixed(6)}`)
    .addTo(state.map);
  state.markers[idx] = marker;
}

// ── Rendu liste Fenêtre B ────────────────────────
function renderGeoList() {
  const el = document.getElementById('rawListGeo');
  el.innerHTML = '';
  if (!state.geoWaypoints.length) {
    el.innerHTML = '<p class="empty-hint">Chargez un fichier _raw pour voir les waypoints</p>';
    return;
  }
  state.geoWaypoints.forEach((wpt, idx) => {
    const card = document.createElement('div');
    card.className = 'wpt-geo-card' +
      (state.selectedGeoIdx === idx ? ' selected' : '') +
      (wpt.lat !== null ? ' located' : '');
    card.innerHTML = `
      <img class="wpt-geo-thumb" src="${wpt.thumb}" alt="${wpt.filename}" />
      <div class="wpt-geo-info">
        <div class="wpt-geo-name">${idx + 1}. ${escHtml(wpt.name) || wpt.filename}</div>
        <div class="wpt-geo-coords">
          ${wpt.lat !== null ? `📍 ${wpt.lat.toFixed(5)}, ${wpt.lon.toFixed(5)}` : '<span style="color:#8aad96">Non géolocalisé</span>'}
        </div>
      </div>
      <span class="wpt-geo-badge">✔ Localisé</span>
    `;
    card.addEventListener('click', () => {
      state.selectedGeoIdx = idx;
      renderGeoList();
      // Centrer sur marqueur si existant
      if (state.markers[idx]) state.map.panTo(state.markers[idx].getLatLng());
      showToast(`Waypoint #${idx + 1} sélectionné. Cliquez sur la carte pour le placer.`);
    });
    el.appendChild(card);
  });
}

// ── Sauvegarder _loc ─────────────────────────────
document.getElementById('saveLocBtn').addEventListener('click', () => {
  if (!state.geoWaypoints.length) return;
  const name = (state.geoWaypoints[0].filename.replace(/\.[^.]+$/, '') || 'waypoints') + '_loc';
  const data = {
    version: '1.0',
    created: new Date().toISOString(),
    waypoints: state.geoWaypoints.map(w => ({
      id:              w.id,
      filename:        w.filename,
      name:            w.name,
      comment:         w.comment,
      thumb:           w.thumb,
      compressedImage: w.compressedImage,
      compressedSize:  w.compressedSize,
      lat:             w.lat,
      lon:             w.lon,
      exifDate:        w.exifDate,
    })),
  };
  downloadJSON(data, name + '.json');
  showToast(`💾 Fichier "${name}.json" sauvegardé.`);
});

// ══════════════════════════════════════════════
// Utilitaires
// ══════════════════════════════════════════════

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ── Service Worker ───────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
