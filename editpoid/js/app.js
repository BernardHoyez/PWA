// ------ PWA install prompt ------
let deferredPrompt;
const installBtn = document.getElementById("install-btn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline";
});
installBtn?.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    installBtn.style.display = "none";
  }
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

// ------ State ------
let poiList = [];
let editIndex = null;
let visitTitle = '';
let loadedData = null;

// ------ DOM Elements ------
const visitTitleInput = document.getElementById('visit-title');
const importInput = document.getElementById('import-visit');
const importBtn = document.getElementById('import-btn');
const poiForm = document.getElementById('poi-form');
const poiTitle = document.getElementById('poi-title');
const poiLat = document.getElementById('poi-lat');
const poiLon = document.getElementById('poi-lon');
const poiComment = document.getElementById('poi-comment');
const poiImg = document.getElementById('poi-img');
const poiAudio = document.getElementById('poi-audio');
const poiVideo = document.getElementById('poi-video');
const imgPreview = document.getElementById('img-preview');
const audioPreview = document.getElementById('audio-preview');
const videoPreview = document.getElementById('video-preview');
const poiListEl = document.getElementById('poi-list');
const validateBtn = document.getElementById('validate-btn');
const downloadLink = document.getElementById('download-link');
const mapBtn = document.getElementById('map-btn');
const mapModal = document.getElementById('map-modal');
const closeMapBtn = document.getElementById('close-map');

// ------ Helper functions ------
function resetPOIForm() {
  poiForm.reset();
  imgPreview.innerHTML = '';
  audioPreview.innerHTML = '';
  videoPreview.innerHTML = '';
  editIndex = null;
}

function renderPOIList() {
  poiListEl.innerHTML = '';
  poiList.forEach((poi, idx) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.innerHTML = `<span>${poi.title}</span>
      <span>
        <button type="button" data-action="edit" data-idx="${idx}">✏️</button>
        <button type="button" data-action="del" data-idx="${idx}">🗑️</button>
      </span>`;
    poiListEl.appendChild(li);
  });
}

function updatePreview(input, previewDiv, type) {
  previewDiv.innerHTML = '';
  const file = input.files?.[0];
  if (!file) return;
  if (type === 'img') {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    previewDiv.appendChild(img);
  } else if (type === 'audio') {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(file);
    previewDiv.appendChild(audio);
  } else if (type === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.src = URL.createObjectURL(file);
    previewDiv.appendChild(video);
  }
}

function getNextPOIID() {
  return 'poi-' + (Date.now() + Math.floor(Math.random()*1000));
}

// ------ EXIF geolocation ------
poiImg.addEventListener('change', function () {
  updatePreview(poiImg, imgPreview, 'img');
  const file = poiImg.files?.[0];
  if (!file) return;
  EXIF.getData(file, function () {
    const lat = EXIF.getTag(this, "GPSLatitude");
    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
    const lon = EXIF.getTag(this, "GPSLongitude");
    const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
    if (lat && lon) {
      const decLat = dmsToDecimal(lat, latRef);
      const decLon = dmsToDecimal(lon, lonRef);
      poiLat.value = decLat;
      poiLon.value = decLon;
    }
  });
});

function dmsToDecimal(dms, ref) {
  // dms: [deg, min, sec]
  let v = dms[0] + dms[1]/60 + dms[2]/3600;
  if (ref === "S" || ref === "W") v *= -1;
  return Math.round(v * 1e6) / 1e6;
}

poiAudio.addEventListener('change', () => updatePreview(poiAudio, audioPreview, 'audio'));
poiVideo.addEventListener('change', () => updatePreview(poiVideo, videoPreview, 'video'));

// ------ Map modal with Leaflet ------
let map, mapMarker;
mapBtn.addEventListener('click', () => {
  mapModal.classList.add('active');
  setTimeout(() => initMap(), 100); // wait modal visible
});
closeMapBtn.addEventListener('click', () => {
  mapModal.classList.remove('active');
});
function initMap() {
  if (!map) {
    map = L.map('map').setView([48.858, 2.294], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM contributors'
    }).addTo(map);
    map.on('click', function(e) {
      if (mapMarker) map.removeLayer(mapMarker);
      mapMarker = L.marker(e.latlng).addTo(map);
      poiLat.value = e.latlng.lat;
      poiLon.value = e.latlng.lng;
    });
  }
}
mapModal.addEventListener('transitionend', () => {
  if (map) map.invalidateSize();
});

// ------ POI form submit ------
poiForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!poiTitle.value.trim() || !poiLat.value || !poiLon.value) {
    alert("Titre et coordonnées obligatoires");
    return;
  }
  let img = poiImg.files?.[0]
    ? await fileToObj(poiImg.files[0], 'image')
    : null;
  let audio = poiAudio.files?.[0]
    ? await fileToObj(poiAudio.files[0], 'audio')
    : null;
  let video = poiVideo.files?.[0]
    ? await fileToObj(poiVideo.files[0], 'video')
    : null;
  const poi = {
    id: editIndex !== null ? poiList[editIndex].id : getNextPOIID(),
    title: poiTitle.value,
    lat: parseFloat(poiLat.value),
    lon: parseFloat(poiLon.value),
    comment: poiComment.value,
    img,
    audio,
    video
  };
  if (editIndex !== null) {
    poiList[editIndex] = poi;
  } else {
    poiList.push(poi);
  }
  renderPOIList();
  resetPOIForm();
});

function fileToObj(file, type) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: type,
        data: reader.result.split(',')[1] // base64
      });
    };
    reader.readAsDataURL(file);
  });
}

// ------ POI list actions ------
poiListEl.addEventListener('click', function (e) {
  const idx = e.target.dataset.idx;
  if (e.target.dataset.action === 'edit') {
    const poi = poiList[idx];
    editIndex = idx;
    poiTitle.value = poi.title;
    poiLat.value = poi.lat;
    poiLon.value = poi.lon;
    poiComment.value = poi.comment || '';
    imgPreview.innerHTML = '';
    audioPreview.innerHTML = '';
    videoPreview.innerHTML = '';
    if (poi.img) {
      const img = document.createElement('img');
      img.src = "data:image/jpeg;base64," + poi.img.data;
      imgPreview.appendChild(img);
    }
    if (poi.audio) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = "data:audio/mp3;base64," + poi.audio.data;
      audioPreview.appendChild(audio);
    }
    if (poi.video) {
      const video = document.createElement('video');
      video.controls = true;
      video.src = "data:video/mp4;base64," + poi.video.data;
      videoPreview.appendChild(video);
    }
  }
  if (e.target.dataset.action === 'del') {
    poiList.splice(idx, 1);
    renderPOIList();
    resetPOIForm();
  }
});

// ------ Sortable.js (drag and drop) ------
Sortable.create(poiListEl, {
  animation: 150,
  onEnd: function (evt) {
    const [item] = poiList.splice(evt.oldIndex, 1);
    poiList.splice(evt.newIndex, 0, item);
    renderPOIList();
  }
});

// ------ Visit title ------
visitTitleInput.addEventListener('input', () => {
  visitTitle = visitTitleInput.value;
});

// ------ Export ZIP ------
validateBtn.addEventListener('click', async () => {
  if (!visitTitleInput.value.trim()) {
    alert('Veuillez indiquer le titre de la visite');
    return;
  }
  if (!poiList.length) {
    alert('Ajoutez au moins un POI');
    return;
  }
  const zip = new JSZip();
  let dataArr = [];
  for (const poi of poiList) {
    const id = poi.id;
    if (poi.img) {
      zip.file(`data/${id}_image.jpg`, b64toBlob(poi.img.data, 'image/jpeg'));
    }
    if (poi.audio) {
      zip.file(`data/${id}_audio.mp3`, b64toBlob(poi.audio.data, 'audio/mp3'));
    }
    if (poi.video) {
      zip.file(`data/${id}_video.mp4`, b64toBlob(poi.video.data, 'video/mp4'));
    }
    dataArr.push({
      id,
      title: poi.title,
      lat: poi.lat,
      lon: poi.lon,
      comment: poi.comment,
      img: poi.img ? `${id}_image.jpg` : null,
      audio: poi.audio ? `${id}_audio.mp3` : null,
      video: poi.video ? `${id}_video.mp4` : null
    });
  }
  zip.file('visit.json', JSON.stringify({
    title: visitTitleInput.value,
    pois: dataArr
  }, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = visitTitleInput.value.replace(/\W+/g, "_") + ".zip";
  downloadLink.style.display = 'inline';
  downloadLink.textContent = "Télécharger la visite";
  downloadLink.click();
});

// ------ Import ZIP ------
importBtn.addEventListener('click', async () => {
  const file = importInput.files?.[0];
  if (!file) return alert('Sélectionnez un fichier ZIP');
  const zip = await JSZip.loadAsync(file);
  const visitJson = await zip.file('visit.json').async('string');
  const visit = JSON.parse(visitJson);
  visitTitleInput.value = visit.title;
  visitTitle = visit.title;
  poiList = [];
  for (const poi of visit.pois) {
    let img = null, audio = null, video = null;
    if (poi.img && zip.file('data/' + poi.img)) {
      const data = await zip.file('data/' + poi.img).async('base64');
      img = { name: poi.img, type: 'image', data };
    }
    if (poi.audio && zip.file('data/' + poi.audio)) {
      const data = await zip.file('data/' + poi.audio).async('base64');
      audio = { name: poi.audio, type: 'audio', data };
    }
    if (poi.video && zip.file('data/' + poi.video)) {
      const data = await zip.file('data/' + poi.video).async('base64');
      video = { name: poi.video, type: 'video', data };
    }
    poiList.push({
      id: poi.id,
      title: poi.title,
      lat: poi.lat,
      lon: poi.lon,
      comment: poi.comment,
      img, audio, video
    });
  }
  renderPOIList();
  resetPOIForm();
  alert('Visite importée avec succès !');
});

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}