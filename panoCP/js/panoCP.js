// js/panoCP.js

const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const runBtn = document.getElementById("run");
const filesInput = document.getElementById("files");
const previewScaleInput = document.getElementById("previewScale");

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Attendre que OpenCV soit prêt
function waitForOpenCV(callback) {
  if (typeof cv !== "undefined" && cv.Mat) {
    callback();
  } else {
    console.log("OpenCV.js pas encore prêt, nouvelle tentative...");
    setTimeout(() => waitForOpenCV(callback), 100);
  }
}

// Exemple de fonction de test
function testOpenCV() {
  setStatus("OpenCV est chargé !");
  console.log("Version OpenCV:", cv.getVersionString ? cv.getVersionString() : "fonction non dispo");
  // Petit test : créer une matrice vide
  const mat = new cv.Mat(100, 100, cv.CV_8UC3);
  console.log("Mat créée:", mat.rows, "x", mat.cols);
  mat.delete();
}

// Lancer ton code panoCP seulement quand cv est prêt
waitForOpenCV(() => {
  testOpenCV();

  runBtn.addEventListener("click", async () => {
    const files = filesInput.files;
    if (!files || files.length < 2) {
      setStatus("Ajoutez au moins deux images.");
      return;
    }
    setStatus("Assemblage en cours…");
    // Ici tu appelles ta fonction stitch() définie plus haut
    // await stitch(bitmaps, parseFloat(previewScaleInput.value));
  });
});
