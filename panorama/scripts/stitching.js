/**
 * Applique l'égalisation d'histogramme sur le canal YCrCb pour préserver les couleurs.
 * @param {cv.Mat} src - Image source en format OpenCV (RGBA).
 * @returns {cv.Mat} - Image avec histogramme égalisé.
 */
function equalizeHistogramYCrCb(src) {
    const ycrcb = new cv.Mat();
    cv.cvtColor(src, ycrcb, cv.COLOR_RGBA2YCrCb);

    const channels = new cv.MatVector();
    cv.split(ycrcb, channels);

    // Égalise uniquement le canal Y (luminance)
    cv.equalizeHist(channels.get(0), channels.get(0));

    cv.merge(channels, ycrcb);
    cv.cvtColor(ycrcb, src, cv.COLOR_YCrCb2RGBA);

    // Libère les matrices temporaires
    ycrcb.delete();
    channels.delete();

    return src;
}

/**
 * Assemble deux images en un panorama en utilisant OpenCV.js.
 * @param {Array<HTMLImageElement>} images - Tableau de deux images à assembler.
 * @returns {Promise<cv.Mat>} - Résultat de l'assemblage (cv.Mat).
 */
export async function stitchImages(images) {
    return new Promise(async (resolve, reject) => {
        try {
            // Convertit les images HTML en cv.Mat
            const src1 = cv.imread(images[0]);
            const src2 = cv.imread(images[1]);

            // Applique l'égalisation d'histogramme pour uniformiser la luminosité
            equalizeHistogramYCrCb(src1);
            equalizeHistogramYCrCb(src2);

            // Détecte les points clés et les descripteurs avec ORB
            const orb = new cv.ORB(500);
            const kp1 = new cv.KeyPointVector();
            const kp2 = new cv.KeyPointVector();
            const desc1 = new cv.Mat();
            const desc2 = new cv.Mat();

            orb.detectAndCompute(src1, new cv.Mat(), kp1, desc1);
            orb.detectAndCompute(src2, new cv.Mat(), kp2, desc2);

            // Match les descripteurs avec BFMatcher
            const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
            const matches = new cv.DMatchVectorVector();
            bf.knnMatch(desc1, desc2, matches, 2);

            // Filtre les bons matches avec le ratio de Lowe
            const goodMatches = [];
            for (let i = 0; i < matches.size(); ++i) {
                const m = matches.get(i);
                if (m[0].distance < 0.75 * m[1].distance) {
                    goodMatches.push(m[0]);
                }
            }

            if (goodMatches.length < 10) {
                throw new Error("Pas assez de points clés correspondants pour l'assemblage.");
            }

            // Prépare les points pour le calcul de l'homographie
            const srcPoints = new cv.Mat();
            const dstPoints = new cv.Mat();
            for (let i = 0; i < goodMatches.length; i++) {
                srcPoints.push_back(kp1.get(goodMatches[i].queryIdx).pt);
                dstPoints.push_back(kp2.get(goodMatches[i].trainIdx).pt);
            }

            // Calcule l'homographie avec RANSAC
            const H = cv.findHomography(srcPoints, dstPoints, cv.RANSAC, 3.0);

            // Applique l'homographie à la première image
            const dst = new cv.Mat();
            const resultSize = new cv.Size(src1.cols + src2.cols, Math.max(src1.rows, src2.rows));
            cv.warpPerspective(src1, dst, H, resultSize);

            // Crée un masque pour la fusion
            const mask = new cv.Mat.zeros(dst.rows, dst.cols, cv.CV_8UC1);
            const roi = new cv.Rect(0, 0, src2.cols, src2.rows);
            mask.setTo(new cv.Scalar(255, 0, 0, 0), roi);

            // Fusionne les images avec seamlessClone pour un résultat naturel
            const result = new cv.Mat();
            cv.seamlessClone(src2, dst, mask, new cv.Point(dst.cols / 2, dst.rows / 2), result, cv.NORMAL_CLONE);

            // Libère les matrices temporaires
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

            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}
