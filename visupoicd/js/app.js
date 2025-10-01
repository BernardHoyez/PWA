document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('zipfile');
    
    input.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        
        const status = document.getElementById('status');
        status.textContent = 'Lecture du zip...';
        
        try {
            const { visit, mediaMap } = await handleZipFile(f);
            status.textContent = 'visit.json chargé (' + ((visit.pois || []).length) + ' POI)';
            
            window.visupoiData = { visit, mediaMap };
            
            initMap();
            renderPOIs(visit, mediaMap);
            startGeolocation();
        } catch (err) {
            status.textContent = 'Erreur: ' + (err && err.message ? err.message : err);
            console.error(err);
        }
    });

    const mapEl = document.getElementById('map');
    if (mapEl) {
        mapEl.addEventListener('dragover', (ev) => {
            ev.preventDefault();
        });
        
        mapEl.addEventListener('drop', async (ev) => {
            ev.preventDefault();
            const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
            if (!f) return;
            
            document.getElementById('status').textContent = 'Lecture du zip (drop)...';
            
            try {
                const { visit, mediaMap } = await handleZipFile(f);
                document.getElementById('status').textContent = 'visit.json chargé (' + ((visit.pois || []).length) + ' POI)';
                
                window.visupoiData = { visit, mediaMap };
                
                initMap();
                renderPOIs(visit, mediaMap);
                startGeolocation();
            } catch (err) {
                document.getElementById('status').textContent = 'Erreur: ' + (err && err.message ? err.message : err);
                console.error(err);
            }
        });
    }
});

window.addEventListener('unload', () => {
    try {
        const mm = window.visupoiData && window.visupoiData.mediaMap;
        if (mm) {
            for (const k in mm) {
                try {
                    URL.revokeObjectURL(mm[k]);
                } catch (e) {}
            }
        }
    } catch (e) {}
});