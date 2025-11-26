async function generateHtml(file) {
  // 1. Chargement sécurisé de togeojson avec timeout (max 5s)
  if (!window.toGeoJSON) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
      script.onload = () => {
        // Double vérif que l'objet est bien exposé
        if (window.toGeoJSON) {
          resolve();
        } else {
          reject(new Error('toGeoJSON non disponible après chargement'));
        }
      };
      script.onerror = () => reject(new Error('Échec du chargement de togeojson'));
      document.head.appendChild(script);

      // Timeout de sécurité
      setTimeout(() => reject(new Error('Timeout de chargement')), 5000);
    });
  }

  // 2. Lecture du fichier
  let text;
  try {
    text = await file.text();
  } catch (e) {
    throw new Error('Impossible de lire le fichier : ' + e.message);
  }

  // 3. Parsing XML et conversion
  let geojson;
  try {
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const parserError = dom.querySelector('parsererror');
    if (parserError) {
      throw new Error('Fichier XML invalide ou mal formé');
    }

    if (file.name.toLowerCase().endsWith('.gpx')) {
      geojson = window.toGeoJSON.gpx(dom);
    } else if (file.name.toLowerCase().endsWith('.kml')) {
      geojson = window.toGeoJSON.kml(dom);
    } else {
      throw new Error('Format non supporté');
    }

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      throw new Error('Aucune trace GPS trouvée dans le fichier');
    }
  } catch (e) {
    throw new Error('Erreur de conversion : ' + e.message);
  }

  // 4. Génération du HTML autonome
  const baseName = file.name.replace(/\.(gpx|kml)$/i, '');

  const standaloneHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${file.name} – traceX</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #222; color: #fff; }
    #map { height: 100vh; }
    .panel { position: absolute; top: 10px; left: 10px; right: 10px; z-index: 1000; background: rgba(0,0,0,0.7); padding: 15px; border-radius: 12px; text-align: center; }
    button { margin: 5px; padding: 12px 20px; background: #e74c3c; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; }
    button:hover { background: #c0392b; }
  </style>
</head>
<body>
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
    const geojson = ${JSON.stringify(geojson)};
    const map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const layer = L.geoJSON(geojson, { style: { color: '#e74c3c', weight: 7, opacity: 0.9 } });
    layer.addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [50, 50] });

    function download(fmt) {
      let data, filename, mimeType;
      if (fmt === 'gpx') {
        data = togpx(geojson);
        filename = '${baseName}.gpx';
        mimeType = 'application/gpx+xml';
      } else if (fmt === 'kml') {
        data = tokml(geojson);
        filename = '${baseName}.kml';
        mimeType = 'application/vnd.google-earth.kml+xml';
      } else {
        data = JSON.stringify(geojson, null, 2);
        filename = '${baseName}.geojson';
        mimeType = 'application/geo+json';
      }
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;

  // 5. Téléchargement
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-traceX.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}