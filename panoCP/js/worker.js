// js/worker.js

// Le worker reçoit des images (sous forme de ImageData ou ArrayBuffer) et renvoie
// les descripteurs + points clés pour chaque image, ou les correspondances entre deux images.

self.onmessage = function (e) {
  const { action, payload } = e.data;

  if (action === "detect") {
    // Détection de points clés et descripteurs
    const { imageData } = payload;
    const mat = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    const orb = new cv.ORB();
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();
    orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
    orb.delete();

    // Conversion des résultats en objets JS simples
    const kpArray = [];
    for (let i = 0; i < keypoints.size(); i++) {
      const kp = keypoints.get(i);
      kpArray.push({ x: kp.pt.x, y: kp.pt.y, size: kp.size, angle: kp.angle });
    }

    // Sérialiser les descripteurs en tableau
    const descArray = Array.from(descriptors.data);

    // Nettoyage
    mat.delete();
    gray.delete();
    keypoints.delete();
    descriptors.delete();

    self.postMessage({ action: "detectResult", keypoints: kpArray, descriptors: descArray });
  }

  if (action === "match") {
    // Appariement entre deux ensembles de descripteurs
    const { desc1, desc2 } = payload;

    // Reconstruire les Mats
    const d1 = cv.matFromArray(desc1.length / 32, 32, cv.CV_8U, desc1);
    const d2 = cv.matFromArray(desc2.length / 32, 32, cv.CV_8U, desc2);

    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
    const matches = new cv.DMatchVector();
    matcher.match(d1, d2, matches);
    matcher.delete();

    const matchArray = [];
    for (let i = 0; i < matches.size(); i++) {
      const m = matches.get(i);
      matchArray.push({ queryIdx: m.queryIdx, trainIdx: m.trainIdx, distance: m.distance });
    }

    d1.delete();
    d2.delete();
    matches.delete();

    self.postMessage({ action: "matchResult", matches: matchArray });
  }
};
