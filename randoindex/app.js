let map;

function initMap(lat, lon, type) {
    map = L.map('map').setView([lat, lon], 13);
    if (type === 'osm') {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    } else {
        L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&FORMAT=image/png', {
            attribution: '&copy; IGN'
        }).addTo(map);
    }
}

async function getElevation(lons, lats) {
    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/elevation.json?lon=${lons.join('|')}&lat=${lats.join('|')}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.elevations.map(e => e.z); // z est l'altitude
}

async function calculateIBP(gpxContent, key) {
    if (!key) return { error: 'Clé API IBP requise' };
    const formData = new FormData();
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    formData.append('file', blob, 'track.gpx');
    formData.append('key', key);

    const response = await fetch('https://www.ibpindex.com/api/', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    if (data.error) return { error: data.error };
    return data.hiking; // Objet hiking avec ibp, etc.
}

function getColor(slope) {
    if (slope < 5) return 'green';
    if (slope < 10) return 'yellow';
    if (slope < 15) return 'orange';
    return 'red';
}

async function processFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert('Sélectionnez un fichier GPX ou KML');
    const mapType = document.getElementById('mapType').value;
    const ibpKey = document.getElementById('ibpKey').value;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const content = e.target.result;
        let geojson;
        if (file.name.endsWith('.gpx')) {
            const gpx = new DOMParser().parseFromString(content, 'text/xml');
            geojson = toGeoJSON.gpx(gpx);
        } else if (file.name.endsWith('.kml')) {
            const kml = new DOMParser().parseFromString(content, 'text/xml');
            geojson = toGeoJSON.kml(kml);
        } else {
            return alert('Format non supporté');
        }

        // Extraire points du track (assume premier feature)
        const coordinates = geojson.features[0].geometry.coordinates; // [lon, lat, elev?]
        let lons = [], lats = [];
        coordinates.forEach(coord => {
            lons.push(coord[0]);
            lats.push(coord[1]);
        });

        // Réévaluer altitudes (par batch de 100 pour éviter limites)
        let newElevs = [];
        for (let i = 0; i < lons.length; i += 100) {
            const batchLons = lons.slice(i, i + 100);
            const batchLats = lats.slice(i, i + 100);
            const elevs = await getElevation(batchLons, batchLats);
            newElevs = newElevs.concat(elevs);
        }

        // Mettre à jour coordinates avec new elevs
        coordinates.forEach((coord, idx) => {
            coord[2] = newElevs[idx];
        });

        // Init map au centre du track
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;
        initMap(centerLat, centerLon, mapType);

        // Tracer avec dégradé de couleur basé sur pente
        for (let i = 0; i < coordinates.length - 1; i++) {
            const p1 = coordinates[i];
            const p2 = coordinates[i + 1];
            const dist = L.latLng(p1[1], p1[0]).distanceTo(L.latLng(p2[1], p2[0]));
            const slope = Math.abs((p2[2] - p1[2]) / dist * 100); // % pente
            const color = getColor(slope);

            L.polyline([[p1[1], p1[0]], [p2[1], p2[0]]], { color }).addTo(map);
        }

        // Calcul IBP (utilise le contenu GPX original, mais avec elevs updatés ? Pour simplicité, on utilise original car API accepte GPX)
        const ibpData = await calculateIBP(content, ibpKey);
        let ibpText = '';
        if (ibpData.error) {
            ibpText = `Erreur IBP: ${ibpData.error}`;
        } else {
            const ibp = ibpData.ibp;
            let difficulty;
            if (ibp < 50) difficulty = 'Facile';
            else if (ibp < 75) difficulty = 'Moyen';
            else if (ibp < 100) difficulty = 'Difficile';
            else difficulty = 'Très difficile';
            ibpText = `Indice IBP: ${ibp} (${difficulty})`;
        }

        document.getElementById('results').innerHTML = `<p>${ibpText}</p>`;
    };
    reader.readAsText(file);
}