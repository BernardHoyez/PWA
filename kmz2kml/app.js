const kmzInput = document.getElementById("kmzInput");
const processBtn = document.getElementById("processBtn");
const log = document.getElementById("log");

let kmzFile = null;

kmzInput.addEventListener("change", e => {
  kmzFile = e.target.files[0];
  if (kmzFile) {
    log.textContent = `KMZ chargé : ${kmzFile.name}`;
    processBtn.disabled = false;
  }
});

processBtn.addEventListener("click", async () => {
  if (!kmzFile) return;

  log.textContent = "Décompression du KMZ...\n";

  const zip = await JSZip.loadAsync(kmzFile);
  const newZip = new JSZip();

  const files = Object.keys(zip.files);

  for (const name of files) {
    const file = zip.files[name];

    if (file.dir) continue;

    if (name.match(/\.(jpg|jpeg|png)$/i)) {
      log.textContent += `Traitement image : ${name}\n`;

      const blob = await file.async("blob");
      const processed = await resizeImage(blob);

      newZip.file(name, processed);
    } else {
      // KML et autres fichiers copiés tels quels
      const content = await file.async("arraybuffer");
      newZip.file(name, content);
    }
  }

  log.textContent += "Recompression KMZ...\n";

  const outBlob = await newZip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(outBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kmz2kml_photos1080.kmz";
  a.click();

  log.textContent += "KMZ généré.\n";
});

/* --- Redimensionnement image --- */
function resizeImage(blob) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const max = 1080;
      let { width, height } = img;

      if (width > height && width > max) {
        height = Math.round(height * max / width);
        width = max;
      } else if (height > max) {
        width = Math.round(width * max / height);
        height = max;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => resolve(blob),
        "image/jpeg",
        0.85
      );
    };

    img.src = URL.createObjectURL(blob);
  });
}

/* --- Service Worker --- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
