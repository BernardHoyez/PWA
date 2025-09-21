let map;
let gpsMarker;
let pois = [];
let markers = [];
let gpsWatchId;
let gpsAccuracy = 0;

async function loadZip(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    const visitJsonFile = zip.file('visit.json');
    if (!visitJsonFile) return alert('Fichier visit.json manquant.');

    const visitJsonText = await visitJsonFile.async('text');
    const visitData = JSON.parse(visitJsonText);

    pois = await Promise.all(visitData.pois.map(async poiData => {
      const poiFolder = `data/${poiData.id}`;
      const poi = {
        id: poiData.id,
        title: await zip.file(`${poiFolder}/Titre.txt`)?.async('text') || poiData.title,
        location: await zip.file(`${poiFolder}/Localisation.txt`)?.async('text') || poiData.location,
        comment: await zip.file(`${poiFolder}/Commentaire.txt`)?.async('text') || poiData.comment || '',
        image: poiData.image ? await zip.file(`${poiFolder}/Image.jpg`)?.async('blob') : null,
        video: poiData.video ? await zip.file(`${poiFolder}/Video.mp4`)?.async('blob') : null,
        audio: poiData.audio ? await zip.file(`${poiFolder}/Audio.mp3`)?.async('blob') : null,
        details: []
      };

      if (poiData.details > 0) {
        for (let i = 1; i <= poiData.details; i++) {
          const detailFile = zip.file(`${poiFolder}/Detail${i}.jpg`);
          if (detailFile) poi.details.push(await detailFile.async('blob'));
        }
      }

      const [latStr, lonStr] = poi.location.split(', ');
      const lat = parseFloat(latStr.slice(0, -1)) * (latStr.endsWith('S') ? -1 : 1);
      const lon = parseFloat(lonStr.slice(0, -1)) * (lonStr.endsWith('W') ? -1 : 1);
      poi.coords = [lat, lon];

      return poi;
    }));

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('map-container').style.display = 'block';
    initMap();
    startGeolocation();
  } catch (error) {
    console.error('Erreur lors du chargement du ZIP :', error);
    alert('Erreur lors du chargement du ZIP.');
  }

  event.target.value = '';
}

function initMap() {
  map = L.map('map', { zoomControl: false }).setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const bounds = L.latLngBounds(pois.map(poi => poi.coords));
  map.fitBounds(bounds, { padding: [50, 50] });

  const groupedPois = groupPoisByCoords(pois);

  Object.entries(groupedPois).forEach(([key, group]) => {
    const [lat, lon] = key.split(',').map(Number);
    const marker = L.marker([lat, lon], { icon: createNumberedIcon(group[0].id) }).addTo(map);
    marker.on('click', () => showPopup(group));
    markers.push(marker);
  });
}

function groupPoisByCoords(pois) {
  return pois.reduce((acc, poi) => {
    const key = poi.coords.join(',');
    if (!acc[key]) acc[key] = [];
    acc[key].push(poi);
    return acc;
  }, {});
}

function createNumberedIcon(number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-number">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
}

function showPopup(group) {
  if (group.length === 1) {
    displayPoiDetails(group[0]);
  } else {
    const content = `<div class="popup-content"><h2>Points multiples</h2><ul>${group.map(poi => `<li onclick="displayPoiDetailsFromList(${poi.id})">${poi.title}</li>`).join('')}</ul></div>`;
    L.popup({ maxWidth: window.innerWidth * 0.85, className: 'custom-popup' })
      .setLatLng(group[0].coords)
      .setContent(content)
      .openOn(map);
  }
}

window.displayPoiDetailsFromList = function(id) {
  const poi = pois.find(p => p.id === id);
  if (poi) displayPoiDetails(poi);
  map.closePopup();
};

function displayPoiDetails(poi) {
  const distance = gpsMarker ? calculateDistance(gpsMarker.getLatLng(), { lat: poi.coords[0], lng: poi.coords[1] }) : 'N/A';
  const azimuth = gpsMarker ? calculateAzimuth(gpsMarker.getLatLng(), { lat: poi.coords[0], lng: poi.coords[1] }) : 'N/A';

  let content = `<div class="popup-content">
    <h2>${poi.title}</h2>
    <p>Coordonnées: ${poi.location}</p>
    <p>Distance: ${distance.toFixed(2)} m</p>
    <p>Azimut: Nord ${azimuth.toFixed(0)}°</p>
    <p>${poi.comment}</p>`;

  if (poi.image) content += `<img src="${URL.createObjectURL(poi.image)}" alt="Image principale" class="poi-media">`;
  if (poi.video) content += `<video src="${URL.createObjectURL(poi.video)}" controls class="poi-media"></video>`;
  if (poi.audio) content += `<audio src="${URL.createObjectURL(poi.audio)}" controls class="poi-media"></audio>`;
  if (poi.details.length) {
    content += '<div class="details-container">';
    poi.details.forEach(detail => {
      content += `<img src="${URL.createObjectURL(detail)}" alt="Détail" class="poi-detail">`;
    });
    content += '</div>';
  }

  content += '</div>';

  L.popup({ maxWidth: window.innerWidth * 0.85, className: 'custom-popup' })
    .setLatLng(poi.coords)
    .setContent(content)
    .openOn(map);
}

function calculateDistance(pos1, pos2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLon = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateAzimuth(pos1, pos2) {
  const dLon = (pos2.lng - pos1.lng) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(pos2.lat * Math.PI / 180);
  const x = Math.cos(pos1.lat * Math.PI / 180) * Math.sin(pos2.lat * Math.PI / 180) -
            Math.sin(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) * Math.cos(dLon);
  let azimuth = Math.atan2(y, x) * 180 / Math.PI;
  return (azimuth + 360) % 360;
}

function startGeolocation() {
  if (navigator.geolocation) {
    gpsWatchId = navigator.geolocation.watchPosition(updateGpsPosition, handleGpsError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    });
  } else {
    updateGpsStatus('GPS non supporté.');
  }
}

function updateGpsPosition(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  gpsAccuracy = position.coords.accuracy;

  if (!gpsMarker) {
    gpsMarker = L.circleMarker([lat, lon], {
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.5,
      radius: 10,
      className: 'gps-marker pulsing'
    }).addTo(map);
  } else {
    gpsMarker.setLatLng([lat, lon]);
  }

  updateGpsStatus(`GPS actif - Précision: ${gpsAccuracy.toFixed(0)} m`);
}

function handleGpsError(error) {
  let message = 'Erreur GPS: ';
  switch (error.code) {
    case error.PERMISSION_DENIED: message += 'Permission refusée.'; break;
    case error.POSITION_UNAVAILABLE: message += 'Position indisponible.'; break;
    case error.TIMEOUT: message += 'Délai dépassé.'; break;
    default: message += 'Inconnue.'; break;
  }
  updateGpsStatus(message);
}

function updateGpsStatus(status) {
  document.getElementById('gps-status').textContent = status;
}