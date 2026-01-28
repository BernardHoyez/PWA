let map;

async function getElevation(lons, lats) {
    if (lons.length !== lats.length || lons.length === 0) {
        console.warn("Aucun point ou mismatch lon/lat");
        return [];
    }

    const delimiter = '|';
    const lonStr = lons.join(delimiter);
    const latStr = lats.join(delimiter);

    // URL corrigée (2024-2025) + resource obligatoire + zonly
    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?` +
                `lon=${encodeURIComponent(lonStr)}&` +
                `lat=${encodeURIComponent(latStr)}&` +
                `resource=rgealti&` +           // RGE Alti France – la plus précise
                `delimiter=${delimiter}&` +
                `zonly=true&` +                 // réponse légère : juste les z
                `indent=false`;

    console.log('→ Requête IGN envoyée :', url.substring(0, 300) + (url.length > 300 ? '...' : ''));

    try {
        const res = await fetch(url);
        console.log('Statut HTTP IGN :', res.status);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(`Erreur HTTP ${res.status} – ${text.substring(0, 200)}`);
            return Array(lons.length).fill(null);
        }

        const data = await res.json();
        console.log('Réponse IGN reçue :', data);

        if (data.elevations && Array.isArray(data.elevations) && data.elevations.length === lons.length) {
            const elevs = data.elevations.map(e => typeof e.z === 'number' ? e.z : null);
            console.log(`→ ${elevs.filter(e => e !== null).length} altitudes valides reçues`);
            return elevs;
        } else {
            console.error('Format inattendu ou nombre de points incorrect dans la réponse IGN', data);
            return Array(lons.length).fill(null);
        }
    } catch (err) {
        console.error('Exception lors du fetch IGN :', err.message);
        return Array(lons.length).fill(null);
    }
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getSlopeColor(slopePercent) {
    if (slopePercent < 5) return '#00ff00';    // vert
    if (slopePercent < 10) return '#ffff00';   // jaune
    if (slopePercent < 15) return '#ff8800';   // orange
    return '#ff0000';                          // rouge
}

function calculateStats(coords) {
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
        if (distKm < 0.0001) continue; // saut invalide

        distTotal += distKm;

        const deltaEle = ele2 - ele1;
        if (deltaEle > 0) dPlus += deltaEle;
        else if (deltaEle < 0) dMoins -= deltaEle;

        const slope = Math.abs(deltaEle / distM * 100); // %
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
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert('Sélectionne un fichier GPX ou KML');

    const mapType = document.getElementById('mapType').value;
    const results = document.getElementById('results');
    results.innerHTML = 'Traitement en cours... (regarde la console pour debug)';

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
                results.innerHTML = 'Format non supporté (GPX ou KML uniquement)';
                return;
            }

            let coords = geojson.features?.[0]?.geometry?.coordinates;
            if (!coords || coords.length < 2) {
                results.innerHTML = 'Aucun tracé valide trouvé dans le fichier';
                return;
            }

            // Forcer altitude 0 si absente
            coords = coords.map(c => [c[0], c[1], c.length > 2 && typeof c[2] === 'number' ? c[2] : 0]);

            // Stats avant correction
            const statsOriginal = calculateStats(coords);

            // Extraction pour IGN
            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            // Appel IGN (une seule requête maintenant)
            const elevsIGN = await getElevation(lons, lats);

            // Mise à jour + comptage corrections valides
            let correctedCount = 0;
            coords.forEach((c, i) => {
                if (elevsIGN[i] !== null && elevsIGN[i] !== undefined && !isNaN(elevsIGN[i])) {
                    c[2] = elevsIGN[i];
                    correctedCount++;
                }
            });

            // Stats après correction
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

            // Tracé coloré par pente (sur altitudes corrigées)
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

            // Affichage résultats
            let diffText = statsCorr.ibp < 40 ? 'Très facile' :
                           statsCorr.ibp < 60 ? 'Facile' :
                           statsCorr.ibp < 85 ? 'Modéré' :
                           statsCorr.ibp < 110 ? 'Difficile' :
                           statsCorr.ibp < 150 ? 'Très difficile' : 'Extrêmement difficile';

            results.innerHTML = `
<strong>Résultats</strong>

Points total : ${coords.length}
Points avec altitude IGN valide : ${correctedCount} (${Math.round(correctedCount / coords.length * 100)}%)

<strong>Avant correction (fichier original) :</strong>
Distance : ${statsOriginal.distTotal} km
D+ : ${statsOriginal.dPlus} m
D- : ${statsOriginal.dMoins} m
IBP approx : ${statsOriginal.ibp}

<strong>Après correction IGN :</strong>
Distance : ${statsCorr.distTotal} km
D+ : ${statsCorr.dPlus} m
D- : ${statsCorr.dMoins} m
IBP approx : ${statsCorr.ibp}
Difficulté estimée : ${diffText}

(Note : ouvre la console (F12) pour voir les logs détaillés de la requête IGN)
            `;

        } catch (err) {
            console.error(err);
            results.innerHTML = `Erreur pendant le traitement : ${err.message}`;
        }
    };
    reader.readAsText(file);
}