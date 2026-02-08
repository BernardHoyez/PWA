const kmzInput = document.getElementById("kmzInput");
const processBtn = document.getElementById("processBtn");
const log = document.getElementById("log");
const editor = document.getElementById("editor");

let zipIn, kmlDoc, placemarks = [];
let imageBlobs = {};

/* ================================
   Chargement du KMZ
================================ */
kmzInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  log.textContent = "Chargement KMZ...\n";
  await new Promise(r => setTimeout(r, 50)); // force le rendu

  zipIn = await JSZip.loadAsync(file);

  await loadImages();

  const kmlName = Object.keys(zipIn.files).find(f => f.endsWith(".kml"));
  if (!kmlName) {
    log.textContent += "❌ KML introuvable\n";
    return;
  }

  const kmlText = await zipIn.file(kmlName).async("text");
  kmlDoc = new DOMParser().parseFromString(kmlText, "text/xml");

  loadPlacemarks();
  buildEditor();

  processBtn.disabled = false;
});

/* ================================
   Chargement des images du KMZ
   → indexées par nom de fichier
================================ */
async function loadImages() {
  imageBlobs = {};

  for (const name in zipIn.files) {
    if (name.match(/\.(jpg|jpeg|png)$/i)) {
      const shortName = name.split("/").pop();
      imageBlobs[shortName] = await zipIn.file(name).async("blob");
    }
  }

  log.textContent += `Images trouvées : ${Object.keys(imageBlobs).length}\n`;
}

/* ================================
   Lecture des Placemarks
================================ */
function loadPlacemarks() {
  placemarks = [...kmlDoc.querySelectorAll("Placemark")].map(pm => {
    const nameEl = pm.querySelector("name");
    const descEl = pm.querySelector("description");
    const hrefRaw = pm.querySelector("href")?.textContent || "";
    const imageName = hrefRaw.split("/").pop();

    return {
      pm,
      nameEl,
      descEl,
      name: nameEl?.textContent || "",
      comment: "",
      imag
