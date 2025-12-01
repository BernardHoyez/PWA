/**
 * Configure une zone pour le glisser-déposer de fichiers images.
 * @param {HTMLElement} dropArea - Zone où déposer les images.
 * @param {Function} onDropCallback - Fonction appelée avec les images chargées.
 */
export function setupDragAndDrop(dropArea, onDropCallback) {
    // Empêche le comportement par défaut pour les événements de drag
    dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.style.borderColor = "#4CAF50";
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.style.borderColor = "#ccc";
    });

    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.style.borderColor = "#ccc";
        const files = e.dataTransfer.files;
        const images = [];

        // Vérifie si des fichiers ont été déposés
        if (files.length === 0) {
            return;
        }

        // Charge chaque image déposée
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.match("image.*")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        images.push(img);
                        // Appelle le callback une fois toutes les images chargées
                        if (images.length === files.length) {
                            onDropCallback(images);
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(files[i]);
            }
        }
    });
}

/**
 * Affiche une image ou un résultat OpenCV dans un conteneur DOM.
 * @param {HTMLElement} container - Conteneur où afficher l'image.
 * @param {cv.Mat|HTMLImageElement} image - Image à afficher (cv.Mat ou HTMLImageElement).
 * @param {string} id - ID à attribuer à l'élément image.
 */
export function displayImage(container, image, id = "result-image") {
    container.innerHTML = "";
    let element;

    if (image instanceof cv.Mat) {
        // Si c'est une matrice OpenCV, crée un canvas pour l'afficher
        const canvas = document.createElement("canvas");
        cv.imshow(canvas, image);
        element = canvas;
    } else {
        // Si c'est une image HTML, crée un élément img
        element = document.createElement("img");
        element.src = image.src;
    }

    element.id = id;
    element.style.maxWidth = "100%";
    element.style.borderRadius = "5px";
    element.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    container.appendChild(element);
}

/**
 * Affiche un message d'erreur dans l'interface.
 * @param {string} message - Message d'erreur à afficher.
 */
export function showError(message) {
    console.error(message);
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.textContent = message;
    document.body.appendChild(errorElement);

    // Supprime le message après 5 secondes
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

/**
 * Affiche un message de succès dans l'interface.
 * @param {string} message - Message de succès à afficher.
 */
export function showSuccess(message) {
    const successElement = document.createElement("div");
    successElement.className = "success-message";
    successElement.textContent = message;
    document.body.appendChild(successElement);

    // Supprime le message après 3 secondes
    setTimeout(() => {
        if (successElement.parentNode) {
            successElement.parentNode.removeChild(successElement);
        }
    }, 3000);
}

/**
 * Vérifie si OpenCV.js est chargé et prêt à l'emploi.
 * @returns {Promise<boolean>} - Promesse résolue avec true si OpenCV est prêt.
 */
export function isOpenCVReady() {
    return new Promise((resolve) => {
        // Si OpenCV est déjà chargé
        if (typeof cv !== "undefined" && cv.Mat) {
            resolve(true);
            return;
        }

        // Sinon, vérifie périodiquement
        const interval = setInterval(() => {
            if (typeof cv !== "undefined" && cv.Mat) {
                clearInterval(interval);
                resolve(true);
            }
        }, 100);

        // Timeout après 10 secondes
        setTimeout(() => {
            clearInterval(interval);
            resolve(false);
        }, 10000);
    });
}

/**
 * Redimensionne une image HTML à une taille maximale donnée.
 * @param {HTMLImageElement} img - Image à redimensionner.
 * @param {number} maxWidth - Largeur maximale.
 * @param {number} maxHeight - Hauteur maximale.
 * @returns {HTMLCanvasElement} - Canvas contenant l'image redimensionnée.
 */
export function resizeImage(img, maxWidth, maxHeight) {
    const canvas = document.createElement("canvas");
    let width = img.width;
    let height = img.height;

    // Calcule les nouvelles dimensions en conservant les proportions
    if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
    }
    if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

/**
 * Enregistre le Service Worker pour la PWA.
 */
export function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/PWA/panorama/sw.js")
                .then((registration) => {
                    console.log("ServiceWorker enregistré avec succès :", registration.scope);
                })
                .catch((error) => {
                    console.error("Échec de l'enregistrement du ServiceWorker :", error);
                });
        });
    }
}
