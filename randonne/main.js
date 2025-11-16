
let map;
let planLayer;
let orthoLayer;
let watchId = null;
let polyline = null;
let positions = [];
let selectedStartMarker = null;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const info = document.getElementById('info');

function setStatus(message) {
  if (info) info.textContent = message;
}

function initMap() {
  map = L.map('map', { preferCanvas: true }).setView([46.5, 2.5], 13);

  const planUrl =
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';

  const orthoUrl =
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';

  planLayer = L.tileLayer(planUrl, {
    tileSize: 256,
    maxZoom: 18,
    attribution: '&copy; IGN / GéoPlateforme - Plan IGN v2',
    crossOrigin: true,
  });

  orthoLayer = L.tileLayer(orthoUrl, {
    tileSize: 256,
    maxZoom: 18,
    attribution: '&copy; IGN / GéoPlateforme - Orthophotos',
    crossOrigin: true,
  });

  planLayer.addTo(map);

  L.control
    .layers({ 'Plan IGN v2': planLayer, 'Orthophoto IGN': orthoLayer }, null, {
      collapsed: false,
    })
    .addTo(map);

  map.on('click', (e) => {
    const lat = e.latlng.lat,
      lon = e.latlng.lng;

    const latEl = document.getElementById('lat'),
      lonEl = document.getElementById('lon');

    if (latEl) latEl.value = lat.toFixed(6);
    if (lonEl) lonEl.value = lon.toFixed(6);

    if (selectedStartMarker)
      selectedStartMarker.setLatLng([lat, lon]);
    else
      selectedStartMarker = L.marker([lat, lon], { opacity: 0.9 })
        .addTo(map)
        .bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")')
        .openPopup();

    setStatus('Point sélectionné (cliquer "Enregistrer point de départ")');
  });
}

function updateDistance() {
  let dist = 0;
  for (let i = 1; i < positions.length; i++) {
    dist += positions[i - 1].distanceTo(positions[i]);
  }
  setStatus(`Distance: ${dist.toFixed(0)} m`);
}

function onPosition(position) {
  const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
  positions.push(latlng);
  if (!polyline) {
    polyline = L.polyline(positions, { color: 'red' }).addTo(map);
  } else {
    polyline.setLatLngs(positions);
  }
  map.panTo(latlng);
  updateDistance();
  localStorage.setItem(
    'randonne-trace',
    JSON.stringify(positions.map((p) => [p.lat, p.lng]))
  );
}

function startTracking() {
  if (!navigator.geolocation) {
    alert('Géolocalisation non supportée par votre navigateur');
    return;
  }
  startBtn.disabled = true;
  stopBtn.disabled = false;
  clearBtn.disabled = true;
  watchId = navigator.geolocation.watchPosition(
    onPosition,
    (err) => {
      alert('Erreur géolocalisation : ' + err.message);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
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
  setStatus('Distance: 0 m');
  localStorage.removeItem('randonne-trace');
}

startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopTracking);
clearBtn.addEventListener('click', clearTrace);

// Initialisation de la carte au chargement
window.onload = () => {
  initMap();

  // Chargement du tracé sauvegardé
  const saved = localStorage.getItem('randonne-trace');
  if (saved) {
    const coords = JSON.parse(saved);
    positions = coords.map((c) => L.latLng(c[0], c[1]));
    if (positions.length) {
      polyline = L.polyline(positions, { color: 'red' }).addTo(map);
      map.fitBounds(polyline.getBounds());
      updateDistance();
      clearBtn.disabled = false;
    }
  }
};
