// js/app.js - visupoi3

window.addEventListener("DOMContentLoaded", () => {
  const zipInput = document.getElementById("zipFile");
  if (!zipInput) {
    console.error("Élément #zipFile introuvable dans index.html");
    return;
  }

  zipInput.addEventListener("change", handleZipFile);

  async function handleZipFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);
      console.log("ZIP chargé :", file.name);

      // Lecture du fichier visit.json
      const visitFile = zip.file("visit.json");
      if (!visitFile) {
        alert("visit.json introuvable dans le ZIP !");
        return;
      }

      const visitContent = await visitFile.async("string");
      const visitData = JSON.parse(visitContent);
      console.log("visit.json chargé :", visitData);

      // Création d’une map des fichiers média
      const mediaMap = {};
      const dataFolder = zip.folder("data");
      if (dataFolder) {
        await Promise.all(
          Object.keys(dataFolder.files).map(async filename => {
            const fileData = await dataFolder.files[filename].async("blob");
            mediaMap[filename] = URL.createObjectURL(fileData);
          })
        );
      }

      // Appel à initMap défini dans map.js
      initMap(visitData, mediaMap);
    } catch (err) {
      console.error("Erreur lors du chargement du ZIP :", err);
      alert("Impossible de lire le fichier ZIP");
    }
  }

  // Gestion de la lightbox (affichage plein écran des images)
  document.addEventListener("click", e => {
    if (e.target.classList.contains("popup-image")) {
      const full = e.target.dataset.full;
      const lightbox = document.getElementById("lightbox");
      const img = document.getElementById("lightbox-img");
      img.src = full;
      lightbox.classList.remove("hidden");
    }
  });

  const closeBtn = document.getElementById("lightbox-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("lightbox").classList.add("hidden");
    });
  }
});
