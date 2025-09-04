// Main logic: EXIF -> map -> tag -> save
let map, marker, pickedLatLng = null;
let currentImageFile = null;
let originalImageBitmap = null;
let canvas = document.getElementById('previewCanvas');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
const statusMsg = document.getElementById('statusMsg');
const coordText = document.getElementById('coordText');
const fileNameSpan = document.getElementById('fileName');
const tagBtn = document.getElementById('tagBtn');
const saveBtn = document.getElementById('saveBtn');
const fileInput = document.getElementById('fileInput');

// Map init
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([46.5, 2.6], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  marker = L.marker([46.5, 2.6], { draggable: true }).addTo(map);
  marker.on('dragend', () => {
    pickedLatLng = marker.getLatLng();
    updateCoordText(pickedLatLng.lat, pickedLatLng.lng);
  });
}
initMap();

function setStatus(msg, variant='') {
  statusMsg.textContent = msg;
  statusMsg.style.color = variant === 'err' ? '#ef4444' : (variant === 'ok' ? '#22c55e' : '#9fb3b6');
}

function formatLatLon(lat, lon) {
  const latAbs = Math.abs(lat).toFixed(5);
  const lonAbs = Math.abs(lon).toFixed(5);
  const latCard = lat >= 0 ? 'N' : 'S';
  const lonCard = lon >= 0 ? 'E' : 'W';
  return `Lat ${latAbs}${latCard} Lon ${lonAbs}${lonCard}`;
}

function updateCoordText(lat, lon) {
  coordText.textContent = formatLatLon(lat, lon);
}

async function readExifAndShow(file) {
  currentImageFile = file;
  fileNameSpan.textContent = file.name;

  setStatus('Lecture des métadonnées EXIF…');
  let gps = null;
  try {
    gps = await exifr.gps(file); // {latitude, longitude} en décimal si GPS présent
  } catch (e) {
    console.error(e);
    setStatus('Erreur lecture EXIF.', 'err');
  }

  if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
    setStatus('Pas de coordonnées EXIF détectées. Déplacez le marqueur manuellement si vous connaissez la position.', 'warn');
    pickedLatLng = marker.getLatLng(); // fallback
  } else {
    pickedLatLng = L.latLng(gps.latitude, gps.longitude);
    marker.setLatLng(pickedLatLng);
    map.setView(pickedLatLng, 15);
    setStatus('Coordonnées EXIF détectées.');
  }
  updateCoordText(pickedLatLng.lat, pickedLatLng.lng);

  // Preview image
  const imgBitmap = await createImageBitmap(file);
  originalImageBitmap = imgBitmap;
  // Fit canvas
  const maxW = 1600; // limiter pour éviter des fichiers énormes
  let scale = Math.min(1, maxW / imgBitmap.width);
  canvas.width = Math.round(imgBitmap.width * scale);
  canvas.height = Math.round(imgBitmap.height * scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

  tagBtn.disabled = false;
  saveBtn.disabled = true;
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) readExifAndShow(file);
});

// Tagger l'image avec le texte Lat/Lon
tagBtn.addEventListener('click', () => {
  if (!pickedLatLng || !originalImageBitmap) return;
  const text = formatLatLon(pickedLatLng.lat, pickedLatLng.lng);

  // redraw base
  ctx.drawImage(originalImageBitmap, 0, 0, canvas.width, canvas.height);

  const padding = Math.max(12, Math.round(canvas.width * 0.015));
  const fontSize = Math.max(18, Math.round(canvas.width * 0.03));
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textBaseline = 'bottom';

  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const textH = fontSize * 1.2;

  const x = padding;
  const y = canvas.height - padding;

  // background rounded rect
  const bgPadX = 12, bgPadY = 8, radius = 10;
  const rectX = x - bgPadX, rectY = y - textH - bgPadY;
  const rectW = textW + bgPadX * 2, rectH = textH + bgPadY * 2;

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000';
  roundRect(ctx, rectX, rectY, rectW, rectH, radius);
  ctx.fill();
  ctx.restore();

  // text
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);

  setStatus('Image marquée (non enregistrée).', 'ok');
  saveBtn.disabled = false;
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

// Enregistrer: ajoute "tag" au nom de fichier et écrit via File System Access API si disponible
saveBtn.addEventListener('click', async () => {
  if (!currentImageFile) return;
  setStatus('Préparation du fichier…');

  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  const orig = currentImageFile.name;
  const dot = orig.lastIndexOf('.');
  const base = dot > -1 ? orig.slice(0, dot) : orig;
  const ext = dot > -1 ? orig.slice(dot) : '.jpg';
  const newName = `${base}_tag${ext}`;

  // Try File System Access API (dir picker)
  try {
    if ('showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker();
      const fileHandle = await dirHandle.getFileHandle(newName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      setStatus(`Enregistré dans “${newName}”.`, 'ok');
      return;
    }
  } catch (e) {
    console.warn('FS Access API failed:', e);
  }

  // Fallback: force download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = newName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus(`Téléchargé : ${newName}`, 'ok');
});

// PWA install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').hidden = false;
});
document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installBtn').hidden = true;
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  });
}
