async function generateHtml() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) return alert('Sélectionnez un fichier KML ou GPX');

    // 1. Chargement garanti de togeojson
    if (!window.toGeoJSON) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
        document.head.appendChild(script);

        // Attente active que l'objet existe
        while (!window.toGeoJSON) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.log('toGeoJSON bien chargé');
    }

    // 2. Lecture du fichier
    let text;
    try {
        text = await file.text();
    } catch (e) {
        return alert('Impossible de lire le fichier');
    }

    // 3. Parsing KML / GPX → GeoJSON
    let geojson;
    try {
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        if (dom.querySelector('parsererror')) throw new Error('Fichier XML invalide');

        if (file.name.toLowerCase().endsWith('.gpx')) {
            geojson = window.toGeoJSON.gpx(dom);
        } else if (file.name.toLowerCase().endsWith('.kml')) {
            geojson = window.toGeoJSON.kml(dom);
        } else {
            throw new Error('Extension non reconnue');
        }

        if (!geojson.features?.length) throw new Error('Aucune trace détectée dans le fichier');

    } catch (err) {
        return alert('Erreur de conversion :\n' + err.message);
    }

    // 4. Nom de base sans extension
    const baseName = file.name.replace(/\.(kml|gpx)$/i, '');

    // 5. HTML autonome (tout fonctionne même hors ligne après 1er chargement)
    const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.name} – Carte OSM</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#f8f9fa}
#map{height:75vh}
.header{padding:1.5rem;background:#007bff;color:#fff;text-align:center}
.downloads{padding:1rem;text-align:center;background:#fff}
button{margin:8px;padding:12px 20px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem}
button:hover{background:#0056b3}
</style>
</head><body>
<div class="header"><h1>${file.name}</h1></div>
<div id="map"></div>
<div class="downloads">
    <button onclick="download('gpx')">Télécharger GPX</button>
    <button onclick="download('kml')">Télécharger KML</button>
    <button onclick="download('geojson')">Télécharger GeoJSON</button>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/togpx@0.5.4/togpx.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tokml@0.4.0/tokml.js"></script>
<script>
const geojson = ${JSON.stringify(geojson)};

const map = L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

L.geoJSON(geojson, {style: {color: '#e74c3c', weight: 6}}).addTo(map);
map.fitBounds(L.geoJSON(geojson).getBounds(), {padding: [50,50]});

function download(fmt) {
    let data, name, type;
    if (fmt==='gpx') { data = togpx(geojson); name='${baseName}.gpx'; type='application/gpx+xml'; }
    else if (fmt==='kml') { data = tokml(geojson); name='${baseName}.kml'; type='application/vnd.google-earth.kml+xml'; }
    else { data = JSON.stringify(geojson,null,2); name='${baseName}.geojson'; type='application/geo+json'; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type}));
    a.download = name;
    a.click();
}
</script>
</body></html>`;

    // 6. Téléchargement immédiat
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}-carte.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    fileInput.value = '';
}