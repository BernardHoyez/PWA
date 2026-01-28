// État de l'application
let gpxData = null;
let originalFileName = '';
let processedGPX = null;

// Éléments DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const totalPoints = document.getElementById('totalPoints');
const processedPoints = document.getElementById('processedPoints');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const btnProcess = document.getElementById('btnProcess');
const btnDownload = document.getElementById('btnDownload');
const btnReset = document.getElementById('btnReset');
const statusMessage = document.getElementById('statusMessage');

// Gestion du clic sur la zone d'upload
uploadArea.addEventListener('click', () => fileInput.click());

// Gestion du drag & drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Gestion de la sélection de fichier
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Traiter le fichier GPX
function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
        showStatus('Veuillez sélectionner un fichier GPX valide', 'error');
        return;
    }

    originalFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const parser = new DOMParser();
            gpxData = parser.parseFromString(e.target.result, 'text/xml');
            
            // Vérifier si c'est un fichier GPX valide
            if (gpxData.querySelector('parsererror')) {
                throw new Error('Fichier GPX invalide');
            }

            const points = getAllTrackPoints(gpxData);
            
            if (points.length === 0) {
                throw new Error('Aucun point de trace trouvé dans le fichier GPX');
            }

            // Afficher les informations
            fileName.textContent = originalFileName;
            totalPoints.textContent = points.length;
            processedPoints.textContent = '0';
            fileInfo.classList.add('visible');
            btnProcess.disabled = false;
            btnDownload.classList.remove('visible');
            progressContainer.classList.remove('visible');
            showStatus('Fichier chargé avec succès', 'success');

        } catch (error) {
            showStatus(`Erreur: ${error.message}`, 'error');
        }
    };

    reader.readAsText(file);
}

// Récupérer tous les points de trace (trkpt)
function getAllTrackPoints(gpx) {
    const points = [];
    const trkpts = gpx.querySelectorAll('trkpt');
    trkpts.forEach(pt => {
        points.push({
            element: pt,
            lat: parseFloat(pt.getAttribute('lat')),
            lon: parseFloat(pt.getAttribute('lon'))
        });
    });
    return points;
}

// Interroger l'API IGN pour l'altitude
async function getIGNAltitude(lon, lat) {
    const url = `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=${lon}&lat=${lat}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erreur API IGN');
        }
        const data = await response.json();
        return data.elevations[0];
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'altitude:', error);
        return null;
    }
}

// Traiter tous les points
async function processGPX() {
    if (!gpxData) return;

    btnProcess.disabled = true;
    btnDownload.classList.remove('visible');
    progressContainer.classList.add('visible');
    showStatus('Traitement en cours...', 'info');

    const points = getAllTrackPoints(gpxData);
    let processed = 0;

    // Créer une copie du document GPX
    processedGPX = gpxData.cloneNode(true);
    const pointsToProcess = getAllTrackPoints(processedGPX);

    // Traiter les points avec un délai pour éviter de surcharger l'API
    for (let i = 0; i < pointsToProcess.length; i++) {
        const point = pointsToProcess[i];
        const altitude = await getIGNAltitude(point.lon, point.lat);

        if (altitude !== null) {
            // Mettre à jour ou créer l'élément <ele>
            let eleElement = point.element.querySelector('ele');
            if (!eleElement) {
                eleElement = processedGPX.createElement('ele');
                point.element.appendChild(eleElement);
            }
            eleElement.textContent = altitude.toFixed(2);
        }

        processed++;
        const percent = Math.round((processed / points.length) * 100);
        
        // Mettre à jour l'interface
        progressFill.style.width = `${percent}%`;
        progressFill.textContent = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        processedPoints.textContent = processed;

        // Petit délai pour éviter de surcharger l'API (environ 10 requêtes/seconde)
        if (i < pointsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Traitement terminé
    btnDownload.classList.add('visible');
    showStatus(`${processed} points traités avec succès !`, 'success');
}

// Télécharger le fichier GPX modifié
function downloadGPX() {
    if (!processedGPX) return;

    const serializer = new XMLSerializer();
    const gpxString = serializer.serializeToString(processedGPX);
    
    const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFileName.replace('.gpx', '_IGN.gpx');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Fichier téléchargé avec succès !', 'success');
}

// Réinitialiser l'application
function resetApp() {
    gpxData = null;
    processedGPX = null;
    originalFileName = '';
    fileInfo.classList.remove('visible');
    fileInput.value = '';
    progressContainer.classList.remove('visible');
    btnDownload.classList.remove('visible');
    statusMessage.classList.remove('visible');
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    progressPercent.textContent = '0%';
}

// Afficher un message de statut
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message visible ' + type;
}

// Gestionnaires d'événements
btnProcess.addEventListener('click', processGPX);
btnDownload.addEventListener('click', downloadGPX);
btnReset.addEventListener('click', resetApp);
