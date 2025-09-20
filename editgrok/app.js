let visitName = '';
let pois = [];
let editingIndex = -1;
let map;
let marker;

function startEditor() {
  visitName = document.getElementById('visit-name').value.trim();
  if (!visitName) return alert('Veuillez entrer un nom de visite.');
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('visit-title').textContent = `Visite: ${visitName}`;
  renderPOIs();
}

function renderPOIs() {
  const list = document.getElementById('poi-list');
  list.innerHTML = '';
  pois.forEach((poi, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.index = index;
    li.innerHTML = `
      <strong>${poi.title}</strong> - ${poi.location}
      <button onclick="editPOI(${index})">Modifier</button>
      <button onclick="deletePOI(${index})">Supprimer</button>
    `;
    list.appendChild(li);
  });
  addDragListeners();
}

function addDragListeners() {
  const list = document.getElementById('poi-list');
  list.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.target.style.opacity = '0.5';
  });
  list.addEventListener('dragend', e => {
    e.target.style.opacity = '1';
  });
  list.addEventListener('dragover', e => e.preventDefault());
  list.addEventListener('drop', e => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = Array.from(list.children).findIndex(li => li === e.target.closest('li'));
    if (fromIndex !== toIndex) {
      const [moved] = pois.splice(fromIndex, 1);
      pois.splice(toIndex, 0, moved);
      renderPOIs();
    }
  });
}

function savePOI() {
  const title = document.getElementById('poi-title').value.trim();
  const location = document.getElementById('poi-location').value.trim();
  if (!title || !location || !/^\d{1,2}\.\d{5}[NS],\s*\d{1,3}\.\d{5}[EW]$/.test(location)) {
    return alert('Titre et Localisation (format XX.XXXXXN, YY.YYYYYE) sont obligatoires.');
  }
  const comment = document.getElementById('poi-comment').value.trim();
  const image = document.getElementById('poi-image').files[0];
  const video = document.getElementById('poi-video').files[0];
  const audio = document.getElementById('poi-audio').files[0];
  const details = Array.from(document.getElementById('poi-details').files);

  const poi = { title, location, comment, image, video, audio, details };

  if (editingIndex >= 0) {
    pois[editingIndex] = poi;
    editingIndex = -1;
  } else {
    pois.push(poi);
  }
  clearForm();
  renderPOIs();
}

function clearForm() {
  document.getElementById('poi-title').value = '';
  document.getElementById('poi-location').value = '';
  document.getElementById('poi-comment').value = '';
  document.getElementById('poi-image').value = '';
  document.getElementById('poi-video').value = '';
  document.getElementById('poi-audio').value = '';
  document.getElementById('poi-details').value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('audio-preview').style.display = 'none';
  document.getElementById('details-preview').innerHTML = '';
}

function editPOI(index) {
  const poi = pois[index];
  document.getElementById('poi-title').value = poi.title;
  document.getElementById('poi-location').value = poi.location;
  document.getElementById('poi-comment').value = poi.comment;
  editingIndex = index;
  if (poi.image) previewImage(poi.image);
  if (poi.audio) previewAudio(poi.audio);
  if (poi.details && poi.details.length) previewDetails(poi.details);
}

function deletePOI(index) {
  pois.splice(index, 1);
  renderPOIs();
}

// Image preview and EXIF
document.getElementById('poi-image').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    previewImage(file);
    extractExifLocation(file);
  }
});

function previewImage(file) {
  const preview = document.getElementById('image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

function extractExifLocation(file) {
  EXIF.getData(file, function() {
    const lat = EXIF.getTag(this, 'GPSLatitude');
    const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
    const lon = EXIF.getTag(this, 'GPSLongitude');
    const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');
    if (lat && lon && latRef && lonRef) {
      const latDec = dmsToDecimal(lat, latRef);
      const lonDec = dmsToDecimal(lon, lonRef);
      document.getElementById('poi-location').value = `${latDec.toFixed(5)}${latRef}, ${lonDec.toFixed(5)}${lonRef}`;
    }
  });
}

function dmsToDecimal(dms, ref) {
  let [degrees, minutes, seconds] = dms.map(val => val.numerator / val.denominator);
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return Math.abs(decimal);
}

// Details preview
document.getElementById('poi-details').addEventListener('change', e => {
  const files = Array.from(e.target.files);
  if (files.length) previewDetails(files);
});

function previewDetails(files) {
  const preview = document.getElementById('details-preview');
  preview.innerHTML = '';
  files.forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = '100px';
    img.style.margin = '5px';
    preview.appendChild(img);
  });
}

// Audio preview
document.getElementById('poi-audio').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    previewAudio(file);
  }
});

function previewAudio(file) {
  const preview = document.getElementById('audio-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

// Map
function openMapModal() {
  document.getElementById('map-modal').style.display = 'flex';
  if (!map) {
    map = L.map('map').setView([48.8566, 2.3522], 5); // Default to France
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('click', e => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      const latStr = `${Math.abs(lat).toFixed(5)}${lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(lon).toFixed(5)}${lon >= 0 ? 'E' : 'W'}`;
      document.getElementById('poi-location').value = `${latStr}, ${lonStr}`;
      if (marker) marker.remove();
      marker = L.marker([lat, lon]).addTo(map);
    });
  }
}

function closeMapModal() {
  document.getElementById('map-modal').style.display = 'none';
}

// Download ZIP
async function downloadZip() {
  const zip = new JSZip();
  const dataFolder = zip.folder('data');

  const visitJson = {
    name: visitName,
    pois: pois.map((poi, index) => ({
      id: index + 1,
      title: poi.title,
      location: poi.location,
      comment: poi.comment,
      image: !!poi.image,
      video: !!poi.video,
      audio: !!poi.audio,
      details: poi.details ? poi.details.length : 0
    }))
  };

  zip.file('visit.json', JSON.stringify(visitJson, null, 2));

  for (let i = 0; i < pois.length; i++) {
    const poi = pois[i];
    const poiFolder = dataFolder.folder((i + 1).toString());
    poiFolder.file('Titre.txt', poi.title);
    poiFolder.file('Localisation.txt', poi.location);
    if (poi.comment) poiFolder.file('Commentaire.txt', poi.comment);
    if (poi.image) poiFolder.file('Image.jpg', poi.image);
    if (poi.video) poiFolder.file('Video.mp4', poi.video);
    if (poi.audio) poiFolder.file('Audio.mp3', poi.audio);
    if (poi.details) {
      poi.details.forEach((file, index) => {
        poiFolder.file(`Detail${index + 1}.jpg`, file);
      });
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${visitName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}