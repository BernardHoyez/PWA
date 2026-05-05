/**
 * Photo+ · Focus Stacking PWA
 * Laplacian sharpness map · Auto-alignment · EXIF support
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  files: [],
  images: [],
  exifData: [],
  format: 'png',
  resultBlob: null,
  resultCanvas: null,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dropzone      = document.getElementById('dropzone');
const fileInput     = document.getElementById('fileInput');
const fileGrid      = document.getElementById('fileGrid');
const actionsBar    = document.getElementById('actionsBar');
const fileCount     = document.getElementById('fileCount');
const btnProcess    = document.getElementById('btnProcess');
const btnClear      = document.getElementById('btnClear');
const btnExport     = document.getElementById('btnExport');
const btnReset      = document.getElementById('btnReset');
const stepDrop      = document.getElementById('stepDrop');
const stepProcess   = document.getElementById('stepProcess');
const stepResult    = document.getElementById('stepResult');
const processStage  = document.getElementById('processStage');
const processDetail = document.getElementById('processDetail');
const progressBar   = document.getElementById('progressBar');
const previewAlign  = document.getElementById('previewAlign');
const previewMap    = document.getElementById('previewMap');
const previewResult = document.getElementById('previewResult');
const resultImg     = document.getElementById('resultImg');
const resultBadge   = document.getElementById('resultBadge');
const resultMeta    = document.getElementById('resultMeta');

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
['dragenter','dragover'].forEach(ev =>
  dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev =>
  dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', e => handleFiles(Array.from(e.dataTransfer.files)));
fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files)));
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
dropzone.addEventListener('click', e => { if (!e.target.closest('label')) fileInput.click(); });

// Format toggle
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.format = btn.dataset.fmt;
  });
});

btnClear.addEventListener('click', clearAll);
btnProcess.addEventListener('click', startProcessing);
btnReset.addEventListener('click', resetAll);
btnExport.addEventListener('click', exportResult);

// ─── EXIF (minimal embedded parser) ───────────────────────────────────────────
async function readEXIF(file) {
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xFFD8) return null; // not JPEG

    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) { // APP1 (EXIF)
        const len = view.getUint16(offset + 2);
        const exifStr = String.fromCharCode(...new Uint8Array(buf, offset + 4, 6));
        if (exifStr.startsWith('Exif')) {
          return parseIFD(buf, offset + 10, len - 8);
        }
      }
      if (offset + 2 + view.getUint16(offset + 2) >= view.byteLength) break;
      offset += 2 + view.getUint16(offset + 2);
    }
    return null;
  } catch { return null; }
}

function parseIFD(buf, tiffStart, len) {
  try {
    const view = new DataView(buf, tiffStart, len);
    const littleEndian = view.getUint16(0) === 0x4949;
    const tags = {};
    const tagNames = {
      0x010F: 'Make', 0x0110: 'Model', 0x0132: 'DateTime',
      0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8827: 'ISO',
      0x920A: 'FocalLength', 0x9202: 'ApertureValue'
    };
    const ifdOffset = view.getUint32(4, littleEndian);
    const numEntries = view.getUint16(ifdOffset, littleEndian);
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > len) break;
      const tag = view.getUint16(entryOffset, littleEndian);
      if (!tagNames[tag]) continue;
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
      try {
        if (type === 2) { // ASCII
          const start = count <= 4 ? entryOffset + 8 : valueOffset;
          let str = '';
          for (let j = 0; j < count - 1; j++) str += String.fromCharCode(view.getUint8(start + j));
          tags[tagNames[tag]] = str.trim();
        } else if (type === 5) { // RATIONAL
          const start = valueOffset;
          const num = view.getUint32(start, littleEndian);
          const den = view.getUint32(start + 4, littleEndian);
          if (tag === 0x829A) tags['ExposureTime'] = den > 1 ? `1/${Math.round(den/num)}s` : `${num/den}s`;
          else if (tag === 0x829D) tags['FNumber'] = `f/${(num/den).toFixed(1)}`;
          else if (tag === 0x920A) tags['FocalLength'] = `${(num/den).toFixed(0)}mm`;
        } else if (type === 3 && tag === 0x8827) {
          const start = count <= 2 ? entryOffset + 8 : valueOffset;
          tags['ISO'] = `ISO ${view.getUint16(start, littleEndian)}`;
        }
      } catch {}
    }
    return Object.keys(tags).length > 0 ? tags : null;
  } catch { return null; }
}

// ─── File handling ────────────────────────────────────────────────────────────
async function handleFiles(files) {
  const valid = files.filter(f => /image\/(jpeg|png)/.test(f.type));
  if (!valid.length) { showToast('Format non supporté. PNG ou JPEG uniquement.', 'error'); return; }

  const total = state.files.length + valid.length;
  if (total > 20) {
    showToast(`Maximum 20 images (${state.files.length} déjà chargées)`, 'error');
    valid.splice(20 - state.files.length);
  }
  if (!valid.length) return;

  for (const file of valid) {
    const exif = await readEXIF(file);
    state.exifData.push(exif);
    state.files.push(file);
    await addFileCard(file, state.files.length - 1, exif);
  }

  updateUI();
}

async function addFileCard(file, idx, exif) {
  const url = URL.createObjectURL(file);
  const card = document.createElement('div');
  card.className = 'file-card';
  card.dataset.idx = idx;

  const img = document.createElement('img');
  img.src = url;
  img.alt = file.name;

  const num = document.createElement('div');
  num.className = 'file-card-num';
  num.textContent = String(idx + 1).padStart(2, '0');

  const name = document.createElement('div');
  name.className = 'file-card-name';
  name.textContent = file.name;

  const del = document.createElement('button');
  del.className = 'file-card-del';
  del.innerHTML = '✕';
  del.title = 'Supprimer';
  del.onclick = e => { e.stopPropagation(); removeFile(idx); };

  card.appendChild(img);
  card.appendChild(num);
  card.appendChild(name);
  card.appendChild(del);

  // EXIF tooltip
  if (exif) {
    const tip = document.createElement('div');
    tip.className = 'exif-tooltip';
    Object.entries(exif).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'exif-row';
      row.innerHTML = `<span class="exif-key">${k}</span><span>${v}</span>`;
      tip.appendChild(row);
    });
    card.appendChild(tip);
  }

  fileGrid.appendChild(card);
}

function removeFile(idx) {
  state.files.splice(idx, 1);
  state.exifData.splice(idx, 1);
  fileGrid.innerHTML = '';
  const files = [...state.files];
  state.files = [];
  state.exifData = [];
  files.forEach((f, i) => handleFiles([f]));
  updateUI();
}

function updateUI() {
  const n = state.files.length;
  actionsBar.style.display = n > 0 ? 'flex' : 'none';
  fileCount.textContent = `${n} image${n > 1 ? 's' : ''} · ${n < 2 ? `(minimum 2 requises)` : `prêtes pour le stacking`}`;
  btnProcess.disabled = n < 2;
}

function clearAll() {
  state.files = [];
  state.exifData = [];
  fileGrid.innerHTML = '';
  updateUI();
}

// ─── Image loading ────────────────────────────────────────────────────────────
function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function imgToCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

function getImageData(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}

// ─── Grayscale ────────────────────────────────────────────────────────────────
function toGray(data) {
  const n = data.width * data.height;
  const gray = new Float32Array(n);
  const d = data.data;
  for (let i = 0; i < n; i++) {
    gray[i] = 0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2];
  }
  return gray;
}

// ─── Laplacian sharpness map ──────────────────────────────────────────────────
function laplacian(gray, w, h) {
  // Kernel: [0,-1,0,-1,4,-1,0,-1,0] (absolute value = sharpness)
  const lap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const val = Math.abs(
        4 * gray[i]
        - gray[i - 1]
        - gray[i + 1]
        - gray[i - w]
        - gray[i + w]
      );
      lap[i] = val;
    }
  }
  return lap;
}

// ─── Gaussian blur (for smoothing sharpness map) ──────────────────────────────
function gaussBlur(data, w, h, radius = 3) {
  const kernel = buildGaussKernel(radius);
  let tmp = new Float32Array(data.length);
  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, wSum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(Math.max(x + k, 0), w - 1);
        const kw = kernel[k + radius];
        sum += data[y * w + xx] * kw;
        wSum += kw;
      }
      tmp[y * w + x] = sum / wSum;
    }
  }
  const out = new Float32Array(data.length);
  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, wSum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(Math.max(y + k, 0), h - 1);
        const kw = kernel[k + radius];
        sum += tmp[yy * w + x] * kw;
        wSum += kw;
      }
      out[y * w + x] = sum / wSum;
    }
  }
  return out;
}

function buildGaussKernel(r) {
  const sigma = r / 2;
  const k = [];
  for (let i = -r; i <= r; i++) k.push(Math.exp(-i*i / (2*sigma*sigma)));
  return k;
}

// ─── Auto-alignment (ECC / phase correlation approximation) ───────────────────
// Simple translation-only alignment via cross-correlation on downscaled gray images
async function alignImages(canvases) {
  const ref = canvases[0];
  const W = ref.width, H = ref.height;
  const SCALE = 0.25; // work at 1/4 scale for speed
  const sw = Math.round(W * SCALE), sh = Math.round(H * SCALE);

  function getScaledGray(canvas) {
    const tmp = document.createElement('canvas');
    tmp.width = sw; tmp.height = sh;
    tmp.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
    return toGray(tmp.getContext('2d').getImageData(0, 0, sw, sh));
  }

  const refGray = getScaledGray(ref);
  const shifts = [{ dx: 0, dy: 0 }];

  for (let i = 1; i < canvases.length; i++) {
    const gray = getScaledGray(canvases[i]);
    const { dx, dy } = crossCorrelationShift(refGray, gray, sw, sh);
    shifts.push({ dx: Math.round(dx / SCALE), dy: Math.round(dy / SCALE) });
  }

  // Apply shifts
  return canvases.map((src, i) => {
    const { dx, dy } = shifts[i];
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.drawImage(src, dx, dy, W, H);
    return out;
  });
}

function crossCorrelationShift(refGray, tgtGray, w, h) {
  // Normalized cross-correlation over a search window ±SEARCH pixels
  const SEARCH = Math.min(32, Math.floor(Math.min(w, h) * 0.1));
  let bestScore = -Infinity, bestDx = 0, bestDy = 0;

  // Pre-compute ref stats
  let refMean = 0;
  for (let i = 0; i < refGray.length; i++) refMean += refGray[i];
  refMean /= refGray.length;

  for (let dy = -SEARCH; dy <= SEARCH; dy += 2) {
    for (let dx = -SEARCH; dx <= SEARCH; dx += 2) {
      let num = 0, d1 = 0, d2 = 0;
      for (let y = SEARCH; y < h - SEARCH; y += 4) {
        for (let x = SEARCH; x < w - SEARCH; x += 4) {
          const ri = y * w + x;
          const ti = (y + dy) * w + (x + dx);
          if (ti < 0 || ti >= tgtGray.length) continue;
          const rv = refGray[ri] - refMean;
          const tv = tgtGray[ti] - refMean;
          num += rv * tv;
          d1  += rv * rv;
          d2  += tv * tv;
        }
      }
      const score = num / (Math.sqrt(d1 * d2) + 1e-8);
      if (score > bestScore) { bestScore = score; bestDx = dx; bestDy = dy; }
    }
  }
  return { dx: bestDx, dy: bestDy };
}

// ─── Focus Stacking (Laplacian weighted blend) ────────────────────────────────
async function focusStack(canvases, onProgress) {
  const W = canvases[0].width, H = canvases[0].height;
  const n = canvases.length;

  // Build sharpness maps
  onProgress('Calcul des cartes Laplaciennes…', 0.35);
  const sharpMaps = [];
  for (let i = 0; i < n; i++) {
    const idata = getImageData(canvases[i]);
    const gray  = toGray(idata);
    const lap   = laplacian(gray, W, H);
    const blurred = gaussBlur(lap, W, H, 5);
    sharpMaps.push(blurred);
    onProgress(`Laplacien image ${i+1}/${n}`, 0.35 + (i / n) * 0.25);
    await yieldFrame();
  }

  // Visualize sharpness map of first image
  visualizeSharpnessMap(sharpMaps[0], W, H, previewMap);
  onProgress(`Mélange pondéré par netteté…`, 0.6);
  await yieldFrame();

  // Pixel-wise blend: for each pixel, pick the image with highest sharpness
  const out = new Uint8ClampedArray(W * H * 4);
  const imageDataArr = canvases.map(c => getImageData(c).data);

  for (let i = 0; i < W * H; i++) {
    let maxS = -1, best = 0;
    for (let k = 0; k < n; k++) {
      if (sharpMaps[k][i] > maxS) { maxS = sharpMaps[k][i]; best = k; }
    }
    out[i*4]   = imageDataArr[best][i*4];
    out[i*4+1] = imageDataArr[best][i*4+1];
    out[i*4+2] = imageDataArr[best][i*4+2];
    out[i*4+3] = imageDataArr[best][i*4+3];
  }

  const resultC = document.createElement('canvas');
  resultC.width = W; resultC.height = H;
  resultC.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  return resultC;
}

function visualizeSharpnessMap(map, w, h, canvas) {
  let max = 0;
  for (let i = 0; i < map.length; i++) if (map[i] > max) max = map[i];
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < map.length; i++) {
    const v = Math.round((map[i] / max) * 255);
    // Hot colormap: black → purple → orange → yellow
    out[i*4]   = Math.min(255, v * 1.5);
    out[i*4+1] = Math.min(255, Math.max(0, v * 1.2 - 80));
    out[i*4+2] = Math.min(255, Math.max(0, v * 0.8 - 100));
    out[i*4+3] = 255;
  }
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
}

function yieldFrame() {
  return new Promise(r => requestAnimationFrame(r));
}

// ─── Thumbnail for preview ────────────────────────────────────────────────────
function thumbCanvas(src, targetCanvas, maxW = 300) {
  const scale = Math.min(1, maxW / src.width);
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  targetCanvas.width = w;
  targetCanvas.height = h;
  targetCanvas.getContext('2d').drawImage(src, 0, 0, w, h);
}

// ─── Main processing pipeline ─────────────────────────────────────────────────
async function startProcessing() {
  if (state.files.length < 2) return;

  // Show process step
  stepDrop.classList.add('hidden');
  stepProcess.classList.remove('hidden');
  stepResult.classList.add('hidden');

  function setProgress(stage, pct, detail = '') {
    processStage.textContent = stage;
    progressBar.style.width = Math.round(pct * 100) + '%';
    processDetail.textContent = detail;
  }

  try {
    setProgress('Chargement des images…', 0.05);
    await yieldFrame();

    // Load all images
    const imgs = [];
    for (let i = 0; i < state.files.length; i++) {
      const img = await loadImage(state.files[i]);
      imgs.push(img);
      setProgress('Chargement des images…', 0.05 + (i / state.files.length) * 0.1, state.files[i].name);
      await yieldFrame();
    }

    // Convert to canvases
    let canvases = imgs.map(imgToCanvas);

    // Preview first image (alignment step)
    thumbCanvas(canvases[0], previewAlign);

    setProgress('Alignement automatique…', 0.15, `${canvases.length} images · alignement par corrélation croisée`);
    await yieldFrame();

    canvases = await alignImages(canvases);

    // Update preview after alignment
    thumbCanvas(canvases[0], previewAlign);

    setProgress('Focus stacking Laplacien…', 0.35, 'Calcul des cartes de netteté…');
    await yieldFrame();

    const resultCanvas = await focusStack(canvases, (msg, pct) => {
      setProgress(msg, pct, '');
    });

    state.resultCanvas = resultCanvas;
    thumbCanvas(resultCanvas, previewResult);

    setProgress('Finalisation…', 0.9);
    await yieldFrame();

    // Export to blob
    const fmt = state.format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = state.format === 'jpeg' ? 0.97 : undefined;

    await new Promise(res => {
      resultCanvas.toBlob(blob => {
        state.resultBlob = blob;
        res();
      }, fmt, quality);
    });

    setProgress('Terminé ✓', 1.0);
    await yieldFrame();

    showResult(resultCanvas);

  } catch (err) {
    console.error(err);
    showToast('Erreur lors du traitement : ' + err.message, 'error');
    stepDrop.classList.remove('hidden');
    stepProcess.classList.add('hidden');
  }
}

function showResult(canvas) {
  const url = URL.createObjectURL(state.resultBlob);
  resultImg.src = url;

  resultBadge.textContent = `${state.format.toUpperCase()} · ${canvas.width}×${canvas.height}`;

  // Meta chips
  resultMeta.innerHTML = '';
  const chips = [
    `${state.files.length} images stackées`,
    `${canvas.width} × ${canvas.height} px`,
    `Format : ${state.format.toUpperCase()}`,
    `Méthode : Laplacian Blend`,
  ];
  // Add EXIF from first file
  const ex = state.exifData[0];
  if (ex) {
    if (ex.Make || ex.Model) chips.push([ex.Make, ex.Model].filter(Boolean).join(' '));
    if (ex.FocalLength) chips.push(ex.FocalLength);
    if (ex.FNumber) chips.push(ex.FNumber);
    if (ex.ISO) chips.push(ex.ISO);
  }
  chips.forEach(text => {
    const chip = document.createElement('div');
    chip.className = 'meta-chip';
    chip.textContent = text;
    resultMeta.appendChild(chip);
  });

  stepProcess.classList.add('hidden');
  stepResult.classList.remove('hidden');
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportResult() {
  if (!state.resultBlob) return;
  const ext = state.format === 'png' ? 'png' : 'jpg';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(state.resultBlob);
  a.download = `photoplus_stack_${Date.now()}.${ext}`;
  a.click();
  showToast('Export téléchargé ✓', 'ok');
}

function resetAll() {
  state.files = [];
  state.exifData = [];
  state.resultBlob = null;
  state.resultCanvas = null;
  fileGrid.innerHTML = '';
  resultImg.src = '';
  resultMeta.innerHTML = '';
  previewAlign.width = 0;
  previewMap.width = 0;
  previewResult.width = 0;
  progressBar.style.width = '0%';
  updateUI();
  stepResult.classList.add('hidden');
  stepProcess.classList.add('hidden');
  stepDrop.classList.remove('hidden');
}

// ─── PWA Service Worker ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ─── Header info (PWA install hint) ──────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const info = document.getElementById('headerInfo');
  info.innerHTML = '<button id="btnInstall" style="background:transparent;border:1px solid #3d3d55;color:#7a7a99;font-family:\'DM Mono\',monospace;font-size:0.7rem;padding:4px 12px;border-radius:6px;cursor:pointer;">Installer l\'app</button>';
  document.getElementById('btnInstall').onclick = () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { info.innerHTML = ''; deferredPrompt = null; });
  };
});
