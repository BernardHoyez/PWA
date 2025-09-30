document.addEventListener('DOMContentLoaded', () => {
  initMap();
  trackUser();

  const input = document.getElementById('zipInput');
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const { visit, mediaMap } = await loadVisitFromZip(file);
    addPOIs(visit.pois, mediaMap);
  });
});
