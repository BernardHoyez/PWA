let map, userMarker;

function initMap() {
  map = L.map('map').setView([48.8566, 2.3522], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function addUserMarker(lat, lon) {
  if (userMarker) userMarker.setLatLng([lat, lon]);
  else {
    userMarker = L.circleMarker([lat, lon], {
      radius: 12,
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      className: 'pulse-marker'
    }).addTo(map);
  }
}

function addPOIMarker(poi, index, isComplex, onClick) {
  const color = isComplex ? 'red' : 'blue';
  const marker = L.marker([poi.lat, poi.lon], {
    icon: L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background:${color};color:white;border-radius:50%;width:24px;height:24px;
             line-height:24px;text-align:center;">${index}</div>`,
      iconSize: [24, 24]
    })
  }).addTo(map);
  marker.on('click', () => onClick(poi));
}
