let map;

async function getElevation(lons, lats) {
    console.log('[IGN DEBUG] Début - Points totaux :', lons.length);
    if (lons.length !== lats.length || lons.length === 0) {
        console.warn('[IGN DEBUG] Pas de points ou mismatch lon/lat');
        return [];
    }

    const BATCH_SIZE = 400;   // Ajustable : 200 si toujours erreur, 500 si tout passe bien
    let allElevs = [];

    for (let start = 0; start < lons.length; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, lons.length);
        const batchLons = lons.slice(start, end);
        const batchLats = lats.slice(start, end);

        const delimiter = '|';
        const lonStr = batchLons.join(delimiter);
        const latStr = batchLats.join(delimiter);

        const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?` +
                    `lon=${encodeURIComponent(lonStr)}&` +
                    `lat=${encodeURIComponent(latStr)}&` +
                    `resource=ign_rge_alti_wld&` +
                    `delimiter=${delimiter}&` +
                    `zonly=true&indent=false`;

        console.log(`[IGN DEBUG] Batch ${Math.floor(start / BATCH_SIZE) + 1}/${Math.ceil(lons.length / BATCH_SIZE)} - ${batchLons.length} pts - URL:`, url.substring(0, 250) + '...');

        try {
            const res = await fetch(url);
            console.log(`[IGN DEBUG] Batch ${Math.floor(start / BATCH_SIZE) + 1} - Statut :`, res.status);

            if (!res.ok) {
                let errText = '';
                try { errText = await res.text(); } catch {}
                console.error(`[IGN DEBUG] Batch erreur HTTP ${res.status} :`, errText.substring(0, 300));
                allElevs = allElevs.concat(Array(batchLons.length).fill(null));
                continue;
            }

            const data = await res.json();
            console.log(`[IGN DEBUG] Batch réponse reçue - Clés :`, Object.keys(data));

            if (data.elevations && Array.isArray(data.elevations) && data.elevations.length === batchLons.length) {
                const batchElevs = data.elevations.map(e => (typeof e.z === 'number' && !isNaN(e.z)) ? e.z : null);
                allElevs = allElevs.concat(batchElevs);
                console.log(`[IGN DEBUG] Batch OK - Altitudes valides :`, batchElevs.filter(z => z !== null).length);
            } else {
                console.error('[IGN DEBUG] Format inattendu dans batch', data);
                allElevs = allElevs.concat(Array(batchLons.length).fill(null));
            }
        } catch (err) {
            console.error(`[IGN DEBUG] Batch fetch exception :`, err.message);
            allElevs = allElevs.concat(Array(batchLons.length).fill(null));
        }

        // Pause pour éviter blocage rate-limit IGN
        await new Promise(r => setTimeout(r, 800));  // 0.8 s
    }

    console.log('[IGN DEBUG] Fin - Total altitudes valides :', allElevs.filter(e => e !== null).length, '/', allElevs.length);
    return allElevs;
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getSlopeColor(slope) {
    if (slope < 5) return '#00ff00';
    if (slope < 10) return '#ffff00';
    if (slope < 15) return '#ff8800';
    return '#ff0000';
}

function calculateStats(coords) {
    console.log('[STATS DEBUG] Calcul stats - segments :', coords.length - 1);
    let distTotal = 0, dPlus = 0, dMoins = 0, steepBonus = 0;
    let highAltDist = 0, veryHighAltDist = 0;

    for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1, ele1] = coords[i];
        const [lon2, lat2, ele2] = coords[i + 1];

        const distM = haversine(lat1, lon1, lat2, lon2);
        if (distM < 1) continue;
        const distKm = distM / 1000;
        distTotal += distKm;

        const delta = ele2 - ele1;
        if (delta > 0) dPlus += delta;
        else dMoins -= delta;

        const slope = Math.abs(delta / distM * 100);
        if (slope > 8) steepBonus += distKm * (slope / 100) ** 2 * 0.5;

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
    console.log('[MAIN DEBUG] processFile démarré');
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert('Choisis un fichier GPX ou KML');

    const mapType = document.getElementById('mapType').value;
    const results = document.getElementById('results');
    results.innerHTML = 'Traitement en cours... (console F12 pour détails)';

    const reader = new FileReader();
    reader.onload = async (e) => {
        console.log('[MAIN DEBUG] Fichier lu');
        const content = e.target.result;
        let geojson;

        try {
            console.log('[MAIN DEBUG] Parsing GPX/KML...');
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
                console.error('[MAIN DEBUG] Pas de coords');
                return;
            }

            console.log('[MAIN DEBUG] Points extraits :', coords.length);
            coords = coords.map(c => [c[0], c[1], c[2] ?? 0]);

            console.log('[MAIN DEBUG] Calcul stats original...');
            const statsOriginal = calculateStats(coords);

            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            console.log('[MAIN DEBUG] Appel getElevation...');
            const elevsIGN = await getElevation(lons, lats);

            let correctedCount = 0;
            coords.forEach((c, i) => {
                if (elevsIGN[i] !== null && !isNaN(elevsIGN[i])) {
                    c[2] = elevsIGN[i];
                    correctedCount++;
                }
            });

            console.log('[MAIN DEBUG] Calcul stats corrigé...');
            const statsCorr = calculateStats(coords);

            // Carte
            if (map) map.remove();
            const centerLat = lats.reduce((a,b)=>a+b,0)/lats.length;
            const centerLon = lons.reduce((a,b)=>a+b,0)/lons.length;
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

            for (let i = 0; i < coords.length - 1; i++) {
                const p1 = coords[i];
                const p2 = coords[i + 1];
                const distM = haversine(p1[1], p1[0], p2[1], p2[0]);
                if (distM < 1) continue;
                const delta = p2[2] - p1[2];
                const pente = Math.abs(delta / distM * 100);
                L.polyline([[p1[1], p1[0]], [p2[1], p2[0]]], {
                    color: getSlopeColor(pente),
                    weight: 5
                }).addTo(map);
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
Points avec altitude IGN valide : ${correctedCount} (${Math.round(correctedCount / coords.length * 100)}%)

<strong>Original (fichier) :</strong>
Distance : ${statsOriginal.distTotal} km
D+ : ${statsOriginal.dPlus} m
D- : ${statsOriginal.dMoins} m
IBP approx : ${statsOriginal.ibp}

<strong>Corrigé IGN :</strong>
Distance : ${statsCorr.distTotal} km
D+ : ${statsCorr.dPlus} m
D- : ${statsCorr.dMoins} m
IBP approx : ${statsCorr.ibp}
Difficulté estimée : ${diffText}

(Console F12 pour voir les détails IGN)
            `;
        } catch (err) {
            console.error('[MAIN DEBUG] Erreur globale :', err);
            results.innerHTML = `Erreur : ${err.message} (console pour détails)`;
        }
    };
    reader.readAsText(file);
}