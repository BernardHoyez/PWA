let map;

async function getElevation(lons, lats) {
    console.log('[DEBUG] Début getElevation - Nombre de points :', lons.length);
    if (lons.length !== lats.length || lons.length === 0) {
        console.warn('[DEBUG] getElevation : mismatch ou 0 points');
        return [];
    }

    const delimiter = '|';
    const lonStr = lons.join(delimiter);
    const latStr = lats.join(delimiter);

    // URL actuelle Géoplateforme (2025) - resource ign_rge_alti_wld souvent plus stable
    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?` +
                `lon=${encodeURIComponent(lonStr)}&` +
                `lat=${encodeURIComponent(latStr)}&` +
                `resource=ign_rge_alti_wld&` +
                `delimiter=${delimiter}&` +
                `zonly=true&indent=false`;

    console.log('[DEBUG] URL IGN construite :', url.substring(0, 300) + '...');

    try {
        console.log('[DEBUG] Lancement fetch...');
        const res = await fetch(url);
        console.log('[DEBUG] Statut HTTP IGN :', res.status);

        if (!res.ok) {
            const text = await res.text().catch(() => 'Pas de texte');
            console.error('[DEBUG] Erreur HTTP IGN :', res.status, text.substring(0, 200));
            return Array(lons.length).fill(null);
        }

        const data = await res.json();
        console.log('[DEBUG] Réponse IGN brute :', data);

        if (data.elevations && Array.isArray(data.elevations)) {
            const elevs = data.elevations.map(e => e.z ?? null);
            console.log('[DEBUG] Altitudes valides reçues :', elevs.filter(e => e !== null).length);
            return elevs;
        } else {
            console.error('[DEBUG] Format réponse inattendu', data);
            return Array(lons.length).fill(null);
        }
    } catch (err) {
        console.error('[DEBUG] Exception fetch IGN :', err.message);
        return Array(lons.length).fill(null);
    }
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getSlopeColor(slopePercent) {
    if (slopePercent < 5) return '#00ff00';   // vert
    if (slopePercent < 10) return '#ffff00';  // jaune
    if (slopePercent < 15) return '#ff8800';  // orange
    return '#ff0000';                         // rouge
}

function calculateStats(coords) {
    console.log('[DEBUG] calculateStats appelé - Nb segments :', coords.length - 1);
    let distTotal = 0;
    let dPlus = 0;
    let dMoins = 0;
    let steepBonus = 0;
    let highAltDist = 0;
    let veryHighAltDist = 0;

    for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1, ele1] = coords[i];
        const [lon2, lat2, ele2] = coords[i + 1];

        const distM = haversine(lat1, lon1, lat2, lon2);
        const distKm = distM / 1000;
        if (distKm < 0.0001) continue;

        distTotal += distKm;

        const deltaEle = ele2 - ele1;
        if (deltaEle > 0) dPlus += deltaEle;
        else if (deltaEle < 0) dMoins -= deltaEle;

        const slope = Math.abs(deltaEle / distM * 100);
        if (slope > 8) {
            steepBonus += distKm * (slope / 100) ** 2 * 0.5;
        }

        const avgEle = (ele1 + ele2) / 2;
        if (avgEle > 1500) highAltDist += distKm;
        if (avgEle > 2500) veryHighAltDist += distKm;
    }

    const altBonus = distTotal > 0 ? (highAltDist / distTotal) * 15 + (veryHighAltDist / distTotal) * 30 : 0;
    const ibp = Math.round((dPlus / 100) + (distTotal * 2) + steepBonus + altBonus);

    return {
        ibp,
        distTotal: distTotal.toFixed(2),
        dPlus: Math.round(dPlus),
        dMoins: Math.round(dMoins),
        steepBonus: Math.round(steepBonus)
    };
}

async function processFile() {
    console.log('[DEBUG] processFile démarré');
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        console.warn('[DEBUG] Aucun fichier sélectionné');
        alert('Sélectionne un fichier GPX ou KML');
        return;
    }

    console.log('[DEBUG] Fichier :', file.name);

    const mapType = document.getElementById('mapType').value;
    const results = document.getElementById('results');
    results.innerHTML = 'Traitement en cours... (console F12 pour debug)';

    const reader = new FileReader();
    reader.onload = async (e) => {
        console.log('[DEBUG] Fichier lu');
        const content = e.target.result;
        let geojson;

        try {
            console.log('[DEBUG] Parsing GPX/KML...');
            if (file.name.toLowerCase().endsWith('.gpx')) {
                geojson = toGeoJSON.gpx(new DOMParser().parseFromString(content, 'text/xml'));
            } else if (file.name.toLowerCase().endsWith('.kml')) {
                geojson = toGeoJSON.kml(new DOMParser().parseFromString(content, 'text/xml'));
            } else {
                results.innerHTML = 'Format non supporté';
                return;
            }

            let coords = geojson?.features?.[0]?.geometry?.coordinates;
            if (!coords || coords.length < 2) {
                results.innerHTML = 'Aucun tracé valide trouvé';
                return;
            }

            console.log('[DEBUG] Points extraits :', coords.length);
            coords = coords.map(c => [c[0], c[1], c[2] ?? 0]);

            console.log('[DEBUG] Calcul stats original...');
            const statsOriginal = calculateStats(coords);

            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            console.log('[DEBUG] Appel getElevation...');
            const elevsIGN = await getElevation(lons, lats);

            let correctedCount = 0;
            coords.forEach((c, i) => {
                if (elevsIGN[i] !== null && !isNaN(elevsIGN[i])) {
                    c[2] = elevsIGN[i];
                    correctedCount++;
                }
            });

            console.log('[DEBUG] Calcul stats corrigé...');
            const statsCorr = calculateStats(coords);

            // Initialisation carte (comme avant)
            if (map) map.remove();
            const centerLat = lats.reduce((a,b)=>a+b,0)/lats.length;
            const centerLon = lons.reduce((a,b)=>a+b,0)/lons.length;
            map = L.map('map').setView([centerLat, centerLon], 12);

            if (mapType === 'osm') {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
            } else {
                L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&FORMAT=image/png', { attribution: '© IGN' }).addTo(map);
            }

            for (let i = 0; i < coords.length - 1; i++) {
                const p1 = coords[i];
                const p2 = coords[i + 1];
                const distM = haversine(p1[1], p1[0], p2[1], p2[0]);
                if (distM < 1) continue;
                const delta = p2[2] - p1[2];
                const pente = Math.abs(delta / distM * 100);
                L.polyline([[p1[1], p1[0]], [p2[1], p2[0]]], { color: getSlopeColor(pente), weight: 5 }).addTo(map);
            }

            map.fitBounds(coords.map(c => [c[1], c[0]]));

            let diffText = statsCorr.ibp < 40 ? 'Très facile' :
                           statsCorr.ibp < 60 ? 'Facile' :
                           statsCorr.ibp < 85 ? 'Modéré' :
                           statsCorr.ibp < 110 ? 'Difficile' :
                           statsCorr.ibp < 150 ? 'Très difficile' : 'Extrêmement difficile';

            results.innerHTML = `
<strong>Résultats</strong>

Points total : ${coords.length}
Points IGN valides : ${correctedCount} (${Math.round(correctedCount / coords.length * 100)}%)

<strong>Original :</strong>
Distance : ${statsOriginal.distTotal} km
D+ : ${statsOriginal.dPlus} m
D- : ${statsOriginal.dMoins} m
IBP approx : ${statsOriginal.ibp}

<strong>Corrigé IGN :</strong>
Distance : ${statsCorr.distTotal} km
D+ : ${statsCorr.dPlus} m
D- : ${statsCorr.dMoins} m
IBP approx : ${statsCorr.ibp}
Difficulté : ${diffText}

(Console pour debug IGN)
            `;

        } catch (err) {
            console.error('[DEBUG] Erreur globale :', err);
            results.innerHTML = `Erreur : ${err.message} (console pour détails)`;
        }
    };
    reader.readAsText(file);
}