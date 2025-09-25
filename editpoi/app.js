// =====================
// app.js – editpoi PWA
// =====================

// Variables globales
let map, markers = [], pois = [], reference = {lat: 0, lon: 0}, useGPS = false;

// --- Initialisation de la carte Leaflet ---
function initMap() {
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Ajout de POI en cliquant sur la carte
  map.on('click', e => {
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lon').value = e.latlng.lng.toFixed(6);
    updateDistanceAzimut();
  });
}

// --- Gestion du mode référence fixe / GPS ---
function initMode() {
  document.querySelectorAll('input[name=\"refmode\"]').forEach(r => {
    r.addEventListener('change', e => {
      useGPS = (e.target.value === 'gps');
    });
  });
  document.getElementById('getpos').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        reference.lat = pos.coords.latitude;
        reference.lon = pos.coords.longitude;
        alert(`Position de référence mise à jour: ${reference.lat.toFixed(6)}, ${reference.lon.toFixed(6)}`);
      });
    }
  });
}

// --- Formulaire de création / modification ---
function initForm() {
  const form = document.getElementById('poiForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    savePOI();
  });
  document.getElementById('cancelEdit').addEventListener('click', () => {
    form.reset();
    document.getElementById('poiId').value = '';
  });

  ['lat','lon'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateDistanceAzimut);
  });

  // Prévisualisation média
  document.getElementById('image').addEventListener('change', e => {
    const f = e.target.files[0];
    const prev = document.getElementById('thumbPreview');
    prev.innerHTML = '';
    if (f) {
      const img = document.createElement('img');
      img.className = 'poi-thumb';
      img.src = URL.createObjectURL(f);
      prev.appendChild(img);

      // Lecture EXIF
      EXIF.getData(f, function() {
        const lat = EXIF.getTag(this, \"GPSLatitude\");
        const lon = EXIF.getTag(this, \"GPSLongitude\");
        const latRef = EXIF.getTag(this, \"GPSLatitudeRef\");
        const lonRef = EXIF.getTag(this, \"GPSLongitudeRef\");
        if (lat && lon) {
          const d2 = dmsToDecimal(lat, latRef);
          const d3 = dmsToDecimal(lon, lonRef);
          document.getElementById('lat').value = d2.toFixed(6);
          document.getElementById('lon').value = d3.toFixed(6);
          updateDistanceAzimut();
        }
      });
    }
  });

  document.getElementById('video').addEventListener('change', e => {
    const prev = document.getElementById('videoPreview');
    prev.innerHTML = '';
    if (e.target.files[0]) {
      const vid = document.createElement('video');
      vid.controls = true;
      vid.src = URL.createObjectURL(e.target.files[0]);
      vid.width = 200;
      prev.appendChild(vid);
    }
  });

  document.getElementById('audio').addEventListener('change', e => {
    const prev = document.getElementById('audioPreview');
    prev.innerHTML = '';
    if (e.target.files[0]) {
      const aud = document.createElement('audio');
      aud.controls = true;
      aud.src = URL.createObjectURL(e.target.files[0]);
      prev.appendChild(aud);
    }
  });
}

// Convertit EXIF DMS en décimal
function dmsToDecimal(dms, ref) {
  const d = dms[0].numerator / dms[0].denominator;
  const m = dms[1].numerator / dms[1].denominator;
  const s = dms[2].numerator / dms[2].denominator;
  let dec = d + m/60 + s/3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

// --- Calcul distance et azimut ---
function updateDistanceAzimut() {
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  if (isNaN(lat) || isNaN(lon)) return;
  const d = haversine(reference.lat, reference.lon, lat, lon);
  document.getElementById('distance').textContent = d.toFixed(1);
  const brg = bearing(reference.lat, reference.lon, lat, lon);
  document.getElementById('bearing').textContent = `N${brg.toFixed(1)}°`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI/180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function bearing(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI/180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2 - lon1));
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}

// --- Sauvegarde d’un POI ---
function savePOI() {
  const id = document.getElementById('poiId').value || Date.now().toString();
  const title = document.getElementById('title').value.trim();
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  const z = parseInt(document.getElementById('zIndex').value || '0', 10);
  const comment = document.getElementById('comment').value.trim();

  if (!title || isNaN(lat) || isNaN(lon)) {
    alert('Titre et coordonnées obligatoires');
    return;
  }

  const existing = pois.find(p => p.id === id);
  const media = {
    image: document.getElementById('image').files[0] || null,
    video: document.getElementById('video').files[0] || null,
    audio: document.getElementById('audio').files[0] || null
  };

  const poiData = {id, title, lat, lon, z, comment, media};

  if (existing) {
    Object.assign(existing, poiData);
  } else {
    pois.push(poiData);
  }

  renderPOIs();
  document.getElementById('poiForm').reset();
  document.getElementById('poiId').value = '';
}

// --- Affichage des POI et markers ---
function renderPOIs() {
  const list = document.getElementById('poiList');
  list.innerHTML = '';
  markers.forEach(m => m.remove());
  markers = [];

  pois.forEach(p => {
    const div = document.createElement('div');
    div.className = 'poi-item';
    const meta = document.createElement('div');
    meta.className = 'poi-meta';
    meta.textContent = `${p.title} (${p.lat.toFixed(4)}, ${p.lon.toFixed(4)})`;
    div.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'poi-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.onclick = () => editPOI(p.id);
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => { pois = pois.filter(x => x.id !== p.id); renderPOIs(); };
    actions.append(editBtn, delBtn);
    div.appendChild(actions);
    list.appendChild(div);

    const marker = L.marker([p.lat, p.lon], {zIndexOffset: p.z});
    marker.addTo(map).bindPopup(p.title);
    markers.push(marker);
  });
}

function editPOI(id) {
  const p = pois.find(x => x.id === id);
  if (!p) return;
  document.getElementById('poiId').value = p.id;
  document.getElementById('title').value = p.title;
  document.getElementById('lat').value = p.lat;
  document.getElementById('lon').value = p.lon;
  document.getElementById('zIndex').value = p.z;
  document.getElementById('comment').value = p.comment;
  updateDistanceAzimut();
}

// --- Export en ZIP ---
document.getElementById('validateVisit').addEventListener('click', async () => {
  if (!pois.length) { alert('Aucun POI'); return; }
  const zip = new JSZip();
  const dataFolder = zip.folder('data');
  const visit = { reference, pois: [] };

  for (const p of pois) {
    const pCopy = {...p};
    pCopy.media = {};
    for (const key of ['image','video','audio']) {
      if (p.media[key]) {
        const file = p.media[key];
        const arrbuf = await file.arrayBuffer();
        const fname = `${p.id}_${key}${file.name.slice(file.name.lastIndexOf('.'))}`;
        dataFolder.file(fname, arrbuf);
        pCopy.media[key] = fname;
      }
    }
    visit.pois.push(pCopy);
  }

  zip.file('visit.json', JSON.stringify(visit, null, 2));
  const blob = await zip.generateAsync({type:'blob'});
  saveAs(blob, 'visit.zip');
});

// --- Import d’un ZIP (bouton latéral) ---
document.getElementById('importZip').addEventListener('change', e => handleZipImport(e));

// --- Import d’un ZIP au démarrage (NOUVEAU) ---
document.getElementById('startupImport').addEventListener('change', e => handleZipImport(e));

async function handleZipImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const zip = await JSZip.loadAsync(file);
    if (!zip.files['visit.json']) throw new Error('visit.json manquant');
    const data = JSON.parse(await zip.files['visit.json'].async('string'));
    pois = data.pois || [];
    reference = data.reference || reference;
    renderPOIs();
    alert('Visite importée avec succès');
  } catch (err) {
    alert('Import échoué: ' + err.message);
  }
}

// --- Lancement ---
initMap();
initMode();
initForm();
