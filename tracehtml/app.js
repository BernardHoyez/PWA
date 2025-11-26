async function generateHtml() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) return alert("Sélectionnez un fichier KML ou GPX");

    // Chargement de togeojson si pas encore fait
    if (!window.toGeoJSON) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
        document.head.appendChild(script);
        while (!window.toGeoJSON) await new Promise(r => setTimeout(r, 50));
        console.log("toGeoJSON chargé");
    }

    const text = await file.text();
    let geojson;

    try {
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        if (dom.querySelector('parsererror')) throw new Error('Fichier XML invalide');

        if (file.name.toLowerCase().endsWith('.gpx')) geojson = window.toGeoJSON.gpx(dom);
        else if (file.name.toLowerCase().endsWith('.kml')) geojson = window.toGeoJSON.kml(dom);
        else throw new Error('Extension non reconnue');

        if (!geojson.features?.length) throw new Error('Aucune trace trouvée');

    } catch (e) {
        return alert("Erreur de conversion :\n" + e.message);
    }

    const baseName = file.name.replace(/\.(kml|gpx)$/i, '');

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.name} – Carte OSM</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f8f9fa}
#map{height:75vh}.header{padding:1.5rem;background:#007bff;color:#fff;text-align:center}
.downloads{padding:1rem;text-align:center;background:#fff}
button{margin:8px;padding:12px 20px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem}
button:hover{background:#0056b3}</style>
</head><body>
<div class="header"><h1>${file.name}</h1></div>
<div id="map"></div>
<div class="downloads">
    <button onclick="download('gpx')">GPX</button>
    <button onclick="download('kml')">KML</button>
    <button onclick="download('geojson')">GeoJSON</button>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/togpx@0.5.4/togpx.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tokml@0.4.0/tokml.js"></script>
<script>
const geojson = ${JSON.stringify(geojson)};
const map = L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.geoJSON(geojson, {style:{color:'#e74c3c',weight:6}}).addTo(map);
map.fitBounds(L.geoJSON(geojson).getBounds(), {padding:[50,50]});
function download(f){let d,n,t;
if(f==='gpx'){d=togpx(geojson);n='${baseName}.gpx';t='application/gpx+xml';}
else if(f==='kml'){d=tokml(geojson);n='${baseName}.kml';t='application/vnd.google-earth.kml+xml';}
else{d=JSON.stringify(geojson,null,2);n='${baseName}.geojson';t='application/geo+json';}
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:t}));a.download=n;a.click();}
</script></body></html>`;

    const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${baseName}-carte.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);

    fileInput.value = '';
}