document.getElementById("file-input").addEventListener("change", handleZip);

function handleZip(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  JSZip.loadAsync(file).then(zip => {
    const mediaMap = {};

    // Charger les fichiers médias
    const promises = [];
    zip.forEach((path, file) => {
      if (!file.dir && path.startsWith("data/")) {
        promises.push(
          file.async("base64").then(content => {
            mediaMap[path] = "data:" + getMimeType(path) + ";base64," + content;
          })
        );
      }
    });

    Promise.all(promises).then(() => {
      // Charger visit.json
      return zip.file("visit.json").async("string");
    }).then(text => {
      const visit = JSON.parse(text);
      initMap();
      trackUser();
      addPOIs(visit.pois, mediaMap);
    });
  });
}

function getMimeType(path) {
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

// Gestion de la lightbox
document.addEventListener("click", e => {
  if (e.target.classList.contains("popup-image")) {
    const full = e.target.dataset.full;
    document.getElementById("lightbox-img").src = full;
    document.getElementById("lightbox").classList.remove("hidden");
  }
});

document.getElementById("lightbox-close").addEventListener("click", () => {
  document.getElementById("lightbox").classList.add("hidden");
});
