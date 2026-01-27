// Initialisation de la carte
let map = L.map('map').setView([44.0, 5.0], 11);

// Fond OSM
const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }
);

// Fond IGN Plan V2 via Géoplateforme (sans clé API)
const ignPlan = L.tileLayer(
  'https://data.geopf.fr/wmts?' +
  'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&' +
  'LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&' +
  'TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&' +
  'FORMAT=image/png',
  {
    maxZoom: 18,
    attribution: '© IGN – Géoplateforme'
  }
);

// Fond par défaut
osm.addTo(map);

// Choix des fonds
L.control.layers(
  { 'OSM': osm, 'IGN Plan V2': ignPlan },
  {}
).addTo(map);

const fileInput = document.getElementById('fileInput');
let trackLayerGroup = L.layerGroup().addTo(map);

// Lecture GPX/KML
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');

  let geojson;
  if (file.name.endsWith('.gpx')) geojson = toGeoJSON.gpx(xml);
  else if (file.name.endsWith('.kml')) geojson = toGeoJSON.kml(xml);
  else return alert('Format non supporté');

  handleTrackGeoJSON(geojson);
});

// Traitement de la trace
function handleTrackGeoJSON(geojson) {
  trackLayerGroup.clearLayers();

  const feature = geojson.features.find(f =>
    f.geometry.type === 'LineString' ||
    f.geometry.type === 'MultiLineString'
  );

  let coords = feature.geometry.type === 'LineString'
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();

  const points = coords.map(c => ({
    lon: c[0],
    lat: c[1],
    ele: c[2] || 0
  }));

  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1], p2 = points[i];
    const dist = haversine(p1.lat, p1.lon, p2.lat, p2.lon);
    const deltaZ = p2.ele - p1.ele;
    const slope = dist > 0 ? deltaZ / dist : 0;
    segments.push({ p1, p2, dist, deltaZ, slope });
  }

  const dplus = smoothDplus(points);
  document.getElementById('dplus').textContent = dplus.toFixed(0);

  drawColoredTrack(segments);

  const ibp = estimateIBP(segments, dplus);
  document.getElementById('ibp').textContent = ibp.toFixed(0);
  document.getElementById('difficulty').textContent = ibpDifficulty(ibp);

  map.fitBounds(points.map(p => [p.lat, p.lon]));
}

// Haversine
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Lissage IGN simplifié
function smoothDplus(points) {
  const W = 11;
  const half = Math.floor(W/2);
  const smoothed = [];

  for (let i = 0; i < points.length; i++) {
    let sum = 0, count = 0;
    for (let j = i-half; j <= i+half; j++) {
      if (j >= 0 && j < points.length) {
        sum += points[j].ele;
        count++;
      }
    }
    smoothed.push(sum / count);
  }

  let dplus = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const dz = smoothed[i] - smoothed[i-1];
    if (dz > 0) dplus += dz;
  }
  return dplus;
}

// Couleur selon pente
function slopeColor(slope) {
  const pct = slope * 100;
  if (pct < -15) return '#0000ff';
  if (pct < -8)  return '#3366ff';
  if (pct < -3)  return '#66aaff';
  if (pct < 3)   return '#00ff00';
  if (pct < 8)   return '#ffff00';
  if (pct < 15)  return '#ff8800';
  return '#ff0000';
}

function drawColoredTrack(segments) {
  segments.forEach(seg => {
    L.polyline(
      [[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]],
      { color: slopeColor(seg.slope), weight: 4 }
    ).addTo(trackLayerGroup);
  });
}

// IBP approximatif
function estimateIBP(segments, dplus) {
  let dist = segments.reduce((s, x) => s + x.dist, 0) / 1000;
  let maxSlope = Math.max(...segments.map(s => Math.abs(s.slope))) * 100;

  return 0.8 * dplus + 10 * dist + 2 * maxSlope;
}

function ibpDifficulty(ibp) {
  if (ibp < 25) return 'Très facile';
  if (ibp < 50) return 'Facile';
  if (ibp < 75) return 'Modérée';
  if (ibp < 100) return 'Difficile';
  return 'Très difficile';
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/PWA/randoibp/service-worker.js');
}
