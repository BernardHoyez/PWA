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

    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?` +
                `lon=${encodeURIComponent(lonStr)}&` +
                `lat=${encodeURIComponent(latStr)}&` +
                `resource=ign_rge_alti_wld&` +   // Changé en ign_rge_alti_wld (plus souvent cité dans docs récentes)
                `delimiter=${delimiter}&` +
                `zonly=true&indent=false`;

    console.log('[DEBUG] URL IGN construite :', url.substring(0, 300) + '...');

    try {
        console.log('[DEBUG] Lancement fetch...');
        const res = await fetch(url);
        console.log('[DEBUG] Statut HTTP :', res.status);

        if (!res.ok) {
            const text = await res.text().catch(() => 'Pas de texte');
            console.error('[DEBUG] Erreur HTTP :', res.status, text.substring(0, 200));
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
        console.error('[DEBUG] Exception fetch :', err.message);
        return Array(lons.length).fill(null);
    }
}

// ... (les autres fonctions haversine, getSlopeColor, calculateStats restent identiques)

async function processFile() {
    console.log('[DEBUG] processFile démarré');
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        console.warn('[DEBUG] Aucun fichier sélectionné');
        alert('Sélectionne un fichier GPX ou KML');
        return;
    }

    console.log('[DEBUG] Fichier chargé :', file.name, 'taille :', file.size);

    const mapType = document.getElementById('mapType').value;
    const results = document.getElementById('results');
    results.innerHTML = 'Traitement en cours... (console F12 pour détails)';

    const reader = new FileReader();
    reader.onload = async (e) => {
        console.log('[DEBUG] Lecture fichier terminée');
        const content = e.target.result;

        let geojson;
        try {
            console.log('[DEBUG] Tentative parsing GPX/KML');
            if (file.name.toLowerCase().endsWith('.gpx')) {
                const xml = new DOMParser().parseFromString(content, 'text/xml');
                geojson = toGeoJSON.gpx(xml);
            } else if (file.name.toLowerCase().endsWith('.kml')) {
                const xml = new DOMParser().parseFromString(content, 'text/xml');
                geojson = toGeoJSON.kml(xml);
            } else {
                results.innerHTML = 'Format non supporté';
                console.error('[DEBUG] Format invalide');
                return;
            }

            console.log('[DEBUG] GeoJSON obtenu :', geojson);

            let coords = geojson?.features?.[0]?.geometry?.coordinates;
            if (!coords || coords.length < 2) {
                results.innerHTML = 'Aucun tracé valide trouvé';
                console.error('[DEBUG] Pas de coords ou trop court');
                return;
            }

            console.log('[DEBUG] Nombre de points extraits :', coords.length);

            coords = coords.map(c => [c[0], c[1], c[2] ?? 0]);

            const statsOriginal = calculateStats(coords);
            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            const elevsIGN = await getElevation(lons, lats);

            let correctedCount = 0;
            coords.forEach((c, i) => {
                if (elevsIGN[i] !== null && !isNaN(elevsIGN[i])) {
                    c[2] = elevsIGN[i];
                    correctedCount++;
                }
            });

            const statsCorr = calculateStats(coords);

            // ... (le reste pour la carte et affichage résultats reste identique, comme dans la version précédente)

            // À la fin, ajoute :
            console.log('[DEBUG] Fin processFile - correctedCount :', correctedCount);

        } catch (err) {
            console.error('[DEBUG] Erreur globale dans processFile :', err);
            results.innerHTML = `Erreur : ${err.message} (détails en console)`;
        }
    };
    reader.readAsText(file);
    console.log('[DEBUG] Lecture fichier lancée');
}