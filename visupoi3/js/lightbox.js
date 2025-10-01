document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbClose = lightbox.querySelector('.lightbox-close');

  // --- Afficher la lightbox avec une image ---
  function showLightbox(src) {
    lbImg.src = src;
    lightbox.classList.add('show');
  }

  // --- Cacher la lightbox ---
  function hideLightbox() {
    lightbox.classList.remove('show');
    lbImg.src = '';

    // ✅ Correction : redonner le focus à Leaflet après fermeture
    setTimeout(() => {
      if (typeof map !== "undefined" && map._onResize) {
        map._onResize(); // recalibre la carte et réactive les clics
      }
    }, 100);
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
