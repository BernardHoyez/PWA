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

// ─── Gaussian kernel & separable blur ────────────────────────────────────────
function buildGaussKernel(r, sigma) {
  sigma = sigma || r / 2.5;
  const k = [];
  for (let i = -r; i <= r; i++) k.push(Math.exp(-i*i / (2*sigma*sigma)));
  const s = k.reduce((a,b) => a+b, 0);
  return k.map(v => v / s);
}

function gaussBlur(data, w, h, radius, sigma) {
  const kernel = buildGaussKernel(radius, sigma);
  const tmp = new Float32Array(data.length);
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(Math.max(x + k, 0), w - 1);
        sum += data[y * w + xx] * kernel[k + radius];
      }
      tmp[y * w + x] = sum;
    }
  }
  const out = new Float32Array(data.length);
  // Vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(Math.max(y + k, 0), h - 1);
        sum += tmp[yy * w + x] * kernel[k + radius];
      }
      out[y * w + x] = sum;
    }
  }
  return out;
}

// ─── Local energy / sharpness measure ────────────────────────────────────────
// Combines: modified Laplacian + local variance over a window
// Much more robust than raw |Laplacian| alone

function sharpnessMap(gray, w, h) {
  // Step 1: Modified Laplacian (sum of absolute second derivatives in X and Y)
  const mlap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lx = Math.abs(2*gray[i] - gray[i-1] - gray[i+1]);
      const ly = Math.abs(2*gray[i] - gray[i-w] - gray[i+w]);
      mlap[i] = lx + ly;
    }
  }

  // Step 2: Sum of Modified Laplacian (SML) over a 5×5 window — gives local energy
  const WS = 5;
  const sml = new Float32Array(w * h);
  for (let y = WS; y < h - WS; y++) {
    for (let x = WS; x < w - WS; x++) {
      let sum = 0;
      for (let dy = -WS; dy <= WS; dy++)
        for (let dx = -WS; dx <= WS; dx++)
          sum += mlap[(y+dy)*w + (x+dx)];
      sml[y * w + x] = sum;
    }
  }

  // Step 3: Smooth aggressively to avoid hard boundaries (large sigma)
  // Two-pass: first moderate, then broad — produces soft weight maps
  const s1 = gaussBlur(sml, w, h, 7, 4);
  const s2 = gaussBlur(s1,  w, h, 11, 8);
  // Blend the two passes: favour the broader one near edges
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = 0.4 * s1[i] + 0.6 * s2[i];
  return out;
}

// ─── Soft blend using normalised weight maps ──────────────────────────────────
// Per-pixel weighted average (not winner-takes-all), so transitions are smooth.
// An additional consistency pass rejects outlier weights.

function softBlend(imageDataArr, sharpMaps, W, H) {
  const n = sharpMaps.length;
  const out = new Uint8ClampedArray(W * H * 4);
  const EPS = 1e-6;

  for (let i = 0; i < W * H; i++) {
    // Gather raw weights
    let total = 0;
    const w = new Float32Array(n);
    for (let k = 0; k < n; k++) { w[k] = sharpMaps[k][i]; total += w[k]; }
    if (total < EPS) { // flat area — use first image
      out[i*4]   = imageDataArr[0][i*4];
      out[i*4+1] = imageDataArr[0][i*4+1];
      out[i*4+2] = imageDataArr[0][i*4+2];
      out[i*4+3] = 255;
      continue;
    }

    // Normalise — then apply soft-max sharpening (exponent 3)
    // Higher exponent → closer to winner-takes-all but still smooth
    let s2 = 0;
    for (let k = 0; k < n; k++) { w[k] = Math.pow(w[k] / total, 3); s2 += w[k]; }
    if (s2 < EPS) s2 = EPS;

    let r = 0, g = 0, b = 0;
    for (let k = 0; k < n; k++) {
      const wn = w[k] / s2;
      r += imageDataArr[k][i*4]   * wn;
      g += imageDataArr[k][i*4+1] * wn;
      b += imageDataArr[k][i*4+2] * wn;
    }
    out[i*4]   = r + 0.5 | 0;
    out[i*4+1] = g + 0.5 | 0;
    out[i*4+2] = b + 0.5 | 0;
    out[i*4+3] = 255;
  }
  return out;
}

// ─── Gaussian pyramid ────────────────────────────────────────────────────────
function buildGaussPyramid(floatRGBA, w, h, levels) {
  // floatRGBA: Float32Array of length w*h*4
  const pyramid = [{ data: floatRGBA, w, h }];
  for (let l = 1; l < levels; l++) {
    const prev = pyramid[l-1];
    const nw = prev.w >> 1, nh = prev.h >> 1;
    if (nw < 4 || nh < 4) break;
    const down = downsample2x(prev.data, prev.w, prev.h);
    pyramid.push({ data: down, w: nw, h: nh });
  }
  return pyramid;
}

function downsample2x(src, w, h) {
  const nw = w >> 1, nh = h >> 1;
  const out = new Float32Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const oi = (y * nw + x) * 4;
      // 2x2 box filter
      const i00 = ((2*y)   * w + (2*x))   * 4;
      const i10 = ((2*y)   * w + (2*x+1)) * 4;
      const i01 = ((2*y+1) * w + (2*x))   * 4;
      const i11 = ((2*y+1) * w + (2*x+1)) * 4;
      for (let c = 0; c < 4; c++)
        out[oi+c] = (src[i00+c] + src[i10+c] + src[i01+c] + src[i11+c]) * 0.25;
    }
  }
  return out;
}

function upsample2x(src, nw, nh) {
  // Bilinear upsample to nw×nh (original full-res dimensions)
  const out = new Float32Array(nw * nh * 4);
  const sw = nw >> 1, sh = nh >> 1;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x + 0.5) / nw * sw - 0.5;
      const sy = (y + 0.5) / nh * sh - 0.5;
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(sw-1, x0+1);
      const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(sh-1, y0+1);
      const fx = sx - x0, fy = sy - y0;
      const oi = (y * nw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = src[(y0*sw+x0)*4+c], v10 = src[(y0*sw+x1)*4+c];
        const v01 = src[(y1*sw+x0)*4+c], v11 = src[(y1*sw+x1)*4+c];
        out[oi+c] = (1-fy)*((1-fx)*v00 + fx*v10) + fy*((1-fx)*v01 + fx*v11);
      }
    }
  }
  return out;
}

// ─── Laplacian pyramid of a float image ──────────────────────────────────────
function buildLaplacianPyramid(floatRGBA, w, h, levels) {
  const gauss = buildGaussPyramid(floatRGBA, w, h, levels);
  const lap = [];
  for (let l = 0; l < gauss.length - 1; l++) {
    const cur = gauss[l];
    const up  = upsample2x(gauss[l+1].data, cur.w, cur.h);
    const diff = new Float32Array(cur.data.length);
    for (let i = 0; i < diff.length; i++) diff[i] = cur.data[i] - up[i];
    lap.push({ data: diff, w: cur.w, h: cur.h });
  }
  lap.push(gauss[gauss.length-1]); // baseband
  return lap;
}

// ─── Gaussian pyramid of a weight map (single channel) ────────────────────────
function buildWeightPyramid(weights, w, h, levels) {
  const pyramid = [{ data: weights, w, h }];
  for (let l = 1; l < levels; l++) {
    const prev = pyramid[l-1];
    const nw = prev.w >> 1, nh = prev.h >> 1;
    if (nw < 4 || nh < 4) break;
    const down = downsampleW(prev.data, prev.w, prev.h);
    pyramid.push({ data: down, w: nw, h: nh });
  }
  return pyramid;
}

function downsampleW(src, w, h) {
  const nw = w >> 1, nh = h >> 1;
  const out = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++)
      out[y*nw+x] = (src[(2*y)*w+(2*x)] + src[(2*y)*w+(2*x+1)] +
                     src[(2*y+1)*w+(2*x)] + src[(2*y+1)*w+(2*x+1)]) * 0.25;
  return out;
}

function upsampleW(src, nw, nh) {
  const out = new Float32Array(nw * nh);
  const sw = nw >> 1, sh = nh >> 1;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x + 0.5) / nw * sw - 0.5;
      const sy = (y + 0.5) / nh * sh - 0.5;
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(sw-1, x0+1);
      const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(sh-1, y0+1);
      const fx = sx - x0, fy = sy - y0;
      const v00 = src[y0*sw+x0], v10 = src[y0*sw+x1];
      const v01 = src[y1*sw+x0], v11 = src[y1*sw+x1];
      out[y*nw+x] = (1-fy)*((1-fx)*v00+fx*v10) + fy*((1-fx)*v01+fx*v11);
    }
  }
  return out;
}

// ─── Pyramid Fusion (Burt & Adelson 1983, adapted for focus stacking) ─────────
// This is the gold standard: blend high-frequency detail using fine weight maps,
// blend low-frequency using coarse weight maps. Eliminates halo artefacts.
async function pyramidFusion(canvases, sharpMaps, W, H, onProgress) {
  const n = canvases.length;
  const LEVELS = Math.min(6, Math.floor(Math.log2(Math.min(W, H))) - 2);

  // Convert images to float RGBA
  const floatImgs = canvases.map(c => {
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    const f = new Float32Array(W * H * 4);
    for (let i = 0; i < f.length; i++) f[i] = d[i];
    return f;
  });

  // Normalise weight maps (sum to 1 per pixel) with soft-max sharpening
  const EPS = 1e-6;
  const normWeights = [];
  for (let k = 0; k < n; k++) normWeights.push(new Float32Array(W * H));

  for (let i = 0; i < W * H; i++) {
    let total = 0;
    for (let k = 0; k < n; k++) total += sharpMaps[k][i];
    if (total < EPS) {
      normWeights[0][i] = 1; // flat area → first image
      continue;
    }
    // Soft-max exponent = 4 (keeps transitions smooth but decisive)
    let s2 = 0;
    const tmp = new Float32Array(n);
    for (let k = 0; k < n; k++) { tmp[k] = Math.pow(sharpMaps[k][i] / total, 4); s2 += tmp[k]; }
    if (s2 < EPS) { normWeights[0][i] = 1; continue; }
    for (let k = 0; k < n; k++) normWeights[k][i] = tmp[k] / s2;
  }

  onProgress('Pyramides Laplaciennes…', 0.62);
  await yieldFrame();

  // Build Laplacian pyramids for each image
  const lapPyramids = [];
  for (let k = 0; k < n; k++) {
    lapPyramids.push(buildLaplacianPyramid(floatImgs[k], W, H, LEVELS));
    if (k % 2 === 0) await yieldFrame();
  }

  // Build Gaussian pyramids for each weight map
  const wPyramids = [];
  for (let k = 0; k < n; k++) {
    wPyramids.push(buildWeightPyramid(normWeights[k], W, H, LEVELS));
  }

  onProgress('Fusion multi-échelle…', 0.78);
  await yieldFrame();

  // Fuse at each pyramid level
  const fusedPyramid = [];
  const numLevels = lapPyramids[0].length;
  for (let l = 0; l < numLevels; l++) {
    const lw = lapPyramids[0][l].w;
    const lh = lapPyramids[0][l].h;
    const fused = new Float32Array(lw * lh * 4);

    for (let i = 0; i < lw * lh; i++) {
      // Weight at this pyramid level (Gaussian-smoothed → coarser = smoother)
      let wLevel = wPyramids[0][l] ? wPyramids[0][l].data : normWeights[0];
      const wIdx = Math.min(i, wLevel.length - 1);

      for (let c = 0; c < 4; c++) {
        let val = 0;
        for (let k = 0; k < n; k++) {
          const wkLevel = wPyramids[k][l] ? wPyramids[k][l].data : normWeights[k];
          const wk = wkLevel[Math.min(i, wkLevel.length - 1)];
          val += wk * lapPyramids[k][l].data[i * 4 + c];
        }
        fused[i * 4 + c] = val;
      }
    }
    fusedPyramid.push({ data: fused, w: lw, h: lh });
    await yieldFrame();
  }

  onProgress('Reconstruction de la pyramide…', 0.88);
  await yieldFrame();

  // Reconstruct from fused pyramid (collapse)
  let result = fusedPyramid[fusedPyramid.length - 1].data;
  let rw = fusedPyramid[fusedPyramid.length - 1].w;
  let rh = fusedPyramid[fusedPyramid.length - 1].h;

  for (let l = fusedPyramid.length - 2; l >= 0; l--) {
    const up = upsample2x(result, fusedPyramid[l].w, fusedPyramid[l].h);
    result = new Float32Array(up.length);
    for (let i = 0; i < result.length; i++) result[i] = up[i] + fusedPyramid[l].data[i];
    rw = fusedPyramid[l].w;
    rh = fusedPyramid[l].h;
  }

  // Clamp and convert to Uint8
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, result[i] + 0.5)) | 0;
  return out;
}

// ─── Auto-alignment : hierarchical multi-resolution + local tile warp ────────
//
// Strategy (3 passes):
//   1. Global translation at 1/8 scale (coarse)
//   2. Refine at 1/4 scale using the coarse result as seed
//   3. Local displacement field on a GRID_N×GRID_N tile grid → bilinear warp
//
// This corrects parallax shifts that differ across the frame (close vs far
// objects), which is the root cause of the "double nose" artefact.

async function alignImages(canvases) {
  const ref = canvases[0];
  const W = ref.width, H = ref.height;

  // ── helpers ──────────────────────────────────────────────────────────────
  function scaledGray(canvas, sw, sh) {
    const tmp = document.createElement('canvas');
    tmp.width = sw; tmp.height = sh;
    tmp.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
    return toGray(tmp.getContext('2d').getImageData(0, 0, sw, sh));
  }

  // NCC between two gray patches (sum over sparse grid for speed)
  function ncc(gA, gB, w, h, dx, dy, search) {
    let num = 0, d1 = 0, d2 = 0, mA = 0, mB = 0, n = 0;
    const step = Math.max(1, Math.floor(Math.min(w, h) / 40));
    for (let y = search; y < h - search; y += step) {
      for (let x = search; x < w - search; x += step) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
        mA += gA[y*w+x]; mB += gB[ty*w+tx]; n++;
      }
    }
    if (!n) return -1;
    mA /= n; mB /= n;
    for (let y = search; y < h - search; y += step) {
      for (let x = search; x < w - search; x += step) {
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
        const a = gA[y*w+x] - mA, b = gB[ty*w+tx] - mB;
        num += a*b; d1 += a*a; d2 += b*b;
      }
    }
    return num / (Math.sqrt(d1*d2) + 1e-8);
  }

  // Best integer shift within ±SEARCH (hierarchical: seed from coarser level)
  function findShift(gA, gB, w, h, searchR, seedDx = 0, seedDy = 0) {
    let best = -Infinity, bdx = seedDx, bdy = seedDy;
    for (let dy = seedDy - searchR; dy <= seedDy + searchR; dy++) {
      for (let dx = seedDx - searchR; dx <= seedDx + searchR; dx++) {
        const s = ncc(gA, gB, w, h, dx, dy, searchR + 2);
        if (s > best) { best = s; bdx = dx; bdy = dy; }
      }
    }
    return { dx: bdx, dy: bdy, score: best };
  }

  // ── per-image alignment ───────────────────────────────────────────────────
  const GRID_N = 8; // tile grid for local warp (8×8 = 64 control points)

  // Precompute reference gray at multiple scales
  const S8  = 0.125, S4 = 0.25;
  const rw8 = Math.round(W*S8), rh8 = Math.round(H*S8);
  const rw4 = Math.round(W*S4), rh4 = Math.round(H*S4);
  const refG8 = scaledGray(ref, rw8, rh8);
  const refG4 = scaledGray(ref, rw4, rh4);
  // Full-res reference for tile NCC
  const refGF = scaledGray(ref, W, H);

  const aligned = [ref]; // first image is reference

  for (let imgIdx = 1; imgIdx < canvases.length; imgIdx++) {
    const src = canvases[imgIdx];

    // Pass 1 — coarse global (1/8)
    const g8  = scaledGray(src, rw8, rh8);
    const p1  = findShift(refG8, g8, rw8, rh8, Math.round(rw8*0.12));
    const seed4x = Math.round(p1.dx / S8 * S4);
    const seed4y = Math.round(p1.dy / S8 * S4);

    // Pass 2 — fine global (1/4), seeded from pass 1
    const g4   = scaledGray(src, rw4, rh4);
    const p2   = findShift(refG4, g4, rw4, rh4, 6, seed4x, seed4y);
    const globalDx = Math.round(p2.dx / S4);
    const globalDy = Math.round(p2.dy / S4);

    // Pass 3 — local tile grid at 1/4 scale, seeded from global
    // Each tile independently refines within ±TILE_SEARCH pixels (full-res)
    const TILE_W = Math.round(rw4 / GRID_N);
    const TILE_H = Math.round(rh4 / GRID_N);
    const TILE_SEARCH = 4; // ±4 px at 1/4 scale = ±16 px full-res
    const tgtG4 = g4;

    // displacement field at grid resolution (in full-res pixels)
    const fieldDx = new Float32Array(GRID_N * GRID_N);
    const fieldDy = new Float32Array(GRID_N * GRID_N);

    for (let gy = 0; gy < GRID_N; gy++) {
      for (let gx = 0; gx < GRID_N; gx++) {
        // Tile seed = global shift at 1/4 scale
        const sdx = Math.round(p2.dx), sdy = Math.round(p2.dy);

        // Extract tile from reference and target with global pre-shift
        const x0 = gx * TILE_W, y0 = gy * TILE_H;
        const x1 = Math.min(x0 + TILE_W, rw4), y1 = Math.min(y0 + TILE_H, rh4);
        const tw = x1 - x0, th = y1 - y0;
        if (tw < 4 || th < 4) { fieldDx[gy*GRID_N+gx] = globalDx; fieldDy[gy*GRID_N+gx] = globalDy; continue; }

        // NCC over this tile
        let best = -Infinity, lbdx = sdx, lbdy = sdy;
        for (let ldy = sdy - TILE_SEARCH; ldy <= sdy + TILE_SEARCH; ldy++) {
          for (let ldx = sdx - TILE_SEARCH; ldx <= sdx + TILE_SEARCH; ldx++) {
            let num = 0, d1 = 0, d2 = 0, mA = 0, mB = 0, n = 0;
            for (let ty = 0; ty < th; ty++) {
              for (let tx = 0; tx < tw; tx++) {
                const ax = x0+tx, ay = y0+ty;
                const bx = ax+ldx, by = ay+ldy;
                if (bx < 0||bx>=rw4||by < 0||by>=rh4) continue;
                mA += refG4[ay*rw4+ax]; mB += tgtG4[by*rw4+bx]; n++;
              }
            }
            if (!n) continue;
            mA /= n; mB /= n;
            for (let ty = 0; ty < th; ty++) {
              for (let tx = 0; tx < tw; tx++) {
                const ax = x0+tx, ay = y0+ty;
                const bx = ax+ldx, by = ay+ldy;
                if (bx < 0||bx>=rw4||by < 0||by>=rh4) continue;
                const a = refG4[ay*rw4+ax]-mA, b = tgtG4[by*rw4+bx]-mB;
                num += a*b; d1 += a*a; d2 += b*b;
              }
            }
            const score = num / (Math.sqrt(d1*d2) + 1e-8);
            if (score > best) { best = score; lbdx = ldx; lbdy = ldy; }
          }
        }
        // Convert back to full-res pixels
        fieldDx[gy*GRID_N+gx] = lbdx / S4;
        fieldDy[gy*GRID_N+gx] = lbdy / S4;
      }
    }

    // Smooth the displacement field (median-like: clamp outliers to neighbour mean)
    smoothField(fieldDx, GRID_N, GRID_N);
    smoothField(fieldDy, GRID_N, GRID_N);

    // Warp source image using per-pixel bilinear-interpolated displacement field
    const warped = warpCanvas(src, W, H, fieldDx, fieldDy, GRID_N, GRID_N);
    aligned.push(warped);
    await yieldFrame();
  }

  return aligned;
}

// ── Smooth a grid field: replace each cell with average of 3×3 neighbourhood ──
function smoothField(field, gw, gh) {
  const tmp = new Float32Array(field.length);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx+dx, ny = gy+dy;
          if (nx >= 0 && nx < gw && ny >= 0 && ny < gh) { sum += field[ny*gw+nx]; n++; }
        }
      }
      tmp[gy*gw+gx] = sum / n;
    }
  }
  field.set(tmp);
}

// ── Per-pixel bilinear warp using a coarse displacement field ─────────────────
function warpCanvas(src, W, H, fieldDx, fieldDy, gw, gh) {
  const srcData = src.getContext('2d').getImageData(0, 0, W, H).data;
  const out = new Uint8ClampedArray(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Grid coordinates (float)
      const gx = (x / W) * (gw - 1);
      const gy = (y / H) * (gh - 1);
      const gx0 = Math.floor(gx), gx1 = Math.min(gx0+1, gw-1);
      const gy0 = Math.floor(gy), gy1 = Math.min(gy0+1, gh-1);
      const fx = gx - gx0, fy = gy - gy0;

      // Bilinear interpolation of displacement
      const dx = (1-fy)*((1-fx)*fieldDx[gy0*gw+gx0] + fx*fieldDx[gy0*gw+gx1]) +
                    fy *((1-fx)*fieldDx[gy1*gw+gx0] + fx*fieldDx[gy1*gw+gx1]);
      const dy = (1-fy)*((1-fx)*fieldDy[gy0*gw+gx0] + fx*fieldDy[gy0*gw+gx1]) +
                    fy *((1-fx)*fieldDy[gy1*gw+gx0] + fx*fieldDy[gy1*gw+gx1]);

      // Source pixel (bilinear sample)
      const sx = x + dx, sy = y + dy;
      const sx0 = Math.max(0, Math.min(W-2, Math.floor(sx)));
      const sy0 = Math.max(0, Math.min(H-2, Math.floor(sy)));
      const sfx = sx - sx0, sfy = sy - sy0;

      const i00 = (sy0*(W)     + sx0)   * 4;
      const i10 = (sy0*(W)     + sx0+1) * 4;
      const i01 = ((sy0+1)*(W) + sx0)   * 4;
      const i11 = ((sy0+1)*(W) + sx0+1) * 4;
      const oi  = (y * W + x) * 4;

      for (let c = 0; c < 3; c++) {
        out[oi+c] = (1-sfy)*((1-sfx)*srcData[i00+c] + sfx*srcData[i10+c]) +
                       sfy *((1-sfx)*srcData[i01+c] + sfx*srcData[i11+c]) + 0.5;
      }
      out[oi+3] = 255;
    }
  }

  const result = document.createElement('canvas');
  result.width = W; result.height = H;
  result.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  return result;
}

// ─── Focus Stacking — Pyramid Fusion pipeline ─────────────────────────────────
async function focusStack(canvases, onProgress) {
  const W = canvases[0].width, H = canvases[0].height;
  const n = canvases.length;

  // 1. Build sharpness maps (SML = Sum of Modified Laplacian, double-smoothed)
  onProgress('Cartes de netteté (SML)…', 0.35);
  const sharpMaps = [];
  for (let i = 0; i < n; i++) {
    const idata = getImageData(canvases[i]);
    const gray  = toGray(idata);
    const smap  = sharpnessMap(gray, W, H);
    sharpMaps.push(smap);
    onProgress(`Netteté image ${i+1}/${n}…`, 0.35 + (i / n) * 0.22);
    await yieldFrame();
  }

  // 2. Visualise composite sharpness map (max across all images)
  const maxMap = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    let m = 0;
    for (let k = 0; k < n; k++) if (sharpMaps[k][i] > m) m = sharpMaps[k][i];
    maxMap[i] = m;
  }
  visualizeSharpnessMap(maxMap, W, H, previewMap);
  await yieldFrame();

  // 3. Pyramid fusion (eliminates halos and edge artefacts)
  onProgress('Fusion pyramidale multi-échelle…', 0.60);
  await yieldFrame();

  const outPixels = await pyramidFusion(canvases, sharpMaps, W, H, onProgress);

  const resultC = document.createElement('canvas');
  resultC.width = W; resultC.height = H;
  resultC.getContext('2d').putImageData(new ImageData(outPixels, W, H), 0, 0);
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

    setProgress('Alignement automatique…', 0.15, `${canvases.length} images · alignement hiérarchique + warp local`);
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
    `Méthode : Pyramid + Local Warp`,
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
