let map;
let userMarker;
let poiMarkers = [];
let pois = [];
let mediaMapGlobal = {};

function initMap() {
  map = L.map('map').setView([48.85, 2.35], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  userMarker = L.circleMarker([0,0], {
    radius: 10,
    color: 'red',
    fillColor: 'red',
    fillOpacity: 0.7
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      userMarker.setLatLng([lat, lon]);
    });
  }
}

function clearMarkers() {
  poiMarkers.forEach(m => map.removeLayer(m));
  poiMarkers = [];
}

function renderPOIs(poiList, mediaMap) {
  pois = poiList;
  mediaMapGlobal = mediaMap;
  clearMarkers();

  const grouped = {};
  pois.forEach(p => {
    const key = `${p.lat},${p.lon}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  let counter = 1;
  for (const key in grouped) {
    const group = grouped[key];
    const color = group.length > 1 ? 'red' : 'blue';
    const marker = L.marker([group[0].lat, group[0].lon], {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;">${counter}</div>`,
        iconSize: [24,24],
        iconAnchor: [12,12]
      })
    }).addTo(map);

    marker.on('click', () => {
      if (group.length === 1) {
        showPoiPopup(group[0], marker);
      } else {
        showPoiListPopup(group, marker);
      }
    });

    poiMarkers.push(marker);
    counter++;
  }
}

function showPoiPopup(poi, marker) {
  let html = `<h3>${escapeHtml(poi.title)}</h3>
              <p><b>Lat:</b> ${poi.lat.toFixed(6)}, <b>Lon:</b> ${poi.lon.toFixed(6)}</p>`;

  if (poi.comment) html += `<p>${escapeHtml(poi.comment)}</p>`;

  if (poi.image && mediaMapGlobal[poi.image.name]) {
    html += `<img src="${mediaMapGlobal[poi.image.name]}" 
                 alt="${escapeHtml(poi.title)}" 
                 class="popup-image">`;
  }

  if (poi.audio && mediaMapGlobal[poi.audio.name]) {
    html += `<audio controls src="${mediaMapGlobal[poi.audio.name]}"></audio>`;
  }

  if (poi.video && mediaMapGlobal[poi.video.name]) {
    html += `<video controls style="max-width:100%;" src="${mediaMapGlobal[poi.video.name]}"></video>`;
  }

  marker.bindPopup(html).openPopup();
}

function showPoiListPopup(group, marker) {
  let html = `<h3>POI multiples</h3><ul>`;
  group.forEach(p => {
    html += `<li><a href="#" class="poi-link" data-id="${p.id}">${escapeHtml(p.title)}</a></li>`;
  });
  html += `</ul>`;

  marker.bindPopup(html).openPopup();

  setTimeout(() => {
    document.querySelectorAll('.poi-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const id = e.target.dataset.id;
        const poi = group.find(p => p.id === id);
        if (poi) showPoiPopup(poi, marker);
      });
    });
  }, 100);
}
