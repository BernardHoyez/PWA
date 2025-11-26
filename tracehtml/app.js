async function generateHtml() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files && fileInput.files[0];
    if (!file) return alert("Aucun fichier sélectionné");

    // === 1. Chargement fiable de togeojson avec Promise + timeout ===
    if (!window.toGeoJSON) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Impossible de charger togeojson"));
            document.head.appendChild(script);

            // Timeout de sécurité (10 s max)
            setTimeout(() => reject(new Error("Timeout chargement togeojson")), 10000);
        });
    }

    // === 2. Lecture et conversion ===
    const text = await file.text();
    let geojson;
    try {
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        if (dom.querySelector('parsererror')) throw new Error('Fichier XML invalide');

        if (file.name.toLowerCase().endsWith('.gpx')) {
            geojson = window.toGeoJSON.gpx(dom);
        } else if (file.name.toLowerCase().endsWith('.kml')) {
            geojson = window.toGeoJSON.kml(dom);
        } else {
            throw new Error('Seuls les fichiers .gpx et .kml sont acceptés');
        }

        if (!geojson?.features?.length) throw new Error('Aucune trace trouvée dans le fichier');

    } catch (e) {
        throw new Error("Conversion échouée : " + e.message);
    }

    // === 3. Génération du HTML autonome ===
    const base = file.name.replace(/\.(kml|gpx)$/i, '');

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${file.name} – tracehtml</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#f8f9fa}
#map{height:75vh}
.header{padding:20px;background:#007bff;color:#fff;text-align:center}
.downloads{padding:15px;text-align:center;background:#fff}
button{margin:8px;padding:12px 24px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem}
button:hover{background:#0056b3}
</style>
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
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const layer = L.geoJSON(geojson, {style: {color: '#e74c3c', weight: 6, opacity: 0.9}});
layer.addTo(map);
map.fitBounds(layer.getBounds(), {padding: [50,50]});

function download(f){
    let data, name, type;
    if(f==='gpx'){data=togpx(geojson);name='${base}.gpx';type='application/gpx+xml';}
    else if(f==='kml'){data=tokml(geojson);name='${base}.kml';type='application/vnd.google-earth.kml+xml';}
    else{data=JSON.stringify(geojson,null,2);name='${base}.geojson';type='application/geo+json';}
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([data],{type}));
    a.download=name;
    a.click();
}
</script>
</body></html>`;

    // === 4. Téléchargement immédiat ===
    const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}-carte.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    fileInput.value = '';
}