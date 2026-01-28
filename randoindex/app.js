let map;

async function getElevation(lons, lats) {
    console.log('[IGN] Début - Total points :', lons.length);
    if (lons.length !== lats.length || lons.length === 0) {
        console.warn('[IGN] Pas de points ou mismatch');
        return [];
    }

    const BATCH_SIZE = 200; // Petit pour éviter ERR_HTTP2_PROTOCOL_ERROR
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

        console.log(`[IGN] Batch ${Math.floor(start / BATCH_SIZE) + 1} - ${batchLons.length} pts - URL:`, url.substring(0, 200) + '...');

        try {
            const res = await fetch(url);
            console.log(`[IGN] Batch ${Math.floor(start / BATCH_SIZE) + 1} Statut :`, res.status, res.statusText);

            if (!res.ok) {
                let err = '';
                try { err = await res.text(); } catch {}
                console.error(`[IGN] Batch erreur HTTP ${res.status} :`, err.substring(0, 300));
                allElevs = allElevs.concat(Array(batchLons.length).fill(null));
                continue;
            }

            const data = await res.json();
            console.log(`[IGN] Batch réponse reçue - elevations length :`, data.elevations?.length || 'absent');

            if (data.elevations && Array.isArray(data.elevations) && data.elevations.length === batchLons.length) {
                const batchElevs = data.elevations.map(e => e.z ?? null);
                allElevs = allElevs.concat(batchElevs);
                console.log(`[IGN] Batch OK - ${batchElevs.filter(z => z !== null).length} altitudes valides`);
            } else {
                console.error('[IGN] Batch format invalide ou taille incorrecte', data);
                allElevs = allElevs.concat(Array(batchLons.length).fill(null));
            }
        } catch (err) {
            console.error(`[IGN] Batch fetch échoué :`, err.message);
            allElevs = allElevs.concat(Array(batchLons.length).fill(null));
        }

        // Pause plus longue pour éviter surcharge serveur
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes
    }

    console.log('[IGN] Fin - Total altitudes valides :', allElevs.filter(e => e !== null).length, '/', allElevs.length);
    return allElevs;
}

// Les autres fonctions restent identiques (haversine, getSlopeColor, calculateStats, processFile)
// ... colle-les du code précédent si besoin

// Exemple rapide pour tester seulement 200 points (optionnel, décommente pour debug) :
/*
async function processFile() {
    // ... ton code ...
    // Pour test : tronque à 200 points
    // lons = lons.slice(0, 200);
    // lats = lats.slice(0, 200);
    // coords = coords.slice(0, 200);
    // Puis continue normalement
}
*/