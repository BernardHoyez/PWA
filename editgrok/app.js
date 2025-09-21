console.log('Chargement de app.js');
let visitName = '';
let pois = [];
let editingIndex = -1;
let map;
let marker;
let currentFiles = { image: null, video: null, audio: null, details: [] };

function startEditor() {
  console.log('startEditor appelé');
  visitName = document.getElementById('visit-name').value.trim();
  if (!visitName) {
    console.log('Nom de visite vide');
    return alert('Veuillez entrer un nom de visite.');
  }
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('visit-title').textContent = `Visite: ${visitName}`;
  console.log('Rendu des POIs');
  renderPOIs();
}

function renderPOIs() {
  console.log('renderPOIs appelé');
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
  const image = document.getElementById('poi-image').files[0] || currentFiles.image;
  const video = document.getElementById('poi-video').files[0] || currentFiles.video;
  const audio = document.getElementById('poi-audio').files[0] || currentFiles.audio;
  const details = Array.from(document.getElementById('poi-details').files).length > 0 ? Array.from(document.getElementById('poi-details').files) : currentFiles.details;

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
  document.getElementById('video-preview').style.display = 'none';
  document.getElementById('audio-preview').style.display = 'none';
  document.getElementById('details-preview').innerHTML = '';
  document.getElementById('remove-image').style.display = 'none';
  document.getElementById('remove-video').style.display = 'none';
  document.getElementById('remove-audio').style.display = 'none';
  document.getElementById('remove-details').style.display = 'none';
  currentFiles = { image: null, video: null, audio: null, details: [] };
}

function editPOI(index) {
  const poi = pois[index];
  document.getElementById('poi-title').value = poi.title;
  document.getElementById('poi-location').value = poi.location;
  document.getElementById('poi-comment').value = poi.comment;
  editingIndex = index;
  currentFiles = { image: poi.image, video: poi.video, audio: poi.audio, details: poi.details || [] };

  if (poi.image) {
    previewImage(poi.image);
    document.getElementById('remove-image').style.display = 'block';
  }
  if (poi.video) {
    previewVideo(poi.video);
    document.getElementById('remove-video').style.display = 'block';
  }
  if (poi.audio) {
    previewAudio(poi.audio);
    document.getElementById('remove-audio').style.display = 'block';
  }
  if (poi.details && poi.details.length) {
    previewDetails(poi.details);
    document.getElementById('remove-details').style.display = 'block';
  }
}

function deletePOI(index) {
  if (confirm('Voulez-vous vraiment supprimer ce POI ?')) {
    pois.splice(index, 1);
    renderPOIs();
  }
}

function removeFile(type) {
  if (type === 'image') {
    currentFiles.image = null;
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('remove-image').style.display = 'none';
    document.getElementById('poi-image').value = '';
  } else if (type === 'video') {
    currentFiles.video = null;
    document.getElementById('video-preview').style.display = 'none';
    document.getElementById('remove-video').style.display = 'none';
    document.getElementById('poi-video').value = '';
  } else if (type === 'audio') {
    currentFiles.audio = null;
    document.getElementById('audio-preview').style.display = 'none';
    document.getElementById('remove-audio').style.display = 'none';
    document.getElementById('poi-audio').value = '';
  } else if (type === 'details') {
    currentFiles.details = [];
    document.getElementById('details-preview').innerHTML = '';
    document.getElementById('remove-details').style.display = 'none';
    document.getElementById('poi-details').value = '';
  }
}

document.getElementById('poi-image').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    currentFiles.image = file;
    previewImage(file);
    document.getElementById('remove-image').style.display = 'block';
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

document.getElementById('poi-video').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    currentFiles.video = file;
    previewVideo(file);
    document.getElementById('remove-video').style.display = 'block';
  }
});

function previewVideo(file) {
  const preview = document.getElementById('video-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

document.getElementById('poi-details').addEventListener('change', e => {
  const files = Array.from(e.target.files);
  if (files.length) {
    currentFiles.details = files;
    previewDetails(files);
    document.getElementById('remove-details').style.display = 'block';
  }
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

document.getElementById('poi-audio').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    currentFiles.audio = file;
    previewAudio(file);
    document.getElementById('remove-audio').style.display = 'block';
  }
});

function previewAudio(file) {
  const preview = document.getElementById('audio-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}

function openMapModal() {
  document.getElementById('map-modal').style.display = 'flex';
  if (!map) {
    map = L.map('map').setView([48.8566, 2.3522], 5);
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

async function importZip(event) {
  console.log('importZip appelé');
  const file = event.target.files[0];
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    
    // Extraire visit.json
    const visitJsonFile = zip.file('visit.json');
    if (!visitJsonFile) return alert('Fichier visit.json manquant dans le ZIP.');
    const visitJsonText = await visitJsonFile.async('text');
    const visitData = JSON.parse(visitJsonText);
    
    // Charger le nom de la visite
    visitName = visitData.name || 'Visite importée';
    document.getElementById('visit-name').value = visitName;
    
    // Charger les POIs
    pois = await Promise.all(visitData.pois.map(async (poiData, index) => {
      const poiFolder = `data/${poiData.id}`;
      const poi = {
        title: poiData.title,
        location: poiData.location,
        comment: poiData.comment || '',
        image: null,
        video: null,
        audio: null,
        details: []
      };
      
      // Extraire les fichiers médias si présents
      if (poiData.image) {
        const imageFile = zip.file(`${poiFolder}/Image.jpg`);
        if (imageFile) poi.image = await imageFile.async('blob');
      }
      if (poiData.video) {
        const videoFile = zip.file(`${poiFolder}/Video.mp4`);
        if (videoFile) poi.video = await videoFile.async('blob');
      }
      if (poiData.audio) {
        const audioFile = zip.file(`${poiFolder}/Audio.mp3`);
        if (audioFile) poi.audio = await audioFile.async('blob');
      }
      if (poiData.details > 0) {
        for (let i = 1; i <= poiData.details; i++) {
          const detailFile = zip.file(`${poiFolder}/Detail${i}.jpg`);
          if (detailFile) poi.details.push(await detailFile.async('blob'));
        }
      }
      
      return poi;
    }));
    
    // Passer à l'éditeur
    startEditor();
    alert('Visite importée avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'importation :', error);
    alert('Erreur lors de l\'importation du ZIP. Vérifiez le format.');
  }
  
  // Réinitialiser l'input file
  event.target.value = '';
}