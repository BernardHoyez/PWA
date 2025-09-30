document.addEventListener('DOMContentLoaded', () => {
  initMap();
  trackUser();

  const input = document.getElementById('zipInput');
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { pois, mediaMap } = await loadVisitFromZip(file);
      console.log("POI chargés :", pois.length);
      addPOIs(pois, mediaMap);
    } catch (err) {
      console.error("Erreur de lecture du ZIP :", err);
      alert("Impossible de lire le fichier ZIP.");
    }
  });
});
