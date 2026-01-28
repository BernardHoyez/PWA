// --- Carte et fonds ---

let map = L.map('map').setView([44.0, 5.0], 11);

const osm = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }
);

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

osm.addTo(map);

L.control.layers(
  { 'OSM': osm, 'IGN Plan V2': ignPlan },
  {}
).addTo(map);

const fileInput = document.getElementById('fileInput');
let trackLayerGroup = L.layerGroup().addTo(map);

// --- Lecture fichier ---

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');

  let geojson;
  const name = file.name.toLowerCase();

  if (name.endsWith('.gpx')) {
    geojson = toGeoJSON.gpx(xml);
  } else if (name.endsWith('.kml')) {
    geojson = toGeoJSON.kml(xml);
  } else {
    alert('Format non supporté (GPX ou KML uniquement)');
    return;
  }

  handleTrackGeoJSON(geojson);
});

// --- Traitement de la trace ---

function handleTrackGeoJSON(geojson) {
  trackLayerGroup.clearLayers();

  const tracks = geojson.features.filter(f =>
    f.geometry &&
    (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
  );

  if (tracks.length === 0) {
    alert('Aucune trace <trk> trouvée dans ce fichier.');
    return;
  }

  // On prend la trace la plus longue
  const feature = tracks.reduce((a, b) => {
    const lenA = a.geometry.type === 'LineString'
      ? a.geometry.coordinates.length
      : a.geometry.coordinates.flat().length;
    const lenB = b.geometry.type === 'LineString'
      ? b.geometry.coordinates.length
      : b.geometry.coordinates.flat().length;
    return lenA > lenB ? a : b;
  });

  let coords;
  if (feature.geometry.type === 'LineString') {
    coords = feature.geometry.coordinates;
  } else {
    coords = feature.geometry.coordinates.flat();
  }

  const points = coords.map(c => ({
    lon: c[0],
    lat: c[1],
    ele: c[2] || 0
  }));

  if (points.length < 2) {
    alert('Trace trop courte.');
    return;
  }

  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const dist = haversine(p1.lat, p1.lon, p2.lat, p2.lon);
    const deltaZ = p2.ele - p1.ele;
    const slope = dist > 0 ? deltaZ / dist : 0;
    segments.push({ p1, p2, dist, deltaZ, slope });
  }

  const dplus = computeDplusSmoothed(points);
  document.getElementById('dplus').textContent = dplus.toFixed(0);

  drawColoredTrack(segments);

  const distanceKm = segments.reduce((s, seg) => s + seg.dist, 0) / 1000;
  const ibp = estimateIBP(distanceKm, dplus);
  document.getElementById('ibp').textContent = ibp.toFixed(0);
  document.getElementById('difficulty').textContent = ibpDifficulty(ibp);

  map.fitBounds(points.map(p => [p.lat, p.lon]));
}

// --- Outils géométriques ---

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Lissage altimétrique "IGN-like" ---

function medianFilter(values, windowSize = 9) {
  const half = Math.floor(windowSize / 2);
  const result = [];

  for (let i = 0; i < values.length; i++) {
    const window = [];
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < values.length) window.push(values[j]);
    }
    window.sort((a, b) => a - b);
    result.push(window[Math.floor(window.length / 2)]);
  }
  return result;
}

function movingAverage(values, windowSize = 7) {
  const half = Math.floor(windowSize / 2);
  const result = [];

  for (let i = 0; i < values.length; i++) {
    let sum = 0, count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < values.length) {
        sum += values[j];
        count++;
      }
    }
    result.push(sum / count);
  }
  return result;
}

function computeDplusSmoothed(points) {
  const raw = points.map(p => p.ele);

  const median = medianFilter(raw, 9);
  const smooth = movingAverage(median, 7);

  let dplus = 0;
  for (let i = 1; i < smooth.length; i++) {
    const dz = smooth[i] - smooth[i - 1];
    if (dz > 1) dplus += dz; // seuil 1 m pour éviter le bruit
  }
  return dplus;
}

// --- Couleur selon la pente ---

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

// --- IBP simplifié et calibrable ---

function estimateIBP(distanceKm, dplus) {
  // Formule simple, à ajuster avec tes valeurs de référence
  // Exemple de base : 0.25 * D+ + 2.5 * distance
  return 0.25 * dplus + 2.5 * distanceKm;
}

function ibpDifficulty(ibp) {
  if (ibp < 25)  return 'Très facile';
  if (ibp < 50)  return 'Facile';
  if (ibp < 75)  return 'Modérée';
  if (ibp < 100) return 'Difficile';
  if (ibp < 150) return 'Très difficile';
  return 'Extrême';
}

// --- Service worker ---

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PWA/randoibp/service-worker.js');
  });
}
