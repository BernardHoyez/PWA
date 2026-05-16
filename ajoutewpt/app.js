/* ═══════════════════════════════════════════════
   AjouteWPT — app.js  v2
   Corrections :
   1) Images exportées en fichiers JPEG séparés (ZIP)
   2) Nom _raw basé sur le nom du dossier photos
   3) IGN via data.geopf.fr (Géoplateforme publique)
   4) Tracé GPX/KML/KMZ correct sur la carte
═══════════════════════════════════════════════ */

'use strict';

// ── État global ─────────────────────────────────
const state = {
  rawWaypoints: [],      // [{id, filename, thumb, compressedBlob, compressedSize, name, comment, exifLat, exifLon, exifDate}]
  folderName: 'waypoints',
  geoWaypoints: [],
  selectedGeoIdx: null,
  editIdx: null,
  map: null,
  tileLayer: null,
  markers: {},
  traceLayer: null,
};

// ── Onglets ─────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'step2' && !state.map) initMap();
  });
});

// ══════════════════════════════════════════════
// ÉTAPE 1 — Waypoints bruts
// ══════════════════════════════════════════════

const folderInput  = document.getElementById('folderInput');
const dropZone     = document.getElementById('dropZone');
const rawList      = document.getElementById('rawList');
const step1Actions = document.getElementById('step1Actions');

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

  // Fix #2 : détecter le nom du dossier via webkitRelativePath
  const firstPath = imgs[0].webkitRelativePath || '';
  state.folderName = firstPath.includes('/')
    ? firstPath.split('/')[0]
    : 'photos';

  showToast(`Traitement de ${imgs.length} image(s) depuis « ${state.folderName} »…`);
  state.rawWaypoints = [];

  for (const file of imgs) {
    const wpt = await buildRawWaypoint(file);
    state.rawWaypoints.push(wpt);
    renderRawList(); // affichage progressif
  }
  showToast(`✔ ${imgs.length} waypoint(s) créés depuis « ${state.folderName} ».`);
}

async function buildRawWaypoint(file) {
  const id   = crypto.randomUUID();
  const exif = await readExif(file);
  const thumb = await resizeToDataURL(file, 100, null, 0.82);
  const { blob, size } = await compressTo500kBlob(file);

  return {
    id,
    filename:      file.name,
    imageFilename: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    thumb,
    compressedBlob: blob,
    compressedSize: size,
    name: '',
    comment: '',
    exifLat:  exif.lat,
    exifLon:  exif.lon,
    exifDate: exif.date,
  };
}

// ── EXIF GPS ─────────────────────────────────────
function readExif(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => {
      try { resolve(parseExifGPS(new DataView(e.target.result))); }
      catch { resolve({ lat: null, lon: null, date: null }); }
    };
    r.readAsArrayBuffer(file);
  });
}

function parseExifGPS(view) {
  try {
    if (view.getUint16(0) !== 0xFFD8) return { lat: null, lon: null, date: null };
    let off = 2;
    while (off < view.byteLength) {
      const marker = view.getUint16(off);
      if (marker === 0xFFE1) {
        const segLen = view.getUint16(off + 2);
        const hdr = String.fromCharCode(...new Uint8Array(view.buffer, off + 4, 6));
        if (hdr.startsWith('Exif')) return parseIFD(view, off + 10);
        off += 2 + segLen;
      } else if ((marker & 0xFF00) === 0xFF00) {
        off += 2 + view.getUint16(off + 2);
      } else break;
    }
  } catch {}
  return { lat: null, lon: null, date: null };
}

function parseIFD(view, ts) {
  try {
    const le = view.getUint16(ts) === 0x4949;
    const ifo = view.getUint32(ts + 4, le);
    const n   = view.getUint16(ts + ifo, le);
    let gpsOff = null, dateStr = null;
    for (let i = 0; i < n; i++) {
      const e = ts + ifo + 2 + i * 12;
      const tag = view.getUint16(e, le);
      if (tag === 0x8825) gpsOff = view.getUint32(e + 8, le);
      if (tag === 0x9003) {
        const cnt = view.getUint32(e + 4, le);
        const vo  = view.getUint32(e + 8, le);
        dateStr = '';
        for (let j = 0; j < cnt - 1; j++)
          dateStr += String.fromCharCode(view.getUint8(ts + vo + j));
      }
    }
    if (!gpsOff) return { lat: null, lon: null, date: dateStr };
    const gb = ts + gpsOff;
    const gc = view.getUint16(gb, le);
    let latRef = '', lonRef = '', lat = null, lon = null;
    for (let i = 0; i < gc; i++) {
      const e = gb + 2 + i * 12;
      const tag = view.getUint16(e, le);
      const vo  = view.getUint32(e + 8, le);
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
      if (tag === 3) lonRef = String.fromCharCode(view.getUint8(e + 8));
      if (tag === 2) lat = readRat3(view, ts + vo, le);
      if (tag === 4) lon = readRat3(view, ts + vo, le);
    }
    if (lat) lat = dms2dd(lat, latRef);
    if (lon) lon = dms2dd(lon, lonRef);
    return { lat, lon, date: dateStr };
  } catch { return { lat: null, lon: null, date: null }; }
}

function readRat3(view, off, le) {
  return Array.from({ length: 3 }, (_, i) => {
    const n = view.getUint32(off + i * 8, le);
    const d = view.getUint32(off + i * 8 + 4, le);
    return d ? n / d : 0;
  });
}
function dms2dd([d, m, s], ref) {
  const dd = d + m / 60 + s / 3600;
  return (ref === 'S' || ref === 'W') ? -dd : dd;
}

// ── Compression ───────────────────────────────────
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

async function resizeToDataURL(file, maxW, maxH, quality) {
  const img = await loadImageFromFile(file);
  let w = img.width, h = img.height;
  if (maxW && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  if (maxH && h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}

// Fix #1 : retourne un Blob JPEG (pas un dataURL) ≤ 500 ko
async function compressTo500kBlob(file) {
  const MAX = 500 * 1024;

  // JPEG déjà assez petit → retourner tel quel
  if (file.size <= MAX && file.type === 'image/jpeg') {
    return { blob: file, size: file.size };
  }

  const img = await loadImageFromFile(file);
  let w = img.width, h = img.height;

  // Réduire dimensions si très lourd
  if (file.size > MAX) {
    const scale = Math.min(1, Math.sqrt((MAX * 0.85) / file.size) * 1.8);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  let blob, size, quality = 0.88;
  for (let attempt = 0; attempt < 12; attempt++) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    blob = await new Promise(res => c.toBlob(res, 'image/jpeg', quality));
    size = blob.size;
    if (size <= MAX) break;
    quality = Math.max(0.1, quality - 0.07);
    if (quality <= 0.25) { w = Math.round(w * 0.8); h = Math.round(h * 0.8); quality = 0.72; }
  }
  return { blob, size };
}

function formatSize(b) {
  if (b < 1024) return b + ' o';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' ko';
  return (b / 1024 / 1024).toFixed(2) + ' Mo';
}

// ── Rendu liste step 1 ───────────────────────────
function renderRawList() {
  rawList.innerHTML = '';
  rawList.classList.toggle('hidden', !state.rawWaypoints.length);
  step1Actions.classList.toggle('hidden', !state.rawWaypoints.length);

  state.rawWaypoints.forEach((wpt, idx) => {
    const card = document.createElement('div');
    card.className = 'wpt-card';
    card.innerHTML = `
      <img class="wpt-thumb" src="${wpt.thumb}" alt="${wpt.filename}" />
      <div class="wpt-info">
        <div class="wpt-filename">📷 ${wpt.filename}</div>
        <div class="wpt-name">${escHtml(wpt.name)}</div>
        <div class="wpt-comment">${wpt.comment || ''}</div>
        ${wpt.exifLat !== null ? `<div class="wpt-exif">📍 ${wpt.exifLat.toFixed(6)}, ${wpt.exifLon.toFixed(6)}</div>` : ''}
        ${wpt.exifDate ? `<div class="wpt-exif">📅 ${wpt.exifDate}</div>` : ''}
        <div class="wpt-size">Image JPEG : ${formatSize(wpt.compressedSize)}</div>
      </div>
      <div class="wpt-actions">
        <button class="btn-icon" data-edit="${idx}">✏️ Éditer</button>
        <button class="btn-icon danger" data-del="${idx}">🗑 Supprimer</button>
      </div>
    `;
    rawList.appendChild(card);
  });

  rawList.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openEdit(+btn.dataset.edit)));
  rawList.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => { state.rawWaypoints.splice(+btn.dataset.del, 1); renderRawList(); }));
}

// ── Modal édition ────────────────────────────────
const editModal    = document.getElementById('editModal');
const modalThumb   = document.getElementById('modalThumb');
const wptName      = document.getElementById('wptName');
const wptComment   = document.getElementById('wptComment');
const nameCount    = document.getElementById('nameCount');
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
  nameCount.textContent    = `${wptName.value.length}/100`;
  commentCount.textContent = `${wptComment.value.length}/500`;
}
wptName.addEventListener('input', updateCounts);
wptComment.addEventListener('input', updateCounts);

document.getElementById('cancelEdit').addEventListener('click', () => {
  editModal.classList.add('hidden'); state.editIdx = null;
});
document.getElementById('confirmEdit').addEventListener('click', () => {
  if (state.editIdx === null) return;
  state.rawWaypoints[state.editIdx].name    = wptName.value.trim();
  state.rawWaypoints[state.editIdx].comment = wptComment.value.trim();
  editModal.classList.add('hidden'); state.editIdx = null;
  renderRawList();
});

document.getElementById('clearRaw').addEventListener('click', () => {
  state.rawWaypoints = []; state.folderName = 'waypoints';
  renderRawList(); showToast('Liste effacée.');
});

// ── Sauvegarder _raw → ZIP (fix #1 + #2) ─────────
document.getElementById('saveRaw').addEventListener('click', async () => {
  if (!state.rawWaypoints.length) return;
  showToast('Création du ZIP…');

  const baseName = state.folderName + '_raw';   // Fix #2
  const zip = new JSZip();
  const imgFolder = zip.folder('images');

  const waypointsJson = state.rawWaypoints.map(w => ({
    id:            w.id,
    filename:      w.filename,
    imageFile:     'images/' + w.imageFilename,  // chemin relatif dans ZIP
    name:          w.name,
    comment:       w.comment,
    thumb:         w.thumb,                       // vignette 100px en dataURL (légère)
    compressedSize: w.compressedSize,
    exifLat:       w.exifLat,
    exifLon:       w.exifLon,
    exifDate:      w.exifDate,
  }));

  zip.file(baseName + '.json', JSON.stringify({
    version: '2.0', created: new Date().toISOString(),
    folderName: state.folderName, waypoints: waypointsJson,
  }, null, 2));

  // Fix #1 : images séparées en JPEG dans le sous-dossier
  for (const wpt of state.rawWaypoints) {
    imgFolder.file(wpt.imageFilename, wpt.compressedBlob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(zipBlob, baseName + '.zip');
  showToast(`💾 "${baseName}.zip" — JSON + ${state.rawWaypoints.length} images JPEG`);
});

// ══════════════════════════════════════════════
// ÉTAPE 2 — Géolocalisation
// ══════════════════════════════════════════════

function initMap() {
  state.map = L.map('map').setView([46.5, 2.5], 6);
  setTileLayer('osm');
  state.map.on('click', onMapClick);
}

// Fix #3 : URL Géoplateforme publique (data.geopf.fr, sans clé API)
function setTileLayer(type) {
  if (state.tileLayer) { state.map.removeLayer(state.tileLayer); state.tileLayer = null; }
  if (type === 'ign') {
    state.tileLayer = L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png' +
      '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      { attribution: '© <a href="https://www.ign.fr">IGN</a> – Plan V2', maxNativeZoom: 19, maxZoom: 21 }
    ).addTo(state.map);
  } else if (type === 'ign-topo') {
    state.tileLayer = L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&FORMAT=image/jpeg' +
      '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      { attribution: '© <a href="https://www.ign.fr">IGN</a> – Carte topo', maxNativeZoom: 18, maxZoom: 21 }
    ).addTo(state.map);
  } else {
    state.tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 19 }
    ).addTo(state.map);
  }
}

document.getElementById('layerSelect').addEventListener('change', e => {
  if (state.map) setTileLayer(e.target.value);
});

// ── Charger fichier _raw (ZIP ou JSON) ───────────
document.getElementById('rawFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    let data;
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const jsonFiles = Object.keys(zip.files).filter(n => n.endsWith('.json') && !zip.files[n].dir);
      if (!jsonFiles.length) { showToast('Aucun JSON dans le ZIP.', 'error'); return; }
      data = JSON.parse(await zip.files[jsonFiles[0]].async('string'));
      // Charger les blobs images
      for (const wpt of data.waypoints) {
        if (wpt.imageFile && zip.files[wpt.imageFile]) {
          const blob = await zip.files[wpt.imageFile].async('blob');
          wpt._imgBlob = blob;
          wpt._imgURL  = URL.createObjectURL(blob);
        }
      }
    } else {
      data = JSON.parse(await file.text());
    }

    state.geoWaypoints = data.waypoints.map(w => ({
      ...w,
      lat: w.lat ?? w.exifLat ?? null,
      lon: w.lon ?? w.exifLon ?? null,
    }));
    renderGeoList();
    state.geoWaypoints.forEach((w, i) => {
      if (w.lat !== null && w.lon !== null) addMapMarker(i, w.lat, w.lon);
    });
    document.getElementById('saveLocBtn').disabled = false;
    showToast(`📂 ${state.geoWaypoints.length} waypoints chargés.`);
  } catch(err) {
    console.error(err);
    showToast('Erreur lecture fichier _raw.', 'error');
  }
});

// ── Charger tracé (fix #4 : parser XML natif) ────
document.getElementById('traceInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!state.map) initMap();
  clearTraceLayer();
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'gpx')      await loadGPX(file);
  else if (ext === 'kml') await loadKML(file);
  else if (ext === 'kmz') await loadKMZ(file);
  else showToast('Format non reconnu (GPX, KML ou KMZ attendu).', 'error');
});

function clearTraceLayer() {
  if (!state.traceLayer) return;
  const layers = Array.isArray(state.traceLayer) ? state.traceLayer : [state.traceLayer];
  layers.forEach(l => state.map.removeLayer(l));
  state.traceLayer = null;
}

// GPX : trkpt (traces) + rtept (routes)
async function loadGPX(file) {
  const text = await file.text();
  const doc  = new DOMParser().parseFromString(text, 'application/xml');
  const layers = [];

  // Segments de trace
  doc.querySelectorAll('trk trkseg').forEach(seg => {
    const pts = Array.from(seg.querySelectorAll('trkpt'))
      .map(p => [parseFloat(p.getAttribute('lat')), parseFloat(p.getAttribute('lon'))])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1)
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
  });

  // Routes
  doc.querySelectorAll('rte').forEach(rte => {
    const pts = Array.from(rte.querySelectorAll('rtept'))
      .map(p => [parseFloat(p.getAttribute('lat')), parseFloat(p.getAttribute('lon'))])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1)
      layers.push(L.polyline(pts, { color: '#e8a838', weight: 3, opacity: 0.9 }).addTo(state.map));
  });

  state.traceLayer = layers;
  if (layers.length) {
    state.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [30, 30] });
    showToast(`Tracé GPX chargé — ${layers.length} segment(s).`);
  } else {
    showToast('Aucune trace/route trouvée dans ce fichier GPX.', 'error');
  }
}

// KML : LineString + gx:Track
async function loadKML(file) {
  parseAndDrawKML(await file.text());
}

function parseAndDrawKML(kmlText) {
  const doc = new DOMParser().parseFromString(kmlText, 'application/xml');
  const layers = [];

  // LineString standard
  doc.querySelectorAll('LineString').forEach(ls => {
    const coordsEl = ls.querySelector('coordinates');
    if (!coordsEl) return;
    const pts = kmlCoordsToLatLng(coordsEl.textContent);
    if (pts.length > 1)
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
  });

  // gx:Track (Google Earth extensions)
  doc.querySelectorAll('Track').forEach(track => {
    const pts = Array.from(track.querySelectorAll('coord'))
      .map(c => { const p = c.textContent.trim().split(/\s+/).map(Number); return [p[1], p[0]]; })
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1)
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
  });

  state.traceLayer = layers;
  if (layers.length) {
    state.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [30, 30] });
    showToast(`Tracé KML chargé — ${layers.length} ligne(s).`);
  } else {
    showToast('Aucune ligne trouvée dans ce KML.', 'error');
  }
}

function kmlCoordsToLatLng(text) {
  return text.trim().split(/\s+/).map(part => {
    const [lon, lat] = part.split(',').map(Number);
    return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  }).filter(Boolean);
}

// KMZ = ZIP contenant un KML
async function loadKMZ(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const kmlKeys = Object.keys(zip.files).filter(n => n.toLowerCase().endsWith('.kml'));
    if (!kmlKeys.length) { showToast('Aucun KML dans le KMZ.', 'error'); return; }
    // Priorité à doc.kml
    const key = kmlKeys.find(n => n.toLowerCase() === 'doc.kml') || kmlKeys[0];
    parseAndDrawKML(await zip.files[key].async('string'));
  } catch (err) {
    console.error(err);
    showToast('Erreur lecture KMZ.', 'error');
  }
}

// ── Clic carte → placer waypoint sélectionné ─────
function onMapClick(e) {
  const idx = state.selectedGeoIdx;
  if (idx === null) { showToast('Sélectionnez un waypoint dans la liste B.', 'error'); return; }
  const { lat, lng } = e.latlng;
  state.geoWaypoints[idx].lat = lat;
  state.geoWaypoints[idx].lon = lng;
  addMapMarker(idx, lat, lng);
  renderGeoList();
  showToast(`📍 Waypoint #${idx + 1} placé à ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

function makeIcon(idx) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#5db87a;color:#0f1f15;border-radius:50% 50% 50% 0;
      width:26px;height:26px;transform:rotate(-45deg);display:flex;align-items:center;
      justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.6)">
      <span style="transform:rotate(45deg)">${idx + 1}</span></div>`,
    iconSize: [26, 26], iconAnchor: [13, 26],
  });
}

function addMapMarker(idx, lat, lon) {
  if (state.markers[idx]) state.map.removeLayer(state.markers[idx]);
  const wpt   = state.geoWaypoints[idx];
  const thumb = wpt._imgURL || wpt.thumb || '';
  state.markers[idx] = L.marker([lat, lon], { icon: makeIcon(idx) })
    .bindPopup(`<div style="text-align:center">
      ${thumb ? `<img src="${thumb}" style="width:80px;border-radius:3px;margin-bottom:4px"/>` : ''}
      <b>${escHtml(wpt.name) || '(sans nom)'}</b><br/>
      <small>${lat.toFixed(6)}, ${lon.toFixed(6)}</small></div>`)
    .addTo(state.map);
}

// ── Rendu liste Fenêtre B ────────────────────────
function renderGeoList() {
  const el = document.getElementById('rawListGeo');
  el.innerHTML = '';
  if (!state.geoWaypoints.length) {
    el.innerHTML = '<p class="empty-hint">Chargez un fichier _raw (.zip ou .json)</p>';
    return;
  }
  state.geoWaypoints.forEach((wpt, idx) => {
    const card = document.createElement('div');
    card.className = 'wpt-geo-card' +
      (state.selectedGeoIdx === idx ? ' selected' : '') +
      (wpt.lat !== null ? ' located' : '');
    const src = wpt._imgURL || wpt.thumb || '';
    card.innerHTML = `
      <img class="wpt-geo-thumb" src="${src}" alt="${wpt.filename}" />
      <div class="wpt-geo-info">
        <div class="wpt-geo-name">${idx + 1}. ${escHtml(wpt.name) || wpt.filename}</div>
        <div class="wpt-geo-coords">
          ${wpt.lat !== null
            ? `📍 ${wpt.lat.toFixed(5)}, ${wpt.lon.toFixed(5)}`
            : '<span style="color:#8aad96">Non géolocalisé — cliquez sur la carte</span>'}
        </div>
      </div>
      <span class="wpt-geo-badge">✔</span>
    `;
    card.addEventListener('click', () => {
      state.selectedGeoIdx = idx;
      renderGeoList();
      if (state.markers[idx]) state.map.panTo(state.markers[idx].getLatLng());
      showToast(`Waypoint #${idx + 1} sélectionné — cliquez sur la carte pour le placer.`);
    });
    el.appendChild(card);
  });
}

// ── Sauvegarder _loc → ZIP ───────────────────────
document.getElementById('saveLocBtn').addEventListener('click', async () => {
  if (!state.geoWaypoints.length) return;
  showToast('Création du ZIP _loc…');

  const srcFolder = state.geoWaypoints[0].folderName || state.folderName || 'photos';
  const baseName  = srcFolder + '_loc';
  const zip       = new JSZip();
  const imgFolder = zip.folder('images');

  const waypointsJson = [];
  for (const wpt of state.geoWaypoints) {
    const imgName = wpt.imageFilename || wpt.filename.replace(/\.[^.]+$/, '') + '.jpg';
    if (wpt._imgBlob) imgFolder.file(imgName, wpt._imgBlob);
    waypointsJson.push({
      id:            wpt.id,
      filename:      wpt.filename,
      imageFile:     'images/' + imgName,
      name:          wpt.name,
      comment:       wpt.comment,
      thumb:         wpt.thumb,
      compressedSize: wpt.compressedSize,
      lat:           wpt.lat,
      lon:           wpt.lon,
      exifDate:      wpt.exifDate,
    });
  }

  zip.file(baseName + '.json', JSON.stringify({
    version: '2.0', created: new Date().toISOString(), waypoints: waypointsJson,
  }, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(zipBlob, baseName + '.zip');
  showToast(`💾 "${baseName}.zip" sauvegardé.`);
});

// ══════════════════════════════════════════════
// Utilitaires
// ══════════════════════════════════════════════

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4500);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
