// Chargement dynamique de togeojson (nécessaire pour parser KML/GPX)
const togeojsonScript = document.createElement('script');
togeojsonScript.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
togeojsonScript.onload = () => console.log('togeojson chargé');
document.head.appendChild(togeojsonScript);

async function generateHtml() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Veuillez sélectionner un fichier KML ou GPX.');
        return;
    }

    const text = await file.text();

    let geojson;
    try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(text, 'text/xml');
        const parserError = dom.querySelector('parsererror');
        if (parserError) throw new Error('Fichier XML invalide');

        if (file.name.toLowerCase().endsWith('.gpx')) {
            geojson = toGeoJSON.gpx(dom);
        } else if (file.name.toLowerCase().endsWith('.kml')) {
            geojson = toGeoJSON.kml(dom);
        } else {
            throw new Error('Format non supporté (seuls .kml et .gpx)');
        }
    } catch (err) {
        alert('Erreur lors de la lecture du fichier :\n' + err.message);
        console.error(err);
        return;
    }

    // Contenu complet du fichier HTML autonome à générer
    const standaloneHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trace GPS – ${file.name}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-sA+Zcx8aW3a9debl9v2t7b3b3t3b3b3b3b3b3b3b3b3b" crossorigin=""/>
    <style>
        body { margin:0; font-family:system-ui,sans-serif; background:#f0f0f0; }
        #map { height:70vh; }
        .header { padding:1rem; background:#007bff; color:white; text-align:center; }
        .downloads { padding:1rem; text-align:center; background:white; }
        button { margin:0.5rem; padding:0.8rem 1.5rem; font-size:1rem; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer; }
        button:hover { background:#0056b3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trace GPS – ${file.name}</h1>
    </div>
    <div id="map"></div>
    <div class="downloads">
        <button onclick="download('gpx')">Télécharger GPX</button>
        <button onclick="download('kml')">Télécharger KML</button>
        <button onclick="download('geojson')">Télécharger GeoJSON</button>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-o9N1j3D1d2v1n1d2v1n1d2v1n1d2v1n1d2v1n1d2v1n1d2" crossorigin=""></script>
    <script src="https://cdn.jsdelivr.net/npm/togpx@0.5.4/togpx.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tokml@0.4.0/tokml.js"></script>
    <script>
        const geojson = ${JSON.stringify(geojson)};

        const map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const layer = L.geoJSON(geojson, {
            style: { color: '#e74c3c', weight: 5, opacity: 0.9 }
        }).addTo(map);

        map.fitBounds(layer.getBounds(), { padding: [50, 50] });

        function download(format) {
            let data, filename, type;
            if (format === 'gpx') {
                data = togpx(geojson);
                filename = 'trace.gpx';
                type = 'application/gpx+xml';
            } else if (format === 'kml') {
                data = tokml(geojson);
                filename = 'trace.kml';
                type = 'application/vnd.google-earth.kml+xml';
            } else {
                data = JSON.stringify(geojson, null, 2);
                filename = 'trace.geojson';
                type = 'application/geo+json';
            }
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        }
    </script>
</body>
</html>`;

    // Téléchargement du fichier HTML autonome
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trace-' + file.name.split('.').slice(0, -1).join('.') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Réinitialiser le champ fichier
    fileInput.value = '';
}