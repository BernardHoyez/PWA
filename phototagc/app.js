/**
 * app.js — phototagc
 * Traitement des photos : extraction EXIF + inscription du tag GPS/date
 */

// ===== État global =====
const state = {
  files: [],          // File[]
  exifData: [],       // { file, exif|null }[]
  zipBlob: null,
  options: {
    fontSize: 28,
    color: 'white',
    bg: 'semi',
    margin: 16,
  },
};

const COLOR_MAP = {
  white: '#ffffff',
  yellow: '#ffe44d',
  black: '#111111',
  red: '#ff4444',
};

const BG_MAP = {
  semi: 'rgba(0,0,0,0.55)',
  black: '#000000',
  none: null,
};

// ===== DOM refs =====
const dropZone = document.getElementById('drop-zone');
const folderInput = document.getElementById('folder-input');
const fileList = document.getElementById('file-list');
const fileCountBadge = document.getElementById('file-count');
const processBtn = document.getElementById('process-btn');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultArea = document.getElementById('result-area');
const resultStats = document.getElementById('result-stats');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const fontSizeInput = document.getElementById('font-size');
const fontSizeVal = document.getElementById('font-size-val');
const marginInput = document.getElementById('margin');
const marginVal = document.getElementById('margin-val');
const previewModal = document.getElementById('preview-modal');
const previewImg = document.getElementById('preview-img');
const previewInfo = document.getElementById('preview-info');
const modalClose = document.getElementById('modal-close');

// ===== Events =====

// Drag & Drop
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files));
});

folderInput.addEventListener('change', () => {
  handleFiles(Array.from(folderInput.files));
});

// Options
fontSizeInput.addEventListener('input', () => {
  state.options.fontSize = parseInt(fontSizeInput.value);
  fontSizeVal.textContent = fontSizeInput.value + 'px';
});

marginInput.addEventListener('input', () => {
  state.options.margin = parseInt(marginInput.value);
  marginVal.textContent = marginInput.value + 'px';
});

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.options.color = btn.dataset.color;
  });
});

document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.options.bg = btn.dataset.bg;
  });
});

processBtn.addEventListener('click', processAll);
downloadBtn.addEventListener('click', triggerDownload);
resetBtn.addEventListener('click', resetApp);

// Modal
modalClose.addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ===== File handling =====
async function handleFiles(files) {
  // Filter JPEG only
  const jpgs = files.filter(f => /\.(jpe?g)$/i.test(f.name));
  if (jpgs.length === 0) return;

  state.files = jpgs;
  state.exifData = [];
  fileList.innerHTML = '';
  resultArea.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressFill.style.width = '0%';
  state.zipBlob = null;

  // Show count
  fileCountBadge.textContent = `${jpgs.length} photo${jpgs.length > 1 ? 's' : ''}`;
  fileCountBadge.classList.remove('hidden');

  // Parse EXIF for all
  for (let i = 0; i < jpgs.length; i++) {
    const exif = await ExifReader.parse(jpgs[i]);
    state.exifData.push({ file: jpgs[i], exif });

    // Render chip
    const chip = document.createElement('div');
    chip.className = 'file-chip ' + (exif && exif.tag ? 'has-gps' : 'no-gps');
    chip.innerHTML = `<span class="chip-dot"></span>${jpgs[i].name}`;
    chip.title = exif && exif.tag ? exif.tag : 'Pas de données GPS/Date';
    chip.addEventListener('click', () => showPreview(i));
    fileList.appendChild(chip);
  }

  fileList.classList.remove('hidden');
  processBtn.disabled = false;
}

// ===== Preview =====
async function showPreview(index) {
  const { file, exif } = state.exifData[index];
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewInfo.textContent = exif && exif.tag
    ? exif.tag
    : 'Aucune donnée GPS/date détectée';
  previewModal.classList.remove('hidden');
  previewImg.onload = () => URL.revokeObjectURL(url);
}

function closeModal() {
  previewModal.classList.add('hidden');
  previewImg.src = '';
}

// ===== Process =====
async function processAll() {
  processBtn.disabled = true;
  resultArea.classList.add('hidden');
  progressWrap.classList.remove('hidden');

  const zip = new JSZip();
  let tagged = 0, skipped = 0;

  for (let i = 0; i < state.exifData.length; i++) {
    const { file, exif } = state.exifData[i];
    const pct = Math.round((i / state.exifData.length) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = `Traitement ${i + 1} / ${state.exifData.length} — ${file.name}`;

    // Small yield to keep UI responsive
    await new Promise(r => setTimeout(r, 0));

    try {
      const blob = await tagPhoto(file, exif);
      zip.file(file.name, blob);
      if (exif && exif.tag) tagged++; else skipped++;
    } catch (e) {
      console.warn('Erreur sur', file.name, e);
      // Add original if tagging fails
      zip.file(file.name, file);
      skipped++;
    }
  }

  progressFill.style.width = '100%';
  progressText.textContent = 'Génération du ZIP…';
  await new Promise(r => setTimeout(r, 50));

  state.zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  }, (meta) => {
    progressFill.style.width = meta.percent.toFixed(0) + '%';
    progressText.textContent = `Compression ZIP : ${meta.percent.toFixed(0)}%`;
  });

  progressWrap.classList.add('hidden');
  resultArea.classList.remove('hidden');
  resultStats.textContent = `${tagged} photo(s) taguée(s) · ${skipped} sans données GPS/date`;
  processBtn.disabled = false;
}

// ===== Tag a photo =====
async function tagPhoto(file, exif) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const tag = exif && exif.tag ? exif.tag : null;
        if (tag) {
          const { fontSize, color, bg, margin } = state.options;
          // Scale font size relative to image resolution vs screen
          const scale = Math.max(1, img.naturalWidth / 1024);
          const scaledFont = Math.round(fontSize * scale);
          const scaledMargin = Math.round(margin * scale);
          const padding = Math.round(6 * scale);

          ctx.font = `bold ${scaledFont}px 'Space Mono', monospace`;
          ctx.textBaseline = 'bottom';

          const metrics = ctx.measureText(tag);
          const textW = metrics.width;
          const textH = scaledFont;

          const x = scaledMargin;
          const y = canvas.height - scaledMargin;

          // Background
          if (bg !== 'none' && BG_MAP[bg]) {
            ctx.fillStyle = BG_MAP[bg];
            ctx.fillRect(
              x - padding,
              y - textH - padding,
              textW + padding * 2,
              textH + padding * 2
            );
          }

          // Text shadow for readability
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = Math.round(4 * scale);
          ctx.shadowOffsetX = Math.round(1 * scale);
          ctx.shadowOffsetY = Math.round(1 * scale);

          ctx.fillStyle = COLOR_MAP[color] || '#ffffff';
          ctx.fillText(tag, x, y);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.92);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

// ===== Download ZIP =====
function triggerDownload() {
  if (!state.zipBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(state.zipBlob);
  a.download = 'phototagc_output.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== Reset =====
function resetApp() {
  state.files = [];
  state.exifData = [];
  state.zipBlob = null;
  fileList.innerHTML = '';
  fileList.classList.add('hidden');
  fileCountBadge.classList.add('hidden');
  resultArea.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressFill.style.width = '0%';
  processBtn.disabled = true;
  folderInput.value = '';
}

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
