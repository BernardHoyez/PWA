const dropzone = document.getElementById('dropzone');
const mapDiv = document.getElementById('map');

let map, markers = [];

function initMap() {
  map = L.map('map').setView([50.04525, 1.32983], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function latLngFromString(loc) {
  // Parse "50.04525N, 1.32983E"
  const regex = /(\d+\.?\d*)N?,?\s*(\d+\.?\d*)E?/i;
  const matches = loc.match(regex);
  if (!matches) return null;
  return [parseFloat(matches[1]), parseFloat(matches[2])];
}

function getColor(poi) {
  const hasImage = poi.image;
  const hasVideo = poi.video;
  const hasAudio = poi.audio;

  if (hasImage && hasAudio && !hasVideo) return 'purple';
  if (hasImage && !hasAudio && !hasVideo) return 'blue';
  if (!hasImage && !hasAudio && hasVideo) return 'red';
  if (hasImage && !hasAudio && hasVideo) return 'darkred';
  if (!hasImage && hasAudio && !hasVideo) return 'violet';
  // default
  return 'gray';
}

function createMarker(poi, dataFolder) {
  const coords = latLngFromString(poi.location);
  if (!coords) return;

  // Custom colored icon (simple circle)
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <circle cx="12" cy="12" r="10" fill="${getColor(poi)}" stroke="black" stroke-width="2"/>
    </svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  const marker = L.marker(coords, {icon}).addTo(map);
  let popupContent = `<b>${poi.title}</b><br/>${poi.comment ? poi.comment + '<br/>' : ''}${poi.location}<br/>`;

  // Add media previews if available
  const poiId = poi.id.toString();

  if(poi.image) {
    const imagePath = `${poiId}/image.jpg`;
    popupContent += `<img src="" data-path="${imagePath}" alt="Image ${poi.title}" loading="lazy" class="poi-media">`;
  }
  if(poi.video) {
    const videoPath = `${poiId}/video.mp4`;
    popupContent += `<video controls preload="none" class="poi-media"><source src="" type="video/mp4" data-path="${videoPath}"></video>`;
  }
  if(poi.audio) {
    const audioPath = `${poiId}/audio.mp3`;
    popupContent += `<audio controls preload="none" class="poi-media"><source src="" type="audio/mpeg" data-path="${audioPath}"></audio>`;
  }

  marker.bindPopup(popupContent);
  markers.push(marker);
}

function loadMediaFromZip(zip, poi) {
  const poiId = poi.id.toString();
  const folder = zip.folder(poiId);
  if (!folder) return;

  // For each media type, replace src with blob URL if found
  function setMediaSrc(type, ext) {
    if (poi[type]) {
      const file = folder.file(`${type}.${ext}`);
      if (file) {
        file.async("blob").then(blob => {
          // Find element in all popups with matching data-path
          markers.forEach(marker => {
            const popup = marker.getPopup();
            if (!popup) return;
            const content = popup.getContent();
            if (content.includes(`${poiId}/${type}.${ext}`)) {
              const el = popup._contentNode.querySelector(`[data-path="${poiId}/${type}.${ext}"]`);
              if (el) {
                const url = URL.createObjectURL(blob);
                if (el.tagName === 'IMG' || el.tagName === 'SOURCE') {
                  el.src = url;
                }
              }
            }
          });
        });
      }
    }
  }
  setMediaSrc('image', 'jpg');
  setMediaSrc('video', 'mp4');
  setMediaSrc('audio', 'mp3');
}

function handleZipFile(file) {
  if (!file.name.endsWith('.zip')) {
    alert('Merci de fournir un fichier ZIP');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    JSZip.loadAsync(e.target.result).then(zip => {
      zip.file('visit.json').async('string').then(jsonStr => {
        const data = JSON.parse(jsonStr);
        map && map.remove();
        initMap();
        markers = [];

        if(!data.pois || !Array.isArray(data.pois)) {
          alert('Le fichier visit.json est invalide (absence de pois)');
          return;
        }

        data.pois.forEach(poi => {
          createMarker(poi, zip);
        });

        // Load media blobs and update popup sources
        data.pois.forEach(poi => {
          loadMediaFromZip(zip, poi);
        });

        // Adjust map to fit markers
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), {padding: [50, 50]});
      }).catch(() => alert('Fichier visit.json absent ou invalide dans le ZIP'));
    }).catch(() => alert('Erreur de lecture du fichier ZIP'));
  };
  reader.readAsArrayBuffer(file);
}

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = '#0077cc';
});
dropzone.addEventListener('dragleave', e => {
  e.preventDefault();
  dropzone.style.borderColor = '#666';
});
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.style.borderColor = '#666';
  if(e.dataTransfer.files.length) {
    handleZipFile(e.dataTransfer.files[0]);
  }
});
dropzone.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  input.onchange = () => {
    if (input.files.length > 0) {
      handleZipFile(input.files[0]);
    }
  };
  input.click();
});

initMap();
