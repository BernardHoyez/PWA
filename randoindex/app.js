let map;

async function getElevation(lons, lats) {
    let newElevs = [];
    for (let i = 0; i < lons.length; i += 80) {  // batch ~80 pour sécurité
        const batchLons = lons.slice(i, i + 80).join('|');
        const batchLats = lats.slice(i, i + 80).join('|');
        const url = `https://data.geopf.fr/altimetrie/1.0/calcul/elevation.json?lon=${batchLons}&lat=${batchLats}`;
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                newElevs = newElevs.concat(data.elevations.map(e => e.z ?? 0));
            }
        } catch (e) {}
    }
    return newElevs;
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // mètres
}

function getSlopeColor(slopePercent) {
    if (slopePercent < 5) return '#00ff00';   // vert
    if (slopePercent < 10) return '#ffff00';  // jaune
    if (slopePercent < 15) return '#ff8800';  // orange
    return '#ff0000';                         // rouge
}

function calculateIBPApprox(coords) {
    let distTotal = 0;
    let dPlus = 0;
    let steepBonus = 0;
    let highAltDist = 0;
    let veryHighAltDist = 0;

    for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1, ele1] = coords[i];
        const [lon2, lat2, ele2] = coords[i + 1];

        const dist = haversine(lat1, lon1, lat2, lon2) / 1000; // km
        distTotal += dist;

        const deltaEle = ele2 - ele1;
        if (deltaEle > 0) dPlus += deltaEle;

        const slope = Math.abs(deltaEle / (dist * 1000) * 100); // %
        if (slope > 8) {
            steepBonus += dist * (slope / 100) ** 2 * 0.5;
        }

        const avgEle = (ele1 + ele2) / 2;
        if (avgEle > 1500) highAltDist += dist;
        if (avgEle > 2500) veryHighAltDist += dist;
    }

    const altBonus = (highAltDist / distTotal) * 15 + (veryHighAltDist / distTotal) * 30;
    const ibp = Math.round((dPlus / 100) + (distTotal * 2) + steepBonus + altBonus);

    return { ibp, distTotal: distTotal.toFixed(2), dPlus: Math.round(dPlus), steepBonus: Math.round(steepBonus) };
}

async function processFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert('Choisis un fichier GPX ou KML');

    const mapType = document.getElementById('mapType').value;
    const results = document.getElementById('results');
    results.innerHTML = 'Traitement en cours...';

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        let geojson;

        try {
            if (file.name.toLowerCase().endsWith('.gpx')) {
                geojson = toGeoJSON.gpx(new DOMParser().parseFromString(content, 'text/xml'));
            } else if (file.name.toLowerCase().endsWith('.kml')) {
                geojson = toGeoJSON.kml(new DOMParser().parseFromString(content, 'text/xml'));
            } else {
                results.innerHTML = 'Format non supporté';
                return;
            }

            const coords = geojson.features[0]?.geometry?.coordinates;
            if (!coords || coords.length < 2) {
                results.innerHTML = 'Aucun tracé valide trouvé';
                return;
            }

            // Extraction lon/lat
            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            // Altitudes IGN
            const elevsIGN = await getElevation(lons, lats);
            coords.forEach((c, i) => { if (elevsIGN[i] !== undefined) c[2] = elevsIGN[i]; });

            // Centre de la carte
            const centerLat = lats.reduce((a,b)=>a+b,0)/lats.length;
            const centerLon = lons.reduce((a,b)=>a+b,0)/lons.length;

            // Init carte
            if (map) map.remove();
            map = L.map('map').setView([centerLat, centerLon], 12);

            if (mapType === 'osm') {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);
            } else {
                L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&FORMAT=image/png', {
                    attribution: '© IGN Géoportail'
                }).addTo(map);
            }

            // Tracé segment par segment avec couleur pente
            for (let i = 0; i < coords.length - 1; i++) {
                const p1 = coords[i];
                const p2 = coords[i + 1];
                const distSegM = haversine(p1[1], p1[0], p2[1], p2[0]);
                const deltaEle = p2[2] - p1[2];
                const pente = Math.abs(deltaEle / distSegM * 100);

                L.polyline(
                    [[p1[1], p1[0]], [p2[1], p2[0]]],
                    { color: getSlopeColor(pente), weight: 5 }
                ).addTo(map);
            }

            // Zoom sur le tracé
            const bounds = coords.map(c => [c[1], c[0]]);
            map.fitBounds(bounds);

            // Calcul IBP approx
            const { ibp, distTotal, dPlus, steepBonus } = calculateIBPApprox(coords);

            let diffText = ibp < 40 ? 'Très facile' :
                           ibp < 60 ? 'Facile' :
                           ibp < 85 ? 'Modéré' :
                           ibp < 110 ? 'Difficile' :
                           ibp < 150 ? 'Très difficile' : 'Extrêmement difficile';

            results.innerHTML = `
<strong>Résultats (altitudes corrigées IGN)</strong>

Distance          : ${distTotal} km
D+                : ${dPlus} m
IBP approximé     : ${ibp}
Difficulté estimée: ${diffText}

(Note : cet IBP est une approximation maison car la formule officielle IBP est propriétaire.
Il est souvent proche de la valeur réelle pour les randos pédestres.)

Bonus pentes raides intégré : ~${steepBonus}
            `;
        } catch (err) {
            results.innerHTML = 'Erreur : ' + err.message;
        }
    };
    reader.readAsText(file);
}