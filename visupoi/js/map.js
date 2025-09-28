// map.js – visupoi corrigé
// Gère la carte Leaflet, les POI et la position temps réel.

let map;
let userMarker;

// Initialisation de la carte
function initMap() {
  if (map) return; // évite double init

  map = L.map('map').setView([48.8566, 2.3522], 13); // centre par défaut

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Assure un recalcul après rendu complet du DOM
  setTimeout(() => map.invalidateSize(), 200);

  // Recalcule aussi lors d’un redimensionnement
  window.addEventListener('resize', () => {
    map.invalidateSize();
  });
}

// Affiche les POI
function renderPOIs(visit, mediaMap) {
  if (!map) return;

  const pois = visit.pois || [];
  const samePositionMap = {};

  // Regroupe les POI par position
  pois.forEach(p => {
    const key = `${p.lat.toFixed(6)}|${p.lon.toFixed(6)}`;
    samePositionMap[key] = samePositionMap[key] || [];
    samePositionMap[key].push(p);
  });

  pois.forEach((poi, idx) => {
    const key = `${poi.lat.toFixed(6)}|${poi.lon.toFixed(6)}`;
    const isComplex = samePositionMap[key].length > 1;
    const color = isComplex ? 'red' : 'blue';

    const marker = L.circleMarker([poi.lat, poi.lon], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindTooltip((idx + 1).toString(), { permanent: true, direction: 'center', className: 'poi-tooltip' });

    marker.on('click', () => {
      if (isComplex) {
        showComplexPopup(poi.lat, poi.lon, samePositionMap[key]);
      } else {
        showPoiPopup(poi, mediaMap);
      }
    });
  });
}

// Affiche la position temps réel du smartphone
function startGeolocation() {
  if (!map) return;
  if (!navigator.geolocation) return;

  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (!userMarker) {
      userMarker = L.circleMarker([latitude, longitude], {
        radius: 10,
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.6,
        className: 'pulse-marker'
      }).addTo(map);
    } else {
      userMarker.setLatLng([latitude, longitude]);
    }
  }, err => console.error(err), { enableHighAccuracy: true });
}

// Helpers pour les popups (inchangés ou adaptés)
function showPoiPopup(poi, mediaMap) {
  const htmlParts = [
    `<h3>${poi.title}</h3>`,
    `<div><b>Lat:</b> ${poi.lat}, <b>Lon:</b> ${poi.lon}</div>`
  ];
  if (poi.comment) htmlParts.push(`<p>${poi.comment}</p>`);
  if (poi.image && mediaMap[poi.image.name]) htmlParts.push(`<img src="${mediaMap[poi.image.name]}" style="max-width:100%;">`);
  if (poi.audio && mediaMap[poi.audio.name]) htmlParts.push(`<audio controls src="${mediaMap[poi.audio.name]}"></audio>`);
  if (poi.video && mediaMap[poi.video.name]) htmlParts.push(`<video controls style="max-width:100%;" src="${mediaMap[poi.video.name]}"></video>`);

  L.popup({ maxWidth: 300 })
    .setLatLng([poi.lat, poi.lon])
    .setContent(htmlParts.join(''))
    .openOn(map);
}

function showComplexPopup(lat, lon, list) {
  const html = list.map(p => `<div class="complex-item" onclick="window.showPoiPopup(${JSON.stringify(p)}, window.visupoiData.mediaMap)">${p.title}</div>`).join('');
  L.popup({ maxWidth: 250 })
    .setLatLng([lat, lon])
    .setContent(`<h4>POI multiples</h4>${html}`)
    .openOn(map);
}

// Rendre accessible showPoiPopup pour les appels onclick
window.showPoiPopup = showPoiPopup;
