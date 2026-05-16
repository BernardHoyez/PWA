/* ═══════════════════════════════════════════════
   AjouteWPT — app.js  v3
   Corrections v3 :
   1) Sélection dossier fiable (pas de double-clic)
   2) Export _loc en .kmz (Google Earth natif)
   3) Clic vignette → lightbox image + commentaire
═══════════════════════════════════════════════ */

'use strict';

// ── État global ──────────────────────────────────
const state = {
  rawWaypoints:   [],
  folderName:     'waypoints',
  geoWaypoints:   [],
  selectedGeoIdx: null,
  editIdx:        null,
  map:            null,
  tileLayer:      null,
  markers:        {},
  traceLayer:     null,
  traceCoords:    [],   // tableau de segments [[lat,lon],…] pour export KMZ
  traceName:      '',   // nom du fichier source du tracé
};

// ══════════════════════════════════════════════════
// ONGLETS
// ══════════════════════════════════════════════════

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'step2' && !state.map) initMap();
  });
});

// ══════════════════════════════════════════════════
// ÉTAPE 1 — IMPORT DOSSIER
// Fix #1 : séparation nette entre dropZone drag/drop
// et le bouton "Choisir un dossier", pour éviter
// les doubles déclenchements.
// ══════════════════════════════════════════════════

const folderInput   = document.getElementById('folderInput');
const btnChoose     = document.getElementById('btnChooseFolder');
const dropZone      = document.getElementById('dropZone');
const rawList       = document.getElementById('rawList');
const step1Actions  = document.getElementById('step1Actions');

// Bouton "Choisir un dossier" → ouvre le sélecteur
btnChoose.addEventListener('click', e => {
  e.stopPropagation();          // ne pas buller vers dropZone
  folderInput.value = '';       // reset pour permettre re-sélection du même dossier
  folderInput.click();
});

// L'input lui-même déclenche le traitement
folderInput.addEventListener('change', () => {
  if (folderInput.files && folderInput.files.length > 0) {
    processFiles(folderInput.files);
  }
});

// Drag & drop sur la zone (pas sur le bouton)
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('over');
});
dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('over');
  processFiles(e.dataTransfer.files);
});

// Clic sur la zone (hors bouton) → ouvre aussi le sélecteur
dropZone.addEventListener('click', e => {
  if (e.target === btnChoose || btnChoose.contains(e.target)) return;
  folderInput.value = '';
  folderInput.click();
});

// ── Traitement des fichiers ──────────────────────

async function processFiles(files) {
  const imgs = Array.from(files).filter(f => /\.(jpe?g|png)$/i.test(f.name));
  if (!imgs.length) { showToast('Aucune image JPG/PNG trouvée dans le dossier.', 'error'); return; }

  // Détecter le nom du dossier via webkitRelativePath
  const firstPath = imgs[0].webkitRelativePath || '';
  state.folderName = firstPath.includes('/')
    ? firstPath.split('/')[0]
    : (imgs[0].name.replace(/\.[^.]+$/, '') || 'photos');

  state.rawWaypoints = [];
  showToast(`⏳ Traitement de ${imgs.length} image(s) depuis « ${state.folderName} »…`);

  for (let i = 0; i < imgs.length; i++) {
    const wpt = await buildRawWaypoint(imgs[i]);
    state.rawWaypoints.push(wpt);
    if ((i + 1) % 3 === 0 || i === imgs.length - 1) renderRawList(); // rafraîchissement par lots
  }
  showToast(`✔ ${imgs.length} waypoint(s) chargés depuis « ${state.folderName} ».`);
}

async function buildRawWaypoint(file) {
  const id   = crypto.randomUUID();
  const exif = await readExif(file);
  const thumb = await resizeToDataURL(file, 100, null, 0.82);
  const { blob, size } = await compressTo500kBlob(file);
  // Conserver un ObjectURL de l'image compressée pour la lightbox
  const compressedURL = URL.createObjectURL(blob);

  return {
    id,
    filename:      file.name,
    imageFilename: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    thumb,           // dataURL 100px pour UI
    compressedBlob:  blob,
    compressedURL,   // ObjectURL pour lightbox
    compressedSize:  size,
    name:            '',
    comment:         '',
    exifLat:  exif.lat,
    exifLon:  exif.lon,
    exifDate: exif.date,
  };
}

// ══════════════════════════════════════════════════
// EXIF GPS (parseur natif)
// ══════════════════════════════════════════════════

function readExif(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => {
      try { resolve(parseExifGPS(new DataView(e.target.result))); }
      catch { resolve({ lat: null, lon: null, date: null }); }
    };
    r.onerror = () => resolve({ lat: null, lon: null, date: null });
    r.readAsArrayBuffer(file);
  });
}

function parseExifGPS(view) {
  try {
    if (view.getUint16(0) !== 0xFFD8) return { lat: null, lon: null, date: null };
    let off = 2;
    while (off + 4 <= view.byteLength) {
      const marker = view.getUint16(off);
      if (marker === 0xFFE1) {
        const segLen = view.getUint16(off + 2);
        if (off + 10 <= view.byteLength) {
          const hdr = String.fromCharCode(...new Uint8Array(view.buffer, off + 4, 6));
          if (hdr.startsWith('Exif')) return parseIFD(view, off + 10);
        }
        off += 2 + segLen;
      } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFDA) {
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
      const e   = ts + ifo + 2 + i * 12;
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
      const e   = gb + 2 + i * 12;
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

// ══════════════════════════════════════════════════
// COMPRESSION IMAGE
// ══════════════════════════════════════════════════

function loadImg(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img load')); };
    img.src = url;
  });
}

async function resizeToDataURL(file, maxW, maxH, quality) {
  const img = await loadImg(file);
  let w = img.width, h = img.height;
  if (maxW && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  if (maxH && h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}

async function compressTo500kBlob(file) {
  const MAX = 500 * 1024;
  if (file.size <= MAX && file.type === 'image/jpeg') return { blob: file, size: file.size };

  const img = await loadImg(file);
  let w = img.width, h = img.height;

  if (file.size > MAX) {
    const scale = Math.min(1, Math.sqrt((MAX * 0.85) / file.size) * 1.8);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  let blob, size, quality = 0.88;
  for (let i = 0; i < 12; i++) {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    blob = await new Promise(res => c.toBlob(res, 'image/jpeg', quality));
    size = blob.size;
    if (size <= MAX) break;
    quality = Math.max(0.1, quality - 0.07);
    if (quality <= 0.25) { w = Math.round(w * 0.8); h = Math.round(h * 0.8); quality = 0.72; }
  }
  return { blob, size };
}

function fmtSize(b) {
  if (b < 1024) return b + ' o';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' ko';
  return (b / 1048576).toFixed(2) + ' Mo';
}

// ══════════════════════════════════════════════════
// RENDU LISTE ÉTAPE 1
// ══════════════════════════════════════════════════

function renderRawList() {
  rawList.innerHTML = '';
  const empty = !state.rawWaypoints.length;
  rawList.classList.toggle('hidden', empty);
  step1Actions.classList.toggle('hidden', empty);

  state.rawWaypoints.forEach((wpt, idx) => {
    const card = document.createElement('div');
    card.className = 'wpt-card';
    card.innerHTML = `
      <img class="wpt-thumb wpt-thumb-click" src="${wpt.thumb}"
           alt="${escHtml(wpt.filename)}" title="Cliquer pour agrandir"
           data-idx="${idx}" style="cursor:zoom-in" />
      <div class="wpt-info">
        <div class="wpt-filename">📷 ${escHtml(wpt.filename)}</div>
        <div class="wpt-name">${escHtml(wpt.name) || '<em style="color:var(--text-muted)">Sans nom</em>'}</div>
        <div class="wpt-comment">${wpt.comment || '<em style="color:var(--border)">Aucun commentaire</em>'}</div>
        ${wpt.exifLat !== null ? `<div class="wpt-exif">📍 ${wpt.exifLat.toFixed(6)}, ${wpt.exifLon.toFixed(6)}</div>` : ''}
        ${wpt.exifDate ? `<div class="wpt-exif">📅 ${wpt.exifDate}</div>` : ''}
        <div class="wpt-size">JPEG compressé : ${fmtSize(wpt.compressedSize)}</div>
      </div>
      <div class="wpt-actions">
        <button class="btn-icon" data-edit="${idx}">✏️ Éditer</button>
        <button class="btn-icon danger" data-del="${idx}">🗑</button>
      </div>
    `;
    rawList.appendChild(card);
  });

  // Clics édition / suppression
  rawList.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openEdit(+b.dataset.edit)));
  rawList.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => { state.rawWaypoints.splice(+b.dataset.del, 1); renderRawList(); }));

  // Fix #3 : clic sur vignette → lightbox
  rawList.querySelectorAll('.wpt-thumb-click').forEach(img =>
    img.addEventListener('click', () => openLightbox(state.rawWaypoints[+img.dataset.idx])));
}

// ══════════════════════════════════════════════════
// LIGHTBOX — Fix #3
// ══════════════════════════════════════════════════

const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose   = document.getElementById('lightboxClose');
const lightboxBackdrop = document.getElementById('lightboxBackdrop');

function openLightbox(wpt) {
  // Utiliser l'image compressée optimisée (pleine résolution utile)
  lightboxImg.src = wpt.compressedURL || wpt.thumb;
  lightboxImg.alt = wpt.name || wpt.filename;

  // Nom + commentaire HTML
  lightboxCaption.innerHTML = `
    <div class="lb-name">${escHtml(wpt.name) || escHtml(wpt.filename)}</div>
    ${wpt.comment
      ? `<div class="lb-comment">${wpt.comment}</div>`   // affiché en HTML (tel que saisi)
      : ''}
    ${wpt.exifDate ? `<div class="lb-date">📅 ${wpt.exifDate}</div>` : ''}
    ${wpt.exifLat !== null
      ? `<div class="lb-coords">📍 ${wpt.exifLat.toFixed(6)}, ${wpt.exifLon.toFixed(6)}</div>`
      : ''}
  `;
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  lightboxImg.src = '';
  document.body.style.overflow = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxBackdrop.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ══════════════════════════════════════════════════
// MODAL ÉDITION
// ══════════════════════════════════════════════════

const editModal    = document.getElementById('editModal');
const modalThumb   = document.getElementById('modalThumb');
const wptName      = document.getElementById('wptName');
const wptComment   = document.getElementById('wptComment');
const nameCount    = document.getElementById('nameCount');
const commentCount = document.getElementById('commentCount');

function openEdit(idx) {
  state.editIdx = idx;
  const wpt = state.rawWaypoints[idx];
  modalThumb.src    = wpt.thumb;
  wptName.value     = wpt.name;
  wptComment.value  = wpt.comment;
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
  state.rawWaypoints.forEach(w => { if (w.compressedURL) URL.revokeObjectURL(w.compressedURL); });
  state.rawWaypoints = [];
  state.folderName   = 'waypoints';
  renderRawList();
  showToast('Liste effacée.');
});

// ══════════════════════════════════════════════════
// SAUVEGARDE _raw → ZIP (JSON + images JPEG)
// ══════════════════════════════════════════════════

document.getElementById('saveRaw').addEventListener('click', async () => {
  if (!state.rawWaypoints.length) return;
  showToast('⏳ Création du ZIP _raw…');

  const baseName = state.folderName + '_raw';
  const zip = new JSZip();
  const imgFolder = zip.folder('images');

  const waypointsJson = state.rawWaypoints.map(w => ({
    id:             w.id,
    filename:       w.filename,
    imageFile:      'images/' + w.imageFilename,
    name:           w.name,
    comment:        w.comment,
    thumb:          w.thumb,           // vignette 100px en dataURL (légère)
    compressedSize: w.compressedSize,
    exifLat:        w.exifLat,
    exifLon:        w.exifLon,
    exifDate:       w.exifDate,
  }));

  zip.file(baseName + '.json', JSON.stringify({
    version: '2.0', created: new Date().toISOString(),
    folderName: state.folderName, waypoints: waypointsJson,
  }, null, 2));

  for (const w of state.rawWaypoints) imgFolder.file(w.imageFilename, w.compressedBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(zipBlob, baseName + '.zip');
  showToast(`💾 "${baseName}.zip" — ${state.rawWaypoints.length} waypoint(s) + images JPEG`);
});

// ══════════════════════════════════════════════════
// ÉTAPE 2 — CARTE LEAFLET
// ══════════════════════════════════════════════════

function initMap() {
  state.map = L.map('map').setView([46.5, 2.5], 6);
  setTileLayer('osm');
  state.map.on('click', onMapClick);
}

function setTileLayer(type) {
  if (state.tileLayer) { state.map.removeLayer(state.tileLayer); state.tileLayer = null; }
  if (type === 'ign') {
    state.tileLayer = L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png' +
      '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      { attribution: '© <a href="https://ign.fr">IGN</a> Plan V2', maxNativeZoom: 19, maxZoom: 21 }
    ).addTo(state.map);
  } else if (type === 'ign-topo') {
    state.tileLayer = L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&FORMAT=image/jpeg' +
      '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      { attribution: '© <a href="https://ign.fr">IGN</a> Topo', maxNativeZoom: 18, maxZoom: 21 }
    ).addTo(state.map);
  } else {
    state.tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom: 19 }
    ).addTo(state.map);
  }
}

document.getElementById('layerSelect').addEventListener('change', e => {
  if (state.map) setTileLayer(e.target.value);
});

// ── Chargement fichier _raw ──────────────────────

document.getElementById('rawFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    let data;
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const jsonKey = Object.keys(zip.files).find(n => n.endsWith('.json') && !zip.files[n].dir);
      if (!jsonKey) { showToast('Aucun JSON dans le ZIP.', 'error'); return; }
      data = JSON.parse(await zip.files[jsonKey].async('string'));
      for (const wpt of data.waypoints) {
        if (wpt.imageFile && zip.files[wpt.imageFile]) {
          wpt._imgBlob = await zip.files[wpt.imageFile].async('blob');
          wpt._imgURL  = URL.createObjectURL(wpt._imgBlob);
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
    showToast(`📂 ${state.geoWaypoints.length} waypoint(s) chargés.`);
  } catch(err) {
    console.error(err);
    showToast('Erreur lecture du fichier _raw.', 'error');
  }
});

// ── Chargement tracé GPX / KML / KMZ ────────────

document.getElementById('traceInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!state.map) initMap();
  clearTraceLayer();
  state.traceName = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop().toLowerCase();
  if      (ext === 'gpx') await loadGPX(file);
  else if (ext === 'kml') await loadKML(file);
  else if (ext === 'kmz') await loadKMZ(file);
  else showToast('Format non reconnu (GPX, KML, KMZ).', 'error');
});

function clearTraceLayer() {
  if (!state.traceLayer) return;
  (Array.isArray(state.traceLayer) ? state.traceLayer : [state.traceLayer])
    .forEach(l => state.map.removeLayer(l));
  state.traceLayer  = null;
  state.traceCoords = [];
  state.traceName   = '';
}

async function loadGPX(file) {
  const doc = new DOMParser().parseFromString(await file.text(), 'application/xml');
  const layers = [];
  const allSegs = [];   // pour export KMZ

  doc.querySelectorAll('trk trkseg').forEach(seg => {
    const pts = [...seg.querySelectorAll('trkpt')]
      .map(p => [+p.getAttribute('lat'), +p.getAttribute('lon')])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1) {
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
      allSegs.push(pts);
    }
  });
  doc.querySelectorAll('rte').forEach(rte => {
    const pts = [...rte.querySelectorAll('rtept')]
      .map(p => [+p.getAttribute('lat'), +p.getAttribute('lon')])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1) {
      layers.push(L.polyline(pts, { color: '#e8a838', weight: 3, opacity: 0.9 }).addTo(state.map));
      allSegs.push(pts);
    }
  });

  state.traceLayer  = layers;
  state.traceCoords = allSegs;   // mémoriser pour KMZ

  if (layers.length) {
    state.map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [30, 30] });
    showToast(`Tracé GPX chargé — ${layers.length} segment(s).`);
  } else {
    showToast('Aucune trace trouvée dans ce GPX.', 'error');
  }
}

async function loadKML(file) { parseAndDrawKML(await file.text()); }

function parseAndDrawKML(kmlText) {
  const doc = new DOMParser().parseFromString(kmlText, 'application/xml');
  const layers = [];
  const allSegs = [];   // pour export KMZ

  doc.querySelectorAll('LineString').forEach(ls => {
    const coordEl = ls.querySelector('coordinates');
    if (!coordEl) return;
    const pts = kmlCoordsToLatLng(coordEl.textContent);
    if (pts.length > 1) {
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
      allSegs.push(pts);
    }
  });
  doc.querySelectorAll('Track').forEach(t => {
    const pts = [...t.querySelectorAll('coord')]
      .map(c => { const p = c.textContent.trim().split(/\s+/).map(Number); return [p[1], p[0]]; })
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (pts.length > 1) {
      layers.push(L.polyline(pts, { color: '#5db87a', weight: 3, opacity: 0.9 }).addTo(state.map));
      allSegs.push(pts);
    }
  });

  state.traceLayer  = layers;
  state.traceCoords = allSegs;   // mémoriser pour KMZ

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

async function loadKMZ(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const kmlKeys = Object.keys(zip.files).filter(n => n.toLowerCase().endsWith('.kml'));
    if (!kmlKeys.length) { showToast('Aucun KML dans ce KMZ.', 'error'); return; }
    const key = kmlKeys.find(n => n.toLowerCase() === 'doc.kml') || kmlKeys[0];
    parseAndDrawKML(await zip.files[key].async('string'));
  } catch(err) { console.error(err); showToast('Erreur lecture KMZ.', 'error'); }
}

// ── Interaction carte ────────────────────────────

function onMapClick(e) {
  const idx = state.selectedGeoIdx;
  if (idx === null) { showToast('Sélectionnez d\'abord un waypoint dans la liste B.', 'error'); return; }
  const { lat, lng } = e.latlng;
  state.geoWaypoints[idx].lat = lat;
  state.geoWaypoints[idx].lon = lng;
  addMapMarker(idx, lat, lng);
  renderGeoList();
  showToast(`📍 #${idx + 1} placé — ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

function makeIcon(idx) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#5db87a;color:#0f1f15;border-radius:50% 50% 50% 0;
      width:26px;height:26px;transform:rotate(-45deg);display:flex;align-items:center;
      justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.5)">
      <span style="transform:rotate(45deg)">${idx + 1}</span></div>`,
    iconSize: [26, 26], iconAnchor: [13, 26],
  });
}

function addMapMarker(idx, lat, lon) {
  if (state.markers[idx]) state.map.removeLayer(state.markers[idx]);
  const wpt   = state.geoWaypoints[idx];
  const thumb = wpt._imgURL || wpt.thumb || '';
  state.markers[idx] = L.marker([lat, lon], { icon: makeIcon(idx) })
    .bindPopup(`<div style="text-align:center;max-width:160px">
      ${thumb ? `<img src="${thumb}" style="width:100%;border-radius:3px;margin-bottom:4px"/>` : ''}
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
      <img class="wpt-geo-thumb wpt-geo-thumb-click" src="${src}"
           alt="${escHtml(wpt.filename)}" data-geo-idx="${idx}"
           title="Cliquer pour agrandir" style="cursor:zoom-in" />
      <div class="wpt-geo-info">
        <div class="wpt-geo-name">${idx + 1}. ${escHtml(wpt.name) || escHtml(wpt.filename)}</div>
        <div class="wpt-geo-coords">
          ${wpt.lat !== null
            ? `📍 ${wpt.lat.toFixed(5)}, ${wpt.lon.toFixed(5)}`
            : '<span style="color:#8aad96">Cliquez sur la carte pour placer</span>'}
        </div>
      </div>
      <span class="wpt-geo-badge">✔</span>
    `;
    // Sélection du waypoint (clic carte)
    card.addEventListener('click', e => {
      if (e.target.classList.contains('wpt-geo-thumb-click')) return; // géré par lightbox
      state.selectedGeoIdx = idx;
      renderGeoList();
      if (state.markers[idx]) state.map.panTo(state.markers[idx].getLatLng());
      showToast(`Waypoint #${idx + 1} sélectionné — cliquez sur la carte pour le placer.`);
    });
    el.appendChild(card);
  });

  // Fix #3 : lightbox depuis liste B aussi
  el.querySelectorAll('.wpt-geo-thumb-click').forEach(img =>
    img.addEventListener('click', e => {
      e.stopPropagation();
      openLightbox(state.geoWaypoints[+img.dataset.geoIdx]);
    }));
}

// ══════════════════════════════════════════════════
// EXPORT _loc → KMZ (Fix #2)
// Structure KMZ = ZIP contenant :
//   doc.kml   — Placemarks Google Earth
//   files/    — images JPEG des waypoints
// ══════════════════════════════════════════════════

document.getElementById('saveLocBtn').addEventListener('click', async () => {
  const wpts = state.geoWaypoints.filter(w => w.lat !== null && w.lon !== null);
  if (!wpts.length) { showToast('Aucun waypoint géolocalisé à exporter.', 'error'); return; }

  const hasNonLocated = state.geoWaypoints.length - wpts.length;
  if (hasNonLocated > 0) showToast(`⚠ ${hasNonLocated} waypoint(s) sans position ignoré(s).`);

  showToast('⏳ Création du KMZ…');

  const zip = new JSZip();
  const filesFolder = zip.folder('files');

  // ── Style violet partagé pour le tracé ──────────
  const TRACE_STYLE_ID = 'traceStyle';
  const traceStyleKml = `
  <Style id="${TRACE_STYLE_ID}">
    <LineStyle>
      <color>ffb400b4</color><!-- violet : aabbggrr en KML -->
      <width>3</width>
    </LineStyle>
    <PolyStyle><fill>0</fill></PolyStyle>
  </Style>`;

  // ── Tracé(s) → Placemark(s) LineString ──────────
  let tracePlacemarks = '';
  if (state.traceCoords.length > 0) {
    state.traceCoords.forEach((seg, i) => {
      // KML : coordonnées en lon,lat,alt
      const coordStr = seg.map(([lat, lon]) => `${lon},${lat},0`).join('\n          ');
      tracePlacemarks += `
  <Placemark>
    <name>${escXml(state.traceName || 'Tracé')}${state.traceCoords.length > 1 ? ' ' + (i + 1) : ''}</name>
    <styleUrl>#${TRACE_STYLE_ID}</styleUrl>
    <LineString>
      <tessellate>1</tessellate>
      <coordinates>
          ${coordStr}
      </coordinates>
    </LineString>
  </Placemark>`;
    });
  }

  // ── Waypoints → Placemarks Point ────────────────
  let placemarks = '';
  for (const wpt of wpts) {
    const imgName = wpt.imageFilename || wpt.filename.replace(/\.[^.]+$/, '') + '.jpg';
    if (wpt._imgBlob) filesFolder.file(imgName, wpt._imgBlob);

    const descHtml = [
      `<img src="files/${imgName}" width="400"/>`,
      wpt.name    ? `<h3>${escXml(wpt.name)}</h3>` : '',
      wpt.comment ? `<p>${wpt.comment}</p>` : '',
      wpt.exifDate ? `<p><small>📅 ${escXml(wpt.exifDate)}</small></p>` : '',
    ].filter(Boolean).join('\n');

    placemarks += `
  <Placemark>
    <name>${escXml(wpt.name) || escXml(wpt.filename)}</name>
    <description><![CDATA[${descHtml}]]></description>
    <Style>
      <IconStyle>
        <Icon><href>files/${imgName}</href></Icon>
        <scale>0.6</scale>
      </IconStyle>
    </Style>
    <Point>
      <coordinates>${wpt.lon},${wpt.lat},0</coordinates>
    </Point>
  </Placemark>`;
  }

  const folderName = state.geoWaypoints[0].folderName || state.folderName || 'randonnee';
  const traceInfo  = state.traceCoords.length > 0
    ? `\n    <description>Tracé : ${escXml(state.traceName)} — ${state.traceCoords.reduce((n, s) => n + s.length, 0)} points</description>`
    : '';

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escXml(folderName)}_loc</name>${traceInfo}
    <description>Export AjouteWPT</description>
${traceStyleKml}
${tracePlacemarks}
${placemarks}
  </Document>
</kml>`;

  zip.file('doc.kml', kml);

  // JSON de référence
  const jsonData = {
    version: '2.0', created: new Date().toISOString(), folderName,
    waypoints: state.geoWaypoints.map(w => ({
      id: w.id, filename: w.filename,
      imageFile: 'files/' + (w.imageFilename || w.filename.replace(/\.[^.]+$/, '') + '.jpg'),
      name: w.name, comment: w.comment, thumb: w.thumb,
      lat: w.lat, lon: w.lon, exifDate: w.exifDate,
    })),
  };
  zip.file(folderName + '_loc.json', JSON.stringify(jsonData, null, 2));

  const kmzBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  downloadBlob(kmzBlob, folderName + '_loc.kmz');

  const traceMsg = state.traceCoords.length > 0
    ? ` + tracé (${state.traceCoords.reduce((n, s) => n + s.length, 0)} pts)`
    : ' (aucun tracé chargé)';
  showToast(`💾 "${folderName}_loc.kmz" — ${wpts.length} waypoint(s)${traceMsg}`);
});

// ══════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escXml(str) { return escHtml(str); }

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
