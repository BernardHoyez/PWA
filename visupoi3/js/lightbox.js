document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbClose = lightbox.querySelector('.lightbox-close');

  // --- Afficher la lightbox avec une image ---
  function showLightbox(src) {
    lbImg.src = src;
    lightbox.classList.add('show');

    // Désactiver les interactions sur la carte tant que la lightbox est ouverte
    if (typeof map !== "undefined") {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    }
  }

  // --- Cacher la lightbox ---
  function hideLightbox() {
    lightbox.classList.remove('show');
    lbImg.src = '';

    // Réactiver toutes les interactions Leaflet
    if (typeof map !== "undefined") {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    }
  }

  // --- Gestion fermeture ---
  lbClose.addEventListener('click', hideLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      hideLightbox();
    }
  });

  // --- Interception clic sur images dans popup ---
  document.body.addEventListener('click', (e) => {
    const img = e.target.closest('img.popup-image');
    if (img && img.src) {
      showLightbox(img.src);
    }
  });
});
