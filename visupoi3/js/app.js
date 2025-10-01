document.addEventListener('DOMContentLoaded', () => {
  initMap();

  const fileInput = document.getElementById('zipFile');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleZip(file);
  });
});
