let map, pmtilesLayer;
let watchId = null;
let track = [];
let trackPolyline;

function initMap() {
  map = L.map('map').setView([46.5, 2], 6);
  L.control.scale().addTo(map);
}

async function pickPmtilesFile() {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'PMTiles files',
        accept: {'application/octet-stream': ['.pmtiles']}
      }],
      multiple: false
    });
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);

    if (pmtilesLayer) {
      map.removeLayer(pmtilesLayer);
    }

    pmtilesLayer = L.pmtiles({
      url: url,
      minZoom: 0,
      maxZoom: 14,
    });

    pmtilesLayer.addTo(map);
  } catch (e) {
    alert('Erreur lors du chargement du fichier PMTiles : ' + e.message);
  }
}

function startTracking() {
  if (!navigator.geolocation) {
    alert('Géolocalisation non supportée par ce navigateur.');
    return;
  }
  if (watchId) return;
  track = [];
  if (trackPolyline) {
    map.removeLayer(trackPolyline);
  }
  watchId = navigator.geolocation.watchPosition(pos => {
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    track.push(latlng);
    if (!trackPolyline) {
      trackPolyline = L.polyline(track, {color: 'red'}).addTo(map);
    } else {
      trackPolyline.setLatLngs(track);
    }
    map.panTo(latlng);
  }, err => alert('Erreur géolocalisation : ' + err.message), {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function exportGPX() {
  if (track.length === 0) {
    alert('Aucune trace enregistrée.');
    return;
  }
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="trekme">
    <trk><name>Trace GPX</name><trkseg>`;
  track.forEach(([lat, lng]) => {
    gpx += `<trkpt lat="${lat}" lon="${lng}"></trkpt>`;
  });
  gpx += `</trkseg></trk></gpx>`;

  const blob = new Blob([gpx], {type: 'application/gpx+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'trace.gpx';
  a.click();
  URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  document.getElementById('btnPickMap').addEventListener('click', pickPmtilesFile);
  document.getElementById('btnStart').addEventListener('click', startTracking);
  document.getElementById('btnStop').addEventListener('click', stopTracking);
  document.getElementById('btnExport').addEventListener('click', exportGPX);
});
