/* ═══════════════════════════════════════════════════════════
   Circuit IGN — Extracteur GPX/KML   app.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── État global ──────────────────────────────────────────
let imgEl = null, imgW = 0, imgH = 0;
let gcps = [];          // [{px,py,lat,lon}, ...]
let pickState = null;   // {step:'jpg'|'map', idx}
let pickedColor = { r: 212, g: 32, b: 32 };
let colorConfirmed = false;
let gpxContent = '', kmlContent = '';
let extractedPts = [];
const GCP_COLORS  = ['#e03030','#1060c8','#207830','#e87820'];
const GCP_LETTERS = ['A','B','C','D'];

// ─── Navigation / stepper ─────────────────────────────────
function goStep(n) {
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i === n));
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.toggle('active', i === n);
    s.classList.toggle('done', i < n);
  });
  if (n === 1) initMap();
  if (n === 2) initPip();
}

// ─── Step 0 : Import image ───────────────────────────────
const dz = document.getElementById('dz');
// Pas de listener click sur dz : le <label for="file-inp"> gère déjà l'ouverture
// Un listener click en plus provoquerait l'ouverture en double
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]); });
document.getElementById('file-inp').addEventListener('change', e => { if (e.target.files[0]) loadImg(e.target.files[0]); });

function loadImg(file) {
  const fr = new FileReader();
  fr.onload = ev => {
    imgEl = new Image();
    imgEl.onload = () => {
      imgW = imgEl.width; imgH = imgEl.height;
      const thumb = document.getElementById('thumb');
      thumb.src = ev.target.result;
      document.getElementById('thumb-wrap').style.display = 'block';
      document.getElementById('thumb-meta').textContent = `${file.name} — ${imgW} × ${imgH} px — ${(file.size/1024).toFixed(0)} Ko`;
      document.getElementById('btn01').disabled = false;
    };
    imgEl.src = ev.target.result;
  };
  fr.readAsDataURL(file);
}

// ─── Step 1 : Géoréférencement ───────────────────────────
let map = null, jpgMap = null, mapInited = false;
let leafletMarkers = [], jpgMarkers = [];
let jpgOverlay = null; // L.imageOverlay de la carte utilisateur

function initMap() {
  if (mapInited) return;
  mapInited = true;

  // ── Carte IGN droite ───────────────────────────────────
  map = L.map('leaflet-map', { center: [49.44, 0.25], zoom: 13 });
  L.tileLayer(
    'https://data.geopf.fr/wmts?' +
    'SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile' +
    '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
    '&STYLE=normal&FORMAT=image/png' +
    '&TILEMATRIXSET=PM' +
    '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    { attribution: '© IGN — Plan IGN v2', maxZoom: 18, minZoom: 1 }
  ).addTo(map);

  // Overlay intercepteur (injecté dans le container Leaflet)
  const overlay = document.createElement('div');
  overlay.id = 'map-pick-overlay';
  map.getContainer().appendChild(overlay);

  // ── Carte image gauche (Leaflet CRS.Simple) ────────────
  // CRS.Simple = système de coordonnées pixel, sans projection géo
  jpgMap = L.map('jpg-map', {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom:  5,
    zoomSnap: 0.25,
    attributionControl: false,
  });

  // Afficher l'image comme overlay couvrant [0,0] → [H,W] en coords Simple
  const bounds = [[0, 0], [imgH, imgW]];
  jpgOverlay = L.imageOverlay(imgEl.src, bounds).addTo(jpgMap);
  jpgMap.fitBounds(bounds);

  // Overlay intercepteur gauche (même technique)
  const overlayL = document.createElement('div');
  overlayL.id = 'jpg-pick-overlay';
  jpgMap.getContainer().appendChild(overlayL);
}

function addJpgMarker(idx) {
  const g = gcps[idx];
  if (g.px === null) return;
  // CRS.Simple : y est inversé (origine en bas-gauche), on corrige
  const latlng = L.latLng(imgH - g.py, g.px);
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${GCP_COLORS[idx]};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:bold 10px sans-serif;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${GCP_LETTERS[idx]}</div>`,
    iconSize: [22,22], iconAnchor: [11,11]
  });
  if (jpgMarkers[idx]) jpgMap.removeLayer(jpgMarkers[idx]);
  jpgMarkers[idx] = L.marker(latlng, { icon }).addTo(jpgMap);
}

function startGCP() {
  if (gcps.length >= 4) { alert('4 points de calage maximum.'); return; }
  gcps.push({ px: null, py: null, lat: null, lon: null });
  renderGCPTable();
  beginPickJpg(gcps.length - 1);
}

function beginPickJpg(idx) {
  pickState = { step: 'jpg', idx };
  document.getElementById('jpg-hint').style.display = 'block';
  document.getElementById('hint-ltr').textContent = GCP_LETTERS[idx];
  enableJpgPicking();
}

function enableJpgPicking() {
  const overlayL = document.getElementById('jpg-pick-overlay');
  overlayL.removeEventListener('click', onJpgOverlayClick);
  overlayL.style.cssText = [
    'display:block', 'position:absolute', 'inset:0',
    'z-index:9999', 'cursor:crosshair',
    'background:rgba(0,0,0,0.01)', 'pointer-events:all'
  ].join(';');
  overlayL.addEventListener('click', onJpgOverlayClick, { once: true });
}

function disableJpgPicking() {
  const overlayL = document.getElementById('jpg-pick-overlay');
  if (overlayL) {
    overlayL.style.cssText = 'display:none;pointer-events:none;';
    overlayL.removeEventListener('click', onJpgOverlayClick);
  }
}

function onJpgOverlayClick(e) {
  disableJpgPicking();
  if (!pickState || pickState.step !== 'jpg') return;
  // Convertir coordonnées écran → coordonnées image (pixels)
  // jpgMap utilise CRS.Simple : latlng = (imgH - py, px)
  const rect   = jpgMap.getContainer().getBoundingClientRect();
  const x      = e.clientX - rect.left;
  const y      = e.clientY - rect.top;
  const latlng = jpgMap.containerPointToLatLng(L.point(x, y));
  const imgX   = Math.round(Math.max(0, Math.min(imgW, latlng.lng)));
  const imgY   = Math.round(Math.max(0, Math.min(imgH, imgH - latlng.lat)));
  const idx    = pickState.idx;
  gcps[idx].px = imgX;
  gcps[idx].py = imgY;
  pickState.step = 'map';
  document.getElementById('jpg-hint').style.display = 'none';
  document.getElementById('map-hint').style.display = 'block';
  document.getElementById('hint-ltr2').textContent = GCP_LETTERS[idx];
  addJpgMarker(idx);
  renderGCPTable();
  enableMapPicking();
}

function enableMapPicking() {
  const overlay = document.getElementById('map-pick-overlay');
  overlay.removeEventListener('click', onOverlayClick);
  // Activer via style inline — plus fiable que classList sur un div créé dynamiquement
  overlay.style.cssText = [
    'display:block',
    'position:absolute',
    'inset:0',
    'z-index:9999',
    'cursor:crosshair',
    'background:rgba(0,0,0,0.01)',
    'pointer-events:all',
  ].join(';');
  overlay.addEventListener('click', onOverlayClick, { once: true });
  console.log('[GCP] overlay activé, z-index=9999, pointer-events=all');
}

function disableMapPicking() {
  const overlay = document.getElementById('map-pick-overlay');
  if (!overlay) return;
  overlay.style.cssText = 'display:none;pointer-events:none;';
  overlay.removeEventListener('click', onOverlayClick);
}

function onOverlayClick(e) {
  console.log('[GCP] overlay click reçu!', e.clientX, e.clientY);
  disableMapPicking();
  if (!pickState || pickState.step !== 'map') return;

  // Conversion coordonnées écran → lat/lon via l'API Leaflet
  const rect   = map.getContainer().getBoundingClientRect();
  const x      = e.clientX - rect.left;
  const y      = e.clientY - rect.top;
  const latlng = map.containerPointToLatLng(L.point(x, y));
  console.log('[GCP] lat/lon:', latlng.lat, latlng.lng);

  const idx = pickState.idx;
  gcps[idx].lat = latlng.lat;
  gcps[idx].lon = latlng.lng;
  pickState = null;
  document.getElementById('map-hint').style.display = 'none';
  addLeafletMarker(idx);
  renderGCPTable();
  checkGCPReady();
}

function addLeafletMarker(idx) {
  const g = gcps[idx];
  if (g.lat === null) return;
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${GCP_COLORS[idx]};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:bold 10px sans-serif;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${GCP_LETTERS[idx]}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
  if (leafletMarkers[idx]) map.removeLayer(leafletMarkers[idx]);
  leafletMarkers[idx] = L.marker([g.lat, g.lon], { icon }).addTo(map);
}

function renderGCPTable() {
  const tb = document.getElementById('gcp-body');
  tb.innerHTML = '';
  gcps.forEach((g, i) => {
    const tr = document.createElement('tr');
    if (pickState && pickState.idx === i) tr.classList.add('picking');
    tr.innerHTML = `
      <td><span class="gcp-dot" style="background:${GCP_COLORS[i]}"></span></td>
      <td><strong>${GCP_LETTERS[i]}</strong></td>
      <td style="font-family:monospace;font-size:.78rem">${g.px !== null ? g.px + ', ' + g.py : '<em style="color:#aaa">cliquez l\'image</em>'}</td>
      <td style="font-family:monospace;font-size:.78rem">${g.lat !== null ? g.lat.toFixed(5) + ', ' + g.lon.toFixed(5) : '<em style="color:#aaa">cliquez la carte</em>'}</td>
      <td><button class="gcp-del" onclick="delGCP(${i})" title="Supprimer">✕</button></td>`;
    tb.appendChild(tr);
  });
}

function delGCP(i) {
  gcps.splice(i, 1);
  if (leafletMarkers[i]) { map.removeLayer(leafletMarkers[i]); leafletMarkers.splice(i, 1); }
  if (jpgMarkers[i]) { jpgMap.removeLayer(jpgMarkers[i]); jpgMarkers.splice(i, 1); }
  if (pickState) {
    if (pickState.step === 'map') disableMapPicking();
    if (pickState.step === 'jpg') disableJpgPicking();
  }
  pickState = null;
  ['jpg-hint', 'map-hint'].forEach(id => document.getElementById(id).style.display = 'none');
  drawJpgCanvas();
  renderGCPTable();
  checkGCPReady();
}

function checkGCPReady() {
  const ok = gcps.filter(g => g.px !== null && g.lat !== null).length >= 2;
  document.getElementById('btn12').disabled = !ok;
}

// ─── Step 2 : Pipette ─────────────────────────────────────
let pipInited = false;

function initPip() {
  if (pipInited || !imgEl) return;
  pipInited = true;

  const wrap = document.getElementById('pip-full-wrap');
  const c    = document.getElementById('pip-canvas');

  // Canvas aux dimensions intrinsèques de l'image — pas de rescaling
  // On laisse CSS gérer l'affichage (width:100%)
  c.width  = imgW;
  c.height = imgH;
  const ctx = c.getContext('2d');
  ctx.drawImage(imgEl, 0, 0);

  c.addEventListener('mousemove', pipMove);
  c.addEventListener('mouseleave', () => {
    document.getElementById('pip-cursor-ui').style.display = 'none';
  });
  c.addEventListener('click', pipClick);
  c.addEventListener('touchmove',  e => { e.preventDefault(); pipMove(e.touches[0]); },        { passive: false });
  c.addEventListener('touchend',   e => { e.preventDefault(); pipClick(e.changedTouches[0]); }, { passive: false });
}

function pipCanvasCoords(e) {
  // Convertit coordonnées écran → pixels canvas intrinsèques
  const c   = document.getElementById('pip-canvas');
  const rec = c.getBoundingClientRect();
  const sx  = c.width  / rec.width;
  const sy  = c.height / rec.height;
  return {
    cx: Math.max(0, Math.min(c.width  - 1, Math.round((e.clientX - rec.left) * sx))),
    cy: Math.max(0, Math.min(c.height - 1, Math.round((e.clientY - rec.top)  * sy))),
    // Position CSS dans le wrap pour la loupe flottante
    cssX: e.clientX - rec.left,
    cssY: e.clientY - rec.top,
    cssW: rec.width,
    cssH: rec.height,
  };
}

function pipMove(e) {
  const { cx, cy, cssX, cssY, cssW, cssH } = pipCanvasCoords(e);
  const c   = document.getElementById('pip-canvas');
  const ctx = c.getContext('2d');
  const d   = ctx.getImageData(cx, cy, 1, 1).data;
  updatePipUI(d[0], d[1], d[2]);

  // ── Loupe flottante qui suit le curseur ──────────────────
  const ui    = document.getElementById('pip-cursor-ui');
  const zc    = document.getElementById('zoom-canvas');
  const zctx  = zc.getContext('2d');
  const ZW = 96, ZH = 96, ZR = 18; // taille loupe, pixels source capturés
  zctx.imageSmoothingEnabled = false;
  zctx.clearRect(0, 0, ZW, ZH);
  // Zone source autour du curseur
  zctx.drawImage(c, cx - ZR, cy - ZR, ZR*2, ZR*2, 0, 0, ZW, ZH);
  // Réticule central
  zctx.strokeStyle = 'rgba(255,255,255,.85)'; zctx.lineWidth = 1;
  zctx.beginPath(); zctx.moveTo(ZW/2, 0);    zctx.lineTo(ZW/2, ZH);    zctx.stroke();
  zctx.beginPath(); zctx.moveTo(0, ZH/2);    zctx.lineTo(ZW,   ZH/2);  zctx.stroke();
  // Carré couleur (fond du label)
  document.getElementById('pip-color-chip').style.background = rgbToHex(d[0], d[1], d[2]);
  document.getElementById('pip-color-label').textContent = rgbToHex(d[0], d[1], d[2]);

  // Positionner la loupe à droite-bas du curseur (bascule si bord)
  const UI_W = 130, UI_H = 130;
  let left = cssX + 16;
  let top  = cssY + 16;
  if (left + UI_W > cssW) left = cssX - UI_W - 8;
  if (top  + UI_H > cssH) top  = cssY - UI_H - 8;
  ui.style.left    = left + 'px';
  ui.style.top     = top  + 'px';
  ui.style.display = 'block';
}

function pipClick(e) {
  const { cx, cy } = pipCanvasCoords(e);
  const c   = document.getElementById('pip-canvas');
  const ctx = c.getContext('2d');
  const d   = ctx.getImageData(cx, cy, 1, 1).data;
  pickedColor = { r: d[0], g: d[1], b: d[2] };
  updatePipUI(d[0], d[1], d[2]);
  confirmColor();
}

function updatePipUI(r, g, b) {
  const hex = rgbToHex(r, g, b);
  document.getElementById('swatch').style.background = hex;
  document.getElementById('rgb-display').textContent = `R:${r} G:${g} B:${b}`;
  document.getElementById('hex-display').textContent = hex;
  pickedColor = { r, g, b };
}

function confirmColor() {
  colorConfirmed = true;
  const hex = rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b);
  const el  = document.getElementById('color-confirmed');
  el.style.display = 'flex';
  document.getElementById('cc-chip').style.background = hex;
  document.getElementById('cc-text').textContent = `${hex}  R:${pickedColor.r} G:${pickedColor.g} B:${pickedColor.b}`;
}

function applyPreset(r, g, b) {
  pickedColor = { r, g, b };
  updatePipUI(r, g, b);
  confirmColor();
}

document.getElementById('tol').addEventListener('input', function () {
  document.getElementById('tol-v').textContent = this.value;
});

// ─── Extraction ───────────────────────────────────────────
async function runExtraction() {
  goStep(3);
  document.getElementById('result-block').style.display = 'none';
  document.getElementById('res-nav').style.display      = 'none';
  document.getElementById('log-area').textContent = '';

  const W = imgW, H = imgH;
  const wc  = document.getElementById('work-canvas');
  wc.width  = W; wc.height = H;
  const ctx = wc.getContext('2d');
  ctx.drawImage(imgEl, 0, 0);
  const raw = ctx.getImageData(0, 0, W, H);
  const pxd = raw.data;

  const { r: tr, g: tg, b: tb } = pickedColor;
  const tol    = parseInt(document.getElementById('tol').value);
  const morpho = parseInt(document.getElementById('morpho').value);
  const eps    = parseInt(document.getElementById('simplify').value);

  setP(8, 'Détection des pixels tracé…'); await dl(20);
  logMsg('Couleur cible : ' + rgbToHex(tr, tg, tb) + ' — tolérance : ' + tol);

  const mask = new Uint8Array(W * H);
  let cnt = 0;
  for (let i = 0; i < W * H; i++) {
    const dr = pxd[i*4] - tr, dg = pxd[i*4+1] - tg, db = pxd[i*4+2] - tb;
    if (Math.sqrt(dr*dr + dg*dg + db*db) < tol) { mask[i] = 1; cnt++; }
  }
  logMsg('Pixels tracé détectés : ' + cnt.toLocaleString());

  if (cnt < 20) {
    setP(100, '⚠ Aucun tracé trouvé. Vérifiez la couleur et la tolérance.');
    return;
  }

  setP(28, 'Morphologie (fermeture des gaps)…'); await dl(20);
  if (morpho > 0) {
    const tmp = new Uint8Array(mask);
    for (let y = morpho; y < H - morpho; y++)
      for (let x = morpho; x < W - morpho; x++) {
        if (!tmp[y*W+x]) continue;
        for (let dy = -morpho; dy <= morpho; dy++)
          for (let dx = -morpho; dx <= morpho; dx++)
            mask[(y+dy)*W+(x+dx)] = 1;
      }
    logMsg('Morphologie appliquée (rayon ' + morpho + ' px).');
  }

  setP(48, 'Squelettisation (Zhang-Suen)…'); await dl(40);
  const sk = thin(mask, W, H);
  let skCnt = 0; for (let i = 0; i < sk.length; i++) if (sk[i]) skCnt++;
  logMsg('Pixels squelette : ' + skCnt.toLocaleString());

  setP(66, 'Chaînage du tracé…'); await dl(20);
  const chain = chainSk(sk, W, H);
  logMsg('Points chaînés : ' + chain.length.toLocaleString());

  if (chain.length < 2) {
    setP(100, '⚠ Tracé trop fragmenté. Augmentez la fermeture des gaps.');
    return;
  }

  setP(80, 'Simplification Ramer-Douglas-Peucker…'); await dl(20);
  let pts = chain;
  if (eps > 0 && pts.length > 5) pts = rdp(pts, eps);
  logMsg('Points après simplification : ' + pts.length.toLocaleString());

  setP(90, 'Géoréférencement (GCPs)…'); await dl(10);
  extractedPts = pts.map(([x, y]) => pixToLatLon(x, y));

  const name = document.getElementById('track-name').value || 'Circuit IGN';
  gpxContent  = buildGPX(extractedPts, name);
  kmlContent  = buildKML(extractedPts, name);

  const dist = geoDist(extractedPts);
  setP(97, 'Rendu visuel…'); await dl(20);
  renderResult(pts, W, H);

  document.getElementById('s-pts').textContent  = pts.length.toLocaleString();
  document.getElementById('s-dist').textContent = dist.toFixed(1) + ' km';
  document.getElementById('s-px').textContent   = cnt.toLocaleString();

  buildDownloadButtons();
  document.getElementById('result-block').style.display = 'block';
  document.getElementById('res-nav').style.display      = 'flex';
  setP(100, '✓ Extraction terminée avec succès !');
  logMsg('✓ Fichiers prêts au téléchargement.');
}

// ─── Transformation GCP (affine, moindres carrés) ─────────
function pixToLatLon(px2, py2) {
  const valid = gcps.filter(g => g.px !== null && g.lat !== null);
  if (valid.length === 0) return { lat: 0, lon: 0 };
  if (valid.length === 1) return { lat: valid[0].lat, lon: valid[0].lon };
  if (valid.length === 2) {
    // 2 points : transformation affine sans rotation (translation + échelle).
    // On suppose la carte non pivotée (hypothèse raisonnable pour une IGN scannée).
    // Résolution : lat = a0 + a1*px  et  lon = b0 + b1*py  (axes indépendants)
    const g0 = valid[0], g1 = valid[1];
    const dpx  = g1.px  - g0.px  || 1e-9;
    const dpy  = g1.py  - g0.py  || 1e-9;
    const dLat = g1.lat - g0.lat;
    const dLon = g1.lon - g0.lon;
    // Pentes par pixel
    const sLat_x = dLat / dpx;   // variation lat par pixel X
    const sLat_y = dLat / dpy;   // variation lat par pixel Y
    const sLon_x = dLon / dpx;
    const sLon_y = dLon / dpy;
    // Sur une carte IGN, lat varie surtout sur Y et lon sur X
    // On pondère selon la direction principale du vecteur entre les 2 GCPs
    const absDpx = Math.abs(dpx), absDpy = Math.abs(dpy);
    const wx = absDpx / (absDpx + absDpy);  // poids axe X
    const wy = absDpy / (absDpx + absDpy);  // poids axe Y
    const dx = px2 - g0.px, dy = py2 - g0.py;
    const lat = g0.lat + dx * sLat_x * wx + dy * sLat_y * wy;
    const lon = g0.lon + dx * sLon_x * wx + dy * sLon_y * wy;
    return { lat, lon };
  }
  // 3+ points : système normal 3×3
  let sx=0,sy=0,sxx=0,sxy=0,syy=0,slat=0,slon=0,sxlat=0,sylat=0,sxlon=0,sylon=0;
  for (const g of valid) {
    sx+=g.px; sy+=g.py; sxx+=g.px*g.px; sxy+=g.px*g.py; syy+=g.py*g.py;
    slat+=g.lat; slon+=g.lon; sxlat+=g.px*g.lat; sylat+=g.py*g.lat;
    sxlon+=g.px*g.lon; sylon+=g.py*g.lon;
  }
  const n = valid.length;
  const A = [[n,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]];
  const cLat = solveLS3(A, [slat, sxlat, sylat]);
  const cLon = solveLS3(A, [slon, sxlon, sylon]);
  return { lat: cLat[0]+cLat[1]*px2+cLat[2]*py2, lon: cLon[0]+cLon[1]*px2+cLon[2]*py2 };
}

function solveLS3(A, b) {
  const det3 = m => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const d = det3(A);
  if (Math.abs(d) < 1e-12) return [0, 0, 0];
  return [0,1,2].map(j => det3(A.map((row,i) => row.map((v,k) => k===j ? b[i] : v))) / d);
}

// ─── Traitement image ─────────────────────────────────────
function thin(mask, W, H) {
  const out = new Uint8Array(mask);
  let changed = true, iters = 0;
  while (changed && iters < 60) {
    changed = false; iters++;
    for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++) {
      const i = y*W+x; if (!out[i]) continue;
      const n = [out[(y-1)*W+x],out[(y-1)*W+x+1],out[y*W+x+1],out[(y+1)*W+x+1],
                 out[(y+1)*W+x],out[(y+1)*W+x-1],out[y*W+x-1],out[(y-1)*W+x-1]];
      const s = n.reduce((a,b)=>a+b,0);
      if (s < 2 || s > 6) continue;
      let t = 0; for (let k=0; k<8; k++) if (!n[k] && n[(k+1)%8]) t++;
      if (t !== 1) continue;
      if (n[0]&&n[2]&&n[4]) continue;
      if (n[2]&&n[4]&&n[6]) continue;
      out[i] = 0; changed = true;
    }
  }
  return out;
}

function chainSk(sk, W, H) {
  // Collecter TOUS les segments du squelette (pas seulement le plus long)
  // puis les trier par longueur décroissante et les concaténer.
  // Cela préserve le tracé complet même s'il est légèrement fragmenté.
  const vis  = new Uint8Array(sk.length);
  const dirs = [[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
  const segments = [];
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    if (!sk[sy*W+sx] || vis[sy*W+sx]) continue;
    const ch = []; let cx = sx, cy = sy;
    while (true) {
      if (vis[cy*W+cx]) break;
      vis[cy*W+cx] = 1; ch.push([cx, cy]);
      let found = false;
      for (const [dy,dx] of dirs) {
        const ny = cy+dy, nx = cx+dx;
        if (ny>=0&&ny<H&&nx>=0&&nx<W&&sk[ny*W+nx]&&!vis[ny*W+nx]) { cx=nx; cy=ny; found=true; break; }
      }
      if (!found) break;
    }
    if (ch.length >= 3) segments.push(ch);
  }
  if (segments.length === 0) return [];
  // Trier par longueur décroissante
  segments.sort((a, b) => b.length - a.length);
  // Ne garder que les segments qui représentent au moins 2% du plus long
  // (filtrer le bruit)
  const minLen = Math.max(5, segments[0].length * 0.02);
  const kept = segments.filter(s => s.length >= minLen);
  // Concaténer dans l'ordre topologique : relier chaque segment
  // au bout le plus proche du segment précédent
  let result = kept[0];
  for (let i = 1; i < kept.length; i++) {
    const seg = kept[i];
    const endR  = result[result.length - 1];
    const startS = seg[0];
    const endS   = seg[seg.length - 1];
    const dStart = dist2(endR, startS);
    const dEnd   = dist2(endR, endS);
    result = dStart <= dEnd
      ? result.concat(seg)
      : result.concat(seg.slice().reverse());
  }
  return result;
}

function dist2(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  const [x1,y1] = pts[0], [x2,y2] = pts[pts.length-1];
  const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy) || 1;
  for (let i = 1; i < pts.length-1; i++) {
    const d = Math.abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) return [...rdp(pts.slice(0,idx+1), eps), ...rdp(pts.slice(idx), eps).slice(1)];
  return [pts[0], pts[pts.length-1]];
}

function geoDist(pts) {
  let d = 0; const R = 6371;
  for (let i = 1; i < pts.length; i++) {
    const dLat = (pts[i].lat - pts[i-1].lat) * Math.PI/180;
    const dLon = (pts[i].lon - pts[i-1].lon) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(pts[i-1].lat*Math.PI/180)*Math.cos(pts[i].lat*Math.PI/180)*Math.sin(dLon/2)**2;
    d += R * 2 * Math.asin(Math.sqrt(a));
  }
  return d;
}

function renderResult(chain, W, H) {
  const rc    = document.getElementById('res-canvas');
  const maxW  = Math.min(W, rc.parentElement.clientWidth || 860);
  const scale = maxW / W;
  rc.width  = Math.round(W * scale);
  rc.height = Math.round(H * scale);
  const rctx = rc.getContext('2d');
  rctx.drawImage(document.getElementById('work-canvas'), 0, 0, rc.width, rc.height);
  if (chain.length > 1) {
    rctx.beginPath();
    rctx.strokeStyle = 'rgba(0,200,100,.85)';
    rctx.lineWidth   = 2.5;
    rctx.moveTo(chain[0][0]*scale, chain[0][1]*scale);
    for (let i = 1; i < chain.length; i++) rctx.lineTo(chain[i][0]*scale, chain[i][1]*scale);
    rctx.stroke();
    // Points départ / arrivée
    [[chain[0],'#00e676'], [chain[chain.length-1],'#ff1744']].forEach(([pt, col]) => {
      rctx.beginPath(); rctx.arc(pt[0]*scale, pt[1]*scale, 6, 0, 2*Math.PI);
      rctx.fillStyle = col; rctx.fill();
      rctx.strokeStyle = '#fff'; rctx.lineWidth = 1.5; rctx.stroke();
    });
  }
}

// ─── GPX / KML ────────────────────────────────────────────
function buildGPX(pts, name) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Circuit IGN Extractor — BernardHoyez.github.io" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(name)}</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${pts.map(p => `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"></trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>`;
}

function buildKML(pts, name) {
  const coords = pts.map(p => `${p.lon.toFixed(7)},${p.lat.toFixed(7)},0`).join('\n          ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(name)}</name>
    <Style id="trailStyle">
      <LineStyle><color>ff0000e6</color><width>3</width></LineStyle>
    </Style>
    <Placemark>
      <name>${esc(name)}</name>
      <styleUrl>#trailStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${coords}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

function buildDownloadButtons() {
  const fmt  = document.getElementById('export-fmt').value;
  const name = (document.getElementById('track-name').value || 'circuit-ign').replace(/\s+/g, '-');
  const grid = document.getElementById('dl-grid');
  grid.innerHTML = '';
  if (fmt !== 'kml') {
    const b = document.createElement('button');
    b.className = 'dl-btn gpx';
    b.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Télécharger GPX`;
    b.onclick = () => dlFile(gpxContent, name + '.gpx', 'application/gpx+xml');
    grid.appendChild(b);
  }
  if (fmt !== 'gpx') {
    const b = document.createElement('button');
    b.className = 'dl-btn kml';
    b.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Télécharger KML`;
    b.onclick = () => dlFile(kmlContent, name + '.kml', 'application/vnd.google-earth.kml+xml');
    grid.appendChild(b);
  }
}

function dlFile(content, filename, mime) {
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Helpers ──────────────────────────────────────────────
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function setP(v, l) {
  document.getElementById('prog-bar').style.width = v + '%';
  document.getElementById('prog-label').textContent = l;
}
function dl(ms) { return new Promise(r => setTimeout(r, ms)); }
function logMsg(m) {
  const el = document.getElementById('log-area');
  el.textContent += '› ' + m + '\n';
  el.scrollTop = el.scrollHeight;
}
function restart() {
  imgEl = null; imgW = 0; imgH = 0;
  gcps = []; pickState = null; colorConfirmed = false;
  gpxContent = ''; kmlContent = ''; extractedPts = [];
  pipInited = false; mapInited = false;
  if (map)    { map.remove();    map    = null; }
  if (jpgMap) { jpgMap.remove(); jpgMap = null; jpgOverlay = null; }
  leafletMarkers = []; jpgMarkers = [];
  document.getElementById('thumb-wrap').style.display = 'none';
  document.getElementById('btn01').disabled = true;
  document.getElementById('btn12').disabled = true;
  document.getElementById('gcp-body').innerHTML = '';
  document.getElementById('color-confirmed').style.display = 'none';
  goStep(0);
}
