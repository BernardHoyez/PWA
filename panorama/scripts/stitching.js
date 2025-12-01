/**
 * Applique l'égalisation d'histogramme sur le canal YCrCb.
 * @param {cv.Mat} src - Image source.
 * @returns {cv.Mat} - Image avec histogramme égalisé.
 */
function equalizeHistogramYCrCb(src) {
    if (!(src instanceof cv.Mat)) {
        throw new Error("La source doit être une instance de cv.Mat.");
    }

    const ycrcb = new cv.Mat();
    cv.cvtColor(src, ycrcb, cv.COLOR_RGBA2YCrCb);

    const channels = new cv.MatVector();
    cv.split(ycrcb, channels);

    // Vérifie que le canal Y existe
    if (channels.size() < 1) {
        throw new Error("Impossible de séparer les canaux YCrCb.");
    }

    cv.equalizeHist(channels.get(0), channels.get(0));
    cv.merge(channels, ycrcb);
    cv.cvtColor(ycrcb, src, cv.COLOR_YCrCb2RGBA);

    // Libère les ressources
    ycrcb.delete();
    channels.delete();

    return src;
}

/**
 * Assemble deux images en un panorama.
 * @param {Array<HTMLImageElement>} images - Tableau de deux images.
 * @returns {Promise<cv.Mat>} - Résultat de l'assemblage.
 */
export async function stitchImages(images) {
    return new Promise(async (resolve, reject) => {
        try {
            if (images.length < 2) {
                throw new Error("Au moins deux images sont requises pour l'assemblage.");
            }

            // Charge les images en cv.Mat
            const src1 = cv.imread(images[0]);
            const src2 = cv.imread(images[1]);

            if (!(src1 instanceof cv.Mat) || !(src2 instanceof cv.Mat)) {
                throw new Error("Impossible de charger les images en tant que cv.Mat.");
            }

            // Égalise l'histogramme
            equalizeHistogramYCrCb(src1);
            equalizeHistogramYCrCb(src2);

            // Détecte les points clés et descripteurs
            const orb = new cv.ORB(500);
            const kp1 = new cv.KeyPointVector();
            const kp2 = new cv.KeyPointVector();
            const desc1 = new cv.Mat();
            const desc2 = new cv.Mat();

            orb.detectAndCompute(src1, new cv.Mat(), kp1, desc1);
            orb.detectAndCompute(src2, new cv.Mat(), kp2, desc2);

            // Vérifie que des points clés ont été détectés
            if (kp1.size() === 0 || kp2.size() === 0) {
                throw new Error("Aucun point clé détecté dans une ou plusieurs images.");
            }

            // Match les descripteurs
            const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
            const matches = new cv.DMatchVectorVector();
            bf.knnMatch(desc1, desc2, matches, 2);

            // Filtre les bons matches
            const goodMatches = [];
            for (let i = 0; i < matches.size(); ++i) {
                const m = matches.get(i);
                if (m.length >= 2 && m[0].distance < 0.75 * m[1].distance) {
                    goodMatches.push(m[0]);
                }
            }

            if (goodMatches.length < 10) {
                throw new Error(`Pas assez de correspondances valides (${goodMatches.length} trouvés).`);
            }

            // Prépare les points pour l'homographie
            const srcPoints = new cv.Mat();
            const dstPoints = new cv.Mat();
            for (let i = 0; i < goodMatches.length; i++) {
                srcPoints.push_back(kp1.get(goodMatches[i].queryIdx).pt);
                dstPoints.push_back(kp2.get(goodMatches[i].trainIdx).pt);
            }

            // Calcule l'homographie
            const H = cv.findHomography(srcPoints, dstPoints, cv.RANSAC, 3.0);
            if (!H || H.empty()) {
                throw new Error("Impossible de calculer l'homographie.");
            }

            // Applique l'homographie
            const resultSize = new cv.Size(src1.cols + src2.cols, Math.max(src1.rows, src2.rows));
            const dst = new cv.Mat();
            cv.warpPerspective(src1, dst, H, resultSize);

            // Crée un masque pour la fusion
            const mask = new cv.Mat.zeros(dst.rows, dst.cols, cv.CV_8UC1);
            const roi = new cv.Rect(0, 0, src2.cols, src2.rows);
            mask.setTo(new cv.Scalar(255), roi);

            // Fusionne les images
            const result = new cv.Mat();
            cv.seamlessClone(src2, dst, mask, new cv.Point(dst.cols / 2, dst.rows / 2), result, cv.NORMAL_CLONE);

            // Libère les ressources
            src1.delete();
            src2.delete();
            kp1.delete();
            kp2.delete();
            desc1.delete();
            desc2.delete();
            matches.delete();
            srcPoints.delete();
            dstPoints.delete();
            dst.delete();
            mask.delete();
            H.delete();

            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}
