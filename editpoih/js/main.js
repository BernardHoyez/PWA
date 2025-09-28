// Gestion principale de l'app "editpoih" (PWA)
let pois = [];
let editingIndex = null;

// DOM elements
const poiListEl = document.getElementById('poi-list');
const addPoiBtn = document.getElementById('add-poi-btn');
const validateBtn = document.getElementById('validate-btn');
const exportBtn = document.getElementById('export-btn');
const visitTitleEl = document.getElementById('visit-title');
const importZipEl = document.getElementById('import-zip');

// POI inputs
const poiTitleEl = document.getElementById('poi-title');
const poiLatEl = document.getElementById('poi-lat');
const poiLonEl = document.getElementById('poi-lon');
const poiCommentEl = document.getElementById('poi-comment');
const poiImageEl = document.getElementById('poi-image');
const poiAudioEl = document.getElementById('poi-audio');
const poiVideoEl = document.getElementById('poi-video');

// Preview elements
const imagePreview = document.getElementById('image-preview');
const audioPreview = document.getElementById('audio-preview');
const videoPreview = document.getElementById('video-preview');

function clearPoiInputs() {
  poiTitleEl.value = '';
  poiLatEl.value = '';
  poiLonEl.value = '';
  poiCommentEl.value = '';
  poiImageEl.value = '';
  poiAudioEl.value = '';
  poiVideoEl.value = '';
  imagePreview.innerHTML = '';
  audioPreview.innerHTML = '';
  videoPreview.innerHTML = '';
  editingIndex = null;
}

// POI ID generator
function generatePoiId() {
  return 'poi-' + Date.now() + '-' + Math.floor(Math.random()*1000);
}

function updatePoiList() {
  poiListEl.innerHTML = '';
  pois.forEach((poi, idx) => {
    const li = document.createElement('li');
    li.textContent = poi.title || "(sans titre)";
    li.title = "Cliquer pour modifier ou supprimer";
    li.draggable = true;
    li.addEventListener('click', () => editPoi(idx));
    const delBtn = document.createElement('button');
    delBtn.textContent = "✖";
    delBtn.className = "secondary";
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if(confirm("Supprimer ce POI ?")) {
        pois.splice(idx, 1);
        updatePoiList();
      }
    });
    li.appendChild(delBtn);
    poiListEl.appendChild(li);
  });
}

// Drag'n'drop reorder
new Sortable(poiListEl, {
  animation: 150,
  onEnd: evt => {
    if(evt.oldIndex !== evt.newIndex) {
      const moved = pois.splice(evt.oldIndex, 1)[0];
      pois.splice(evt.newIndex, 0, moved);
      updatePoiList();
    }
  }
});

// Map (Leaflet)
let map = L.map('map').setView([48.858, 2.347], 5); // France
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OSM contributors'
}).addTo(map);

let marker = null;
map.on('click', function(e) {
  poiLatEl.value = e.latlng.lat.toFixed(6);
  poiLonEl.value = e.latlng.lng.toFixed(6);
  setMapMarker(e.latlng.lat, e.latlng.lng);
});
function setMapMarker(lat, lon) {
  if(marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
}

// Mise à jour du marker quand on modifie les champs
poiLatEl.addEventListener('change', () => {
  if (poiLatEl.value && poiLonEl.value) setMapMarker(poiLatEl.value, poiLonEl.value);
});
poiLonEl.addEventListener('change', () => {
  if (poiLatEl.value && poiLonEl.value) setMapMarker(poiLatEl.value, poiLonEl.value);
});

// Utiliser la localisation navigateur
document.getElementById('get-location').onclick = function() {
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      poiLatEl.value = pos.coords.latitude.toFixed(6);
      poiLonEl.value = pos.coords.longitude.toFixed(6);
      setMapMarker(pos.coords.latitude, pos.coords.longitude);
    });
  }
};

// Image EXIF: extraire GPS si dispo
poiImageEl.addEventListener('change', function() {
  imagePreview.innerHTML = '';
  let file = poiImageEl.files[0];
  if(file) {
    let img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    imagePreview.appendChild(img);

    EXIF.getData(file, function() {
      let lat = EXIF.getTag(this, "GPSLatitude");
      let lon = EXIF.getTag(this, "GPSLongitude");
      let latRef = EXIF.getTag(this, "GPSLatitudeRef");
      let lonRef = EXIF.getTag(this, "GPSLongitudeRef");
      if(lat && lon) {
        let latitude = lat[0] + lat[1]/60 + lat[2]/3600;
        let longitude = lon[0] + lon[1]/60 + lon[2]/3600;
        if(latRef === "S") latitude = -latitude;
        if(lonRef === "W") longitude = -longitude;
        poiLatEl.value = latitude.toFixed(6);
        poiLonEl.value = longitude.toFixed(6);
        setMapMarker(latitude, longitude);
      }
    });
  }
});

// Audio preview
poiAudioEl.addEventListener('change', function() {
  audioPreview.innerHTML = '';
  let file = poiAudioEl.files[0];
  if(file) {
    let audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(file);
    audio.onended = () => URL.revokeObjectURL(audio.src);
    audioPreview.appendChild(audio);
  }
});

// Video preview
poiVideoEl.addEventListener('change', function() {
  videoPreview.innerHTML = '';
  let file = poiVideoEl.files[0];
  if(file) {
    let video = document.createElement('video');
    video.controls = true;
    video.src = URL.createObjectURL(file);
    video.onended = () => URL.revokeObjectURL(video.src);
    videoPreview.appendChild(video);
  }
});

// Ajouter/éditer un POI
addPoiBtn.onclick = function() {
  if(!poiTitleEl.value.trim() || !poiLatEl.value || !poiLonEl.value) {
    alert("Titre et localisation obligatoires !");
    return;
  }
  let poi = {
    id: editingIndex!==null ? pois[editingIndex].id : generatePoiId(),
    title: poiTitleEl.value.trim(),
    lat: Number(poiLatEl.value),
    lon: Number(poiLonEl.value),
    comment: poiCommentEl.value.trim(),
    image: null,
    audio: null,
    video: null
  };
  // Charger fichiers
  let filePromises = [];
  let imgFile = poiImageEl.files[0];
  let audioFile = poiAudioEl.files[0];
  let videoFile = poiVideoEl.files[0];
  if(imgFile) {
    filePromises.push(readFileAsDataURL(imgFile).then(data => { poi.image = { name: imgFile.name, data }; }));
  }
  if(audioFile) {
    filePromises.push(readFileAsDataURL(audioFile).then(data => { poi.audio = { name: audioFile.name, data }; }));
  }
  if(videoFile) {
    filePromises.push(readFileAsDataURL(videoFile).then(data => { poi.video = { name: videoFile.name, data }; }));
  }
  Promise.all(filePromises).then(() => {
    if (editingIndex !== null) {
      pois[editingIndex] = poi;
    } else {
      pois.push(poi);
    }
    updatePoiList();
    clearPoiInputs();
  });
};

function editPoi(idx) {
  let poi = pois[idx];
  editingIndex = idx;
  poiTitleEl.value = poi.title;
  poiLatEl.value = poi.lat;
  poiLonEl.value = poi.lon;
  poiCommentEl.value = poi.comment || '';
  imagePreview.innerHTML = '';
  audioPreview.innerHTML = '';
  videoPreview.innerHTML = '';
  if (poi.image) {
    let img = document.createElement('img');
    img.src = poi.image.data;
    imagePreview.appendChild(img);
  }
  if (poi.audio) {
    let audio = document.createElement('audio');
    audio.controls = true;
    audio.src = poi.audio.data;
    audioPreview.appendChild(audio);
  }
  if (poi.video) {
    let video = document.createElement('video');
    video.controls = true;
    video.src = poi.video.data;
    videoPreview.appendChild(video);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// IMPORT ZIP
importZipEl.addEventListener('change', function() {
  const file = importZipEl.files[0];
  if(!file) return;
  JSZip.loadAsync(file).then(zip => {
    return zip.file("visit.json").async("string").then(txt => {
      let visit = JSON.parse(txt);
      visitTitleEl.value = visit.title;
      pois = visit.pois.map(poi => {
        let p = {...poi};
        // Charger fichiers binaires du zip
        let tasks = [];
        if(p.image && p.image.name) {
          tasks.push(zip.file("data/"+p.image.name).async("base64").then(b64 => {
            p.image.data = "data:image/jpeg;base64,"+b64;
          }));
        }
        if(p.audio && p.audio.name) {
          tasks.push(zip.file("data/"+p.audio.name).async("base64").then(b64 => {
            p.audio.data = "data:audio/mp3;base64,"+b64;
          }));
        }
        if(p.video && p.video.name) {
          tasks.push(zip.file("data/"+p.video.name).async("base64").then(b64 => {
            p.video.data = "data:video/mp4;base64,"+b64;
          }));
        }
        return Promise.all(tasks).then(()=>p);
      });
      return Promise.all(pois);
    });
  }).then(newPois => {
    pois = newPois;
    updatePoiList();
    alert("Importation terminée !");
  }).catch(err => {
    alert("Erreur d'importation : "+err);
  });
});

// EXPORT ZIP
exportBtn.onclick = function() {
  if(!visitTitleEl.value.trim()) {
    alert("Titre de la visite requis !");
    return;
  }
  if(pois.length === 0) {
    alert("Ajoutez au moins un POI !");
    return;
  }
  let zip = new JSZip();
  let dataFolder = zip.folder("data");
  let visit = {
    title: visitTitleEl.value.trim(),
    pois: pois.map(poi => {
      let p = {...poi};
      if(p.image) p.image = { name: p.image.name };
      if(p.audio) p.audio = { name: p.audio.name };
      if(p.video) p.video = { name: p.video.name };
      return p;
    })
  };
  // Ajouter fichiers binaires
  let filePromises = [];
  pois.forEach(poi => {
    if(poi.image) filePromises.push(dataFolder.file(poi.image.name, poi.image.data.split(',')[1], {base64:true}));
    if(poi.audio) filePromises.push(dataFolder.file(poi.audio.name, poi.audio.data.split(',')[1], {base64:true}));
    if(poi.video) filePromises.push(dataFolder.file(poi.video.name, poi.video.data.split(',')[1], {base64:true}));
  });
  zip.file("visit.json", JSON.stringify(visit, null, 2));
  zip.generateAsync({type:"blob"}).then(function(content) {
    let link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = visit.title.replace(/\W+/g,"_")+".zip";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
};

validateBtn.onclick = function() {
  if(!visitTitleEl.value.trim()) {
    alert("Titre de la visite requis !");
    return;
  }
  if(pois.length === 0) {
    alert("Ajoutez au moins un POI !");
    return;
  }
  alert("Visite validée ! Vous pouvez maintenant l'exporter.");
};

updatePoiList();