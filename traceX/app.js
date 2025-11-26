async function generateHtml(file) {
  // Chargement unique de togeojson
  if (!window.toGeoJSON) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Erreur chargement togeojson'));
      document.head.appendChild(s);
    });
  }

  const text = await file.text();
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('Fichier invalide');

  const geojson = file.name.toLowerCase().endsWith('.gpx')
    ? window.toGeoJSON.gpx(dom)
    : window.toGeoJSON.kml(dom);

  if (!geojson.features?.length) throw new Error('Aucune trace trouvée');

  const base = file.name.replace(/\.(gpx|kml)$/i, '');

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${file.name} – traceX</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  body{margin:0;font-family:system-ui;background:#222;color:#fff}
  #map{height:100vh}
  .panel{position:absolute;top:10px;left:10px;right:10px;z-index:1000;background:rgba(0,0,0,.7);padding:15px;border-radius:12px;text-align:center}
  button{margin:5px;padding:12px 20px;background:#e74c3c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1.1em}
  button:hover{background:#c0392b}
</style>
</head><body>
<div id="map"></div>
<div class="panel">
  <h2>${file.name}</h2>
  <button onclick="download('gpx')">GPX</button>
  <button onclick="download('kml')">KML</button>
  <button onclick="download('geojson')">GeoJSON</button>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/togpx@0.5.4/togpx.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tokml@0.4.0/tokml.js"></script>
<script>
const g = ${JSON.stringify(geojson)};
const map = L.map('map').fitBounds(L.geoJSON(g).getBounds(), {padding:[50,50]});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
L.geoJSON(g, {style:{color:'#e74c3c',weight:7,opacity:0.9}}).addTo(map);

function download(f){
  let data, name = '${base}', type;
  if(f==='gpx'){data=togpx(g);name+='.gpx';type='application/gpx+xml';}
  else if(f==='kml'){data=tokml(g);name+='.kml';type='application/vnd.google-earth.kml+xml';}
  else{data=JSON.stringify(g,null,2);name+='.geojson';type='application/geo+json';}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type}));
  a.download=name;
  a.click();
}
</script>
</body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}-traceX.html`;
  a.click();
  URL.revokeObjectURL(url);
}