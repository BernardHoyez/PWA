let rawWaypoints = [];
let map, currentTrackLayer;

// Enregistrer le SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Étape 1 : Traitement des photos
async function processPhotos() {
  const input = document.getElementById('folderInput');
  const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));

  rawWaypoints = [];
  const listDiv = document.getElementById('rawList');
  listDiv.innerHTML = '';

  for (let file of files) {
    const waypoint = await createRawWaypoint(file);
    rawWaypoints.push(waypoint);

    const div = document.createElement('div');
    div.className = 'waypoint-item';
    div.innerHTML = `
      <img src="${waypoint.thumb}" class="thumbnail">
      <strong>${waypoint.name}</strong><br>
      <small>${file.name}</small>
    `;
    listDiv.appendChild(div);
  }

  alert(`${files.length} waypoints bruts créés !`);
}

// Création d'un waypoint brut
async function createRawWaypoint(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Thumbnail 100px
        const canvas = document.createElement('canvas');
        const ratio = 100 / img.width;
        canvas.width = 100;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumb = canvas.toDataURL('image/jpeg', 0.85);

        // Version optimisée < 500 Ko
        let quality = 0.9;
        let optimized = canvas.toDataURL('image/jpeg', quality);
        while (optimized.length > 500 * 1024 && quality > 0.5) {
          quality -= 0.05;
          optimized = canvas.toDataURL('image/jpeg', quality);
        }

        const waypoint = {
          originalName: file.name,
          name: file.name.replace(/\.(jpg|png)$/i, '').substring(0, 99),
          comment: `<p>Photo prise lors de la randonnée.</p>`,
          thumb: thumb,
          optimizedDataUrl: optimized,
          exif: null,
          lat: null,
          lon: null
        };

        // Lecture EXIF
        EXIF.getData(img, function() {
          waypoint.exif = EXIF.getAllTags(this);
          if (waypoint.exif.GPSLatitude) {
            // Conversion GPS EXIF (simplifié)
            const lat = exifToDecimal(waypoint.exif.GPSLatitude, waypoint.exif.GPSLatitudeRef);
            const lon = exifToDecimal(waypoint.exif.GPSLongitude, waypoint.exif.GPSLongitudeRef);
            if (lat && lon) waypoint.lat = lat; waypoint.lon = lon;
          }
          resolve(waypoint);
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function exifToDecimal(gps, ref) {
  if (!gps) return null;
  let decimal = gps[0] + gps[1]/60 + gps[2]/3600;
  if (ref === "S" || ref === "W") decimal = -decimal;
  return decimal;
}

// Sauvegarde du waypoint brut
function saveRaw(waypoint) {
  const data = JSON.stringify(waypoint, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = waypoint.originalName.replace(/\.(jpg|png)$/i, '') + '_raw.json';
  a.click();
}

// Fenêtres duales
function openDualWindows() {
  const dual = document.createElement('div');
  dual.id = 'dualPanel';
  dual.innerHTML = `
    <div id="map"></div>
    <div id="rawPanel"></div>
  `;
  document.body.appendChild(dual);

  // Carte Leaflet
  map = L.map('map').setView([46.5, 2.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Bouton pour IGN Plan V2 (exemple WMS simplifié, à adapter)
  // Vous pouvez ajouter un contrôle de couche

  // Liste draggable
  const rawPanel = document.getElementById('rawPanel');
  rawWaypoints.forEach((wp, i) => {
    const el = document.createElement('div');
    el.className = 'draggable';
    el.draggable = true;
    el.textContent = wp.name;
    el.dataset.index = i;

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', i);
    });

    rawPanel.appendChild(el);
  });

  // Drop sur la carte
  map.getContainer().addEventListener('drop', e => {
    e.preventDefault();
    const index = parseInt(e.dataTransfer.getData('text/plain'));
    const wp = rawWaypoints[index];

    const latlng = map.mouseEventToLatLng(e);
    wp.lat = latlng.lat;
    wp.lon = latlng.lng;

    alert(`Waypoint ${wp.name} géolocalisé à ${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}`);

    // Sauvegarde _loc
    saveLoc(wp);
  });

  map.getContainer().addEventListener('dragover', e => e.preventDefault());
}

function saveLoc(wp) {
  const locData = {
    name: wp.name,
    comment: wp.comment,
    lat: wp.lat,
    lon: wp.lon,
    photoOptimized: wp.optimizedDataUrl
  };
  const blob = new Blob([JSON.stringify(locData, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = wp.originalName.replace(/\.(jpg|png)$/i, '') + '_loc.json';
  a.click();
}