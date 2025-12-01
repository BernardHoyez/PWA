// js/panoCP.js

const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const runBtn = document.getElementById("run");
const filesInput = document.getElementById("files");
const previewScaleInput = document.getElementById("previewScale");

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Charger les images sélectionnées
async function loadImages(files) {
  const bitmaps = await Promise.all([...files].map((f) => createImageBitmap(f)));
  return bitmaps;
}

// Convertir un bitmap en Mat OpenCV
function bitmapToMat(bitmap, scale = 1.0) {
  const off = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  );
  const ctx = off.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, off.width, off.height);
  const imgData = ctx.getImageData(0, 0, off.width, off.height);
  return cv.matFromImageData(imgData);
}

// Conversion en niveaux de gris
function toGray(mat) {
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  return gray;
}

// Détection et description des points clés
function detectAndDescribe(gray) {
  const orb = new cv.ORB();
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();
  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
  orb.delete();
  return { keypoints, descriptors };
}

// Appariement des descripteurs
function matchDescriptors(desc1, desc2) {
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();
  matcher.match(desc1, desc2, matches);
  matcher.delete();

  const arr = [];
  for (let i = 0; i < matches.size(); i++) arr.push(matches.get(i));
  arr.sort((a, b) => a.distance - b.distance);

  const keep = Math.max(10, Math.floor(arr.length * 0.4));
  return arr.slice(0, keep);
}

// Calcul de l’homographie
function homographyFromMatches(kp1, kp2, matches) {
  const pts1 = [];
  const pts2 = [];
  matches.forEach((m) => {
    const p1 = kp1.get(m.queryIdx).pt;
    const p2 = kp2.get(m.trainIdx).pt;
    pts1.push(p1.x, p1.y);
    pts2.push(p2.x, p2.y);
  });
  const m1 = cv.matFromArray(matches.length, 1, cv.CV_32FC2, pts1);
  const m2 = cv.matFromArray(matches.length, 1, cv.CV_32FC2, pts2);
  const mask = new cv.Mat();
  const H = cv.findHomography(m2, m1, cv.RANSAC, 3, mask);
  m1.delete(); m2.delete(); mask.delete();
  return H;
}

// Compensation simple de luminosité
function exposureGain(baseGray, imgGray) {
  const baseMean = cv.mean(baseGray)[0];
  const imgMean = cv.mean(imgGray)[0];
  const gain = baseMean > 1 ? baseMean / Math.max(imgMean, 1) : 1;
  return Math.max(0.5, Math.min(2.0, gain));
}

function applyGain(mat, gain) {
  const out = new cv.Mat();
  cv.multiply(
    mat,
    new cv.Mat(mat.rows, mat.cols, mat.type(), new cv.Scalar(gain, gain, gain, 1)),
    out
  );
  return out;
}

// Assemblage panoramique
async function stitch(bitmaps, scale) {
  setStatus("Préparation des images…");
  const mats = bitmaps.map((b) => bitmapToMat(b, scale));
  const