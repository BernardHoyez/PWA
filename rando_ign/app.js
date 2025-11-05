let map = L.map('map').setView([44, 6], 13);
L.tileLayer(
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
  {
    minZoom: 0,
    maxZoom: 18,
    tileSize: 256,
    attribution: '&copy; IGN - <a href="https://www.ign.fr/">IGN France</a>'
  }
).addTo(map);

let watchId = null;
let track = [];
let startTime = null;
let totalDistance = 0;
let polyline = L.polyline([], { color: 'red' }).addTo(map);

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

document.getElementById('btnStart').onclick = () => {
  track = []; totalDistance = 0; startTime = Date.now();
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    if (track.length > 0) {
      totalDistance += haversine(track.at(-1).lat, track.at(-1).lon, latitude, longitude);
      document.getElementById('distance').textContent = totalDistance.toFixed(1);
    }
    track.push({ lat: latitude, lon: longitude, time: new Date().toISOString() });
    polyline.addLatLng([latitude, longitude]);
    map.setView([latitude, longitude]);
    document.getElementById('time').textContent = ((Date.now() - startTime)/1000).toFixed(0);
  }, console.error, { enableHighAccuracy: true });
};

document.getElementById('btnStop').onclick = () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  generateFiles();
};

async function generateFiles() {
  if (track.length < 2) return alert('Aucune trace');
  const gpx = '<?xml version="1.0"?><gpx version="1.1" creator="rando"><trk><trkseg>' +
    track.map(p => `<trkpt lat="${p.lat}" lon="${p.lon}"><time>${p.time}</time></trkpt>`).join('') +
    '</trkseg></trk></gpx>';
  const kml = '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>' +
    track.map(p => `${p.lon},${p.lat}`).join(' ') +
    '</coordinates></LineString></Placemark></Document></kml>';
  downloadFile('trace.gpx', gpx);
  downloadFile('trace.kml', kml);
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

document.getElementById('btnPhoto').onclick = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('Non supporté');
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const video = document.createElement('video');
  video.srcObject = stream; await video.play();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0);
  navigator.geolocation.getCurrentPosition(pos => {
    const text = pos.coords.latitude.toFixed(5) + ', ' + pos.coords.longitude.toFixed(5);
    ctx.fillStyle = 'yellow'; ctx.font = '30px sans-serif'; ctx.fillText(text, 20, canvas.height - 40);
    canvas.toBlob(b => downloadFile('photo_' + text.replace(/[, ]/g,'_') + '.jpg', b), 'image/jpeg');
  });
  stream.getTracks().forEach(t => t.stop());
};

let chunks = [];
let recorder = null;
document.getElementById('btnAudio').onclick = async () => {
  if (!recorder) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const coords = pos.coords.latitude.toFixed(6) + '_' + pos.coords.longitude.toFixed(6);
        downloadFile('audio_' + coords + '.webm', new Blob(chunks, { type: 'audio/webm' }));
        chunks = [];
      });
    };
    recorder.start();
    alert('Enregistrement audio en cours... Cliquez de nouveau pour arrêter.');
  } else {
    recorder.stop(); recorder = null;
  }
};
