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
  const files = Object.keys(zip.files);

  const kmlName = files.find(f => f.endsWith(".kml"));
  if (!kmlName) {
    log.textContent += "❌ Aucun KML trouvé\n";
    return;
  }

  const kmlText = await zip.file(kmlName).async("text");

  log.textContent += `KML trouvé : ${kmlName}\n`;
  log.textContent += "⚠️ Aucun traitement encore appliqué (version minimale)\n";

  const newZip = new JSZip();
  newZip.file(kmlName, kmlText);

  const blob = await newZip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kmz2kml_result.kmz";
  a.click();

  log.textContent += "KMZ généré et téléchargé\n";
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
