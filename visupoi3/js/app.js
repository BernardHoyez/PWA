// app.js — orchestration principale

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('zipfile');
  const status = document.getElementById('status');

  if (!input) {
    console.error("⚠️ Élément #zipfile introuvable dans index.html");
    return;
  }

  input.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    status.textContent = 'Lecture du zip...';

    try {
      const { visit, mediaMap } = await handleZipFile(f);

      // sauvegarde globale utile pour debug
      window.visupoiData = { visit, mediaMap };

      status.textContent = `visit.json chargé (${(visit.pois || []).length} POI)`;

      // initialise carte et POI
      if (!map) initMap();
      addPOIs(visit.pois || []);

    } catch (err) {
      status.textContent = 'Erreur: ' + (err && err.message ? err.message : err);
      console.error(err);
    }
  });

  // Drag & drop support
  const mapEl = document.getElementById('map');
  if (mapEl) {
    mapEl.addEventListener('dragover', (ev) => ev.preventDefault());
    mapEl.addEventListener('drop', async (ev) => {
      ev.preventDefault();
      const f = ev.dataTransfer?.files?.[0];
      if (!f) return;
      status.textContent = 'Lecture du zip (drop)...';
      try {
        const { visit, mediaMap } = await handleZipFile(f);
        window.visupoiData = { visit, mediaMap };
        status.textContent = `visit.json chargé (${(visit.pois || []).length} POI)`;
        if (!map) initMap();
        addPOIs(visit.pois || []);
      } catch (err) {
        status.textContent = 'Erreur: ' + (err && err.message ? err.message : err);
        console.error(err);
      }
    });
  }
});

// Nettoyage des objectURLs créés lors de la lecture du zip
window.addEventListener('unload', () => {
  try {
    const mm = window.visupoiData?.mediaMap;
    if (mm) {
      for (const k in mm) {
        try { URL.revokeObjectURL(mm[k]); } catch (e) {}
      }
    }
  } catch (e) { /* noop */ }
});
