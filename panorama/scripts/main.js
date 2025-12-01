// Importe les fonctions utilitaires et d'assemblage
import { setupDragAndDrop, displayImage, showError, showSuccess, isOpenCVReady } from './utils.js';
import { stitchImages } from './stitching.js';

// Attend que le DOM soit chargé
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifie si OpenCV est prêt
    const isOpenCVLoaded = await isOpenCVReady();
    if (!isOpenCVLoaded) {
        showError("OpenCV.js n'a pas pu être chargé. Veuillez vérifier votre connexion ou réessayer plus tard.");
        return;
    }

    // Récupère les éléments du DOM
    const dropArea = document.getElementById('drop-area');
    const previewContainer = document.getElementById('preview');
    const resultContainer = document.getElementById('result');
    const stitchButton = document.getElementById('stitch-button');

    // Variable pour stocker les images déposées
    let droppedImages = [];

    // Configure la zone de glisser-déposer
    setupDragAndDrop(dropArea, (images) => {
        droppedImages = images;
        displayImage(previewContainer, images[0], 'preview-image');
        showSuccess(`${images.length} image(s) chargée(s) avec succès !`);
    });

    // Gère le clic sur le bouton d'assemblage
    stitchButton.addEventListener('click', async () => {
        if (droppedImages.length < 2) {
            showError("Veuillez déposer au moins deux images pour l'assemblage.");
            return;
        }

        try {
            // Désactive le bouton pendant le traitement
            stitchButton.disabled = true;
            stitchButton.textContent = "Assemblage en cours...";

            // Appelle la fonction d'assemblage
            const result = await stitchImages(droppedImages);

            // Affiche le résultat
            displayImage(resultContainer, result, 'result-image');
            showSuccess("Assemblage terminé avec succès !");

        } catch (error) {
            console.error("Erreur lors de l'assemblage :", error);
            showError(`Erreur lors de l'assemblage : ${error.message}`);
        } finally {
            // Réactive le bouton
            stitchButton.disabled = false;
            stitchButton.textContent = "Assembler les images";
        }
    });
});
