// js/panoCP.js

const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const runBtn = document.getElementById("run");
const filesInput = document.getElementById("files");

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Convertir un bitmap en Mat OpenCV
function bitmapToMat(bitmap) {
  const off = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = off.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, off.width, off.height);
  return cv.matFromImageData(imgData);
}

// Afficher une Mat sur le canvas
function showMatOnCanvas(mat, canvas, xOffset = 0) {
  let rgba = new cv.Mat();
  if (mat.channels() === 3) {
    cv.cvtColor(mat, rgba, cv.COLOR_BGR2RGBA);
  } else if (mat.channels() === 4) {
    cv.cvtColor(mat, rgba, cv.COLOR_RGBA2RGBA);
  } else {
    cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA);
  }

  let imgData = new ImageData(
    new Uint8ClampedArray(rgba.data),
    rgba.cols,
    rgba.rows
  );

  canvas.width = Math.max(canvas.width, xOffset + rgba.cols);
  canvas.height = Math.max(canvas.height, rgba.rows);

  let ctx = canvas.getContext("2d");
  ctx.putImageData(imgData, xOffset, 0);

  rgba.delete();
}

// Attendre que OpenCV soit prêt
function waitForOpenCV(callback) {
  if (typeof cv !== "undefined" && cv.Mat) {
    callback();
  } else {
    setTimeout(() => waitForOpenCV(callback), 100);
  }
}

waitForOpenCV(() => {
  runBtn.addEventListener("click", async () => {
    const files = filesInput.files;
    if (!files || files.length < 2) {
      setStatus("Ajoutez deux images.");
      return;
    }

    setStatus("Chargement des images…");
    const bitmaps = await Promise.all([...files].slice(0, 2).map(f => createImageBitmap(f)));
    const mats = bitmaps.map(b => bitmapToMat(b));

    // Canvas dimensionné pour afficher les deux images côte à côte
    canvas.width = mats[0].cols + mats[1].cols;
    canvas.height = Math.max(mats[0].rows, mats[1].rows);

    // Afficher les deux images
    showMatOnCanvas(mats[0], canvas, 0);
    showMatOnCanvas(mats[1], canvas, mats[0].cols);

    setStatus("Affichage terminé.");

    // Nettoyage
    mats.forEach(m => m.delete());
  });
});
