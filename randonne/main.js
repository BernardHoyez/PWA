const map = L.map('map').setView([46.5, 2.5], 6); // France center

const ignPlanV2 = L.tileLayer(
  'https://wxs.ign.fr/geoportail/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}',
  {
    maxZoom: 18,
    attribution: '&copy; IGN'
  }
).addTo(map);

let watchId = null;
let polyline = null;
let positions = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const info = document.getElementById('info');

function updateDistance() {
  let dist = 0;
  for (let i = 1; i < positions.length; i++) {
    dist += positions[i-1].distanceTo(positions[i]);
  }
  info.textContent = `Distance: ${dist.toFixed(0)} m`;
}

function onPosition(position) {
  const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
  positions.push(latlng);
  if (!polyline) {
    polyline = L.polyline(positions, {color: 'red'}).addTo(map);
  } else {
    polyline.setLatLngs(positions);
  }
  map.panTo(latlng);
  updateDistance();
  localStorage.setItem('randonne-trace', JSON.stringify(positions.map(p => [p.lat, p.lng])));
}

function startTracking() {
  if (!navigator.geolocation) {
    alert('Géolocalisation non supportée par votre navigateur');
    return;
  }
  startBtn.disabled = true;
  stopBtn.disabled = false;
  clearBtn.disabled = true;
  watchId = navigator.geolocation.watchPosition(onPosition, err => {
    alert('Erreur géolocalisation : ' + err.message);
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  clearBtn.disabled = false;
}

function clearTrace() {
  positions = [];
  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
  info.textContent = 'Distance: 0 m';
  localStorage.removeItem('randonne-trace');
}

startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopTracking);
clearBtn.addEventListener('click', clearTrace);

const saved = localStorage.getItem('randonne-trace');
if (saved) {
  const coords = JSON.parse(saved);
  positions = coords.map(c => L.latLng(c[0], c[1]));
  if (positions.length) {
    polyline = L.polyline(positions, {color: 'red'}).addTo(map);
    map.fitBounds(polyline.getBounds());
    updateDistance();
    clearBtn.disabled = false;
  }
}
