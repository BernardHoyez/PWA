let map;
let userMarker;
const poiMarkers = [];

function initMap() {
  map = L.map('map').setView([48.86, 2.35], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
}

function addPOIs(pois, mediaMap) {
  // regroupement par lat/lon
  const group = {};
  pois.forEach(p => {
    const key = `${p.lat},${p.lon}`;
    (group[key] = group[key] || []).push(p);
  });

  Object.keys(group).forEach((k, i) => {
    const arr = group[k];
    const [lat, lon] = k.split(',').map(Number);
    const color = arr.length > 1 ? 'red' : 'blue';

    const marker = L.circleMarker([lat, lon], {
      color, radius: 8, fillOpacity: 0.9
    }).addTo(map);

    if (arr.length === 1) {
      marker.bindPopup(buildPopup(arr[0], mediaMap));
    } else {
      const list = arr.map(p =>
        `<li><a href="#" data-id="${p.id}">${p.title}</a></li>`).join('');
      marker.bindPopup(`<b>POI multiples</b><ul>${list}</ul>`);
      marker.on('popupopen', e => {
        e.popup.getElement().querySelectorAll('a').forEach(a => {
          a.addEventListener('click', ev => {
            ev.preventDefault();
            const poi = arr.find(p => p.id === a.dataset.id);
            marker.bindPopup(buildPopup(poi, mediaMap)).openPopup();
          });
        });
      });
    }
    poiMarkers.push(marker);
  });
}

function buildPopup(poi, mediaMap) {
  let html = `<h3>${poi.title}</h3>
              <p>${poi.lat.toFixed(5)}, ${poi.lon.toFixed(5)}</p>`;
  if (poi.comment) html += `<p>${poi.comment}</p>`;
  if (poi.image) html += `<img src="${mediaMap['data/'+poi.image.name]}" style="max-width:100%">`;
  if (poi.audio) html += `<audio controls src="${mediaMap['data/'+poi.audio.name]}"></audio>`;
  if (poi.video) html += `<video controls width="100%" src="${mediaMap['data/'+poi.video.name]}"></video>`;
  if (userMarker) {
    const dist = haversine(userMarker.getLatLng().lat, userMarker.getLatLng().lng, poi.lat, poi.lon);
    const az = azimut(userMarker.getLatLng().lat, userMarker.getLatLng().lng, poi.lat, poi.lon);
    html += `<p>Distance: ${dist.toFixed(0)} m<br>Azimut: ${az}</p>`;
  }
  return html;
}

function trackUser() {
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (!userMarker) {
      userMarker = L.circleMarker([latitude, longitude], {
        color: 'red', radius: 12, className: 'pulse'
      }).addTo(map);
    } else {
      userMarker.setLatLng([latitude, longitude]);
    }
  });
}
