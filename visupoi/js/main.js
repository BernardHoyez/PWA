// Variables globales
let map;
let markersGroup;
let visitData = null;
let mediaFiles = {};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
});

// Initialisation du système d'upload
function initializeUpload() {
    const zipInput = document.getElementById('zip-input');
    const uploadArea = document.getElementById('upload-area');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const uploadError = document.getElementById('upload-error');

    // Gestion de l'upload par clic
    zipInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.name.toLowerCase().endsWith('.zip')) {
            processZipFile(file);
        } else {
            showError('Veuillez sélectionner un fichier ZIP valide.');
        }
    });

    // Gestion du drag & drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.toLowerCase().endsWith('.zip')) {
                processZipFile(file);
            } else {
                showError('Veuillez déposer un fichier ZIP valide.');
            }
        }
    });

    // Fonctions utilitaires pour l'upload
    function showProgress() {
        uploadProgress.style.display = 'block';
        uploadError.style.display = 'none';
    }

    function hideProgress() {
        uploadProgress.style.display = 'none';
    }

    function updateProgress(percent, text) {
        progressFill.style.width = percent + '%';
        progressText.textContent = text;
    }

    function showError(message) {
        uploadError.textContent = message;
        uploadError.style.display = 'block';
        hideProgress();
    }

    // Traitement du fichier ZIP
    async function processZipFile(file) {
        try {
            showProgress();
            updateProgress(10, 'Lecture du fichier ZIP...');

            // Lecture du fichier ZIP
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            updateProgress(30, 'Extraction des données...');

            // Recherche du fichier visit.json
            let visitJsonFile = null;
            const visitJsonPaths = ['visit.json', 'visit.json'];
            
            for (const path of visitJsonPaths) {
                if (zipContent.files[path]) {
                    visitJsonFile = zipContent.files[path];
                    break;
                }
            }

            if (!visitJsonFile) {
                throw new Error('Fichier visit.json non trouvé dans le ZIP');
            }

            // Lecture et parsing du visit.json
            const visitJsonText = await visitJsonFile.async('text');
            visitData = JSON.parse(visitJsonText);
            
            updateProgress(50, 'Chargement des médias...');

            // Extraction des fichiers de médias du dossier data/
            mediaFiles = {};
            const dataFiles = Object.keys(zipContent.files).filter(path => 
                path.startsWith('data/') && !path.endsWith('/')
            );

            let loadedFiles = 0;
            for (const filePath of dataFiles) {
                const file = zipContent.files[filePath];
                if (file && !file.dir) {
                    try {
                        // Déterminer le type de fichier
                        const fileName = filePath.split('/').pop();
                        const extension = fileName.split('.').pop().toLowerCase();
                        
                        let fileData;
                        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                            // Images - convertir en base64
                            const arrayBuffer = await file.async('arraybuffer');
                            const blob = new Blob([arrayBuffer]);
                            fileData = await blobToDataURL(blob);
                        } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
                            // Vidéos - convertir en blob URL
                            const arrayBuffer = await file.async('arraybuffer');
                            const blob = new Blob([arrayBuffer], { type: `video/${extension}` });
                            fileData = URL.createObjectURL(blob);
                        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
                            // Audio - convertir en blob URL
                            const arrayBuffer = await file.async('arraybuffer');
                            const blob = new Blob([arrayBuffer], { type: `audio/${extension}` });
                            fileData = URL.createObjectURL(blob);
                        } else {
                            // Autres fichiers
                            const arrayBuffer = await file.async('arraybuffer');
                            const blob = new Blob([arrayBuffer]);
                            fileData = URL.createObjectURL(blob);
                        }

                        mediaFiles[filePath] = {
                            data: fileData,
                            type: extension,
                            name: fileName
                        };
                        
                        loadedFiles++;
                        const progress = 50 + (loadedFiles / dataFiles.length) * 40;
                        updateProgress(progress, `Chargement des médias... (${loadedFiles}/${dataFiles.length})`);
                    } catch (fileError) {
                        console.warn(`Erreur lors du chargement de ${filePath}:`, fileError);
                    }
                }
            }

            updateProgress(95, 'Initialisation de la carte...');

            // Validation des données
            if (!visitData.pois || !Array.isArray(visitData.pois)) {
                throw new Error('Format de données invalide: aucun POI trouvé');
            }

            // Initialisation de la carte avec les données
            await initializeMap();
            
            updateProgress(100, 'Terminé !');
            
            // Masquer l'interface d'upload et afficher la carte
            setTimeout(() => {
                document.getElementById('upload-section').style.display = 'none';
                document.getElementById('main-content').style.display = 'flex';
                
                // Redimensionner la carte après affichage
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }, 500);

        } catch (error) {
            console.error('Erreur lors du traitement du ZIP:', error);
            showError(`Erreur: ${error.message}`);
        }
    }

    // Fonction utilitaire pour convertir Blob en DataURL
    function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Initialisation de la carte Leaflet
async function initializeMap() {
    try {
        // Mise à jour des informations de visite
        document.getElementById('visit-name').textContent = visitData.name || 'Visite';
        document.getElementById('poi-count').textContent = `${visitData.pois.length} POI chargés`;

        // Initialisation de la carte
        map = L.map('map', {
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Ajout de la couche OSM
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Groupe de markers
        markersGroup = L.featureGroup().addTo(map);

        // Ajout des POI sur la carte
        addPoisToMap();

        // Génération de la liste des POI
        generatePoiList();

        // Ajustement de la vue de la carte
        if (markersGroup.getLayers().length > 0) {
            map.fitBounds(markersGroup.getBounds(), { padding: [20, 20] });
        }

    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la carte:', error);
        throw new Error('Impossible d\'initialiser la carte');
    }
}

// Ajout des POI sur la carte
function addPoisToMap() {
    visitData.pois.forEach(poi => {
        try {
            // Parsing des coordonnées
            const coords = parseCoordinates(poi.location);
            if (!coords) {
                console.warn(`Coordonnées invalides pour POI ${poi.id}: ${poi.location}`);
                return;
            }

            // Détermination de la couleur du marker selon les médias disponibles
            const markerColor = getMarkerColor(poi);

            // Création du marker personnalisé
            const marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 12,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            });

            // Ajout du numéro du POI sur le marker
            const markerIcon = L.divIcon({
                html: `<div style="
                    background: ${markerColor};
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    border: 3px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${poi.id}</div>`,
                className: 'custom-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const numberedMarker = L.marker([coords.lat, coords.lng], { icon: markerIcon });

            // Création du popup avec médias
            const popupContent = createPopupContent(poi);
            numberedMarker.bindPopup(popupContent, {
                maxWidth: 400,
                className: 'custom-popup'
            });

            // Gestion des événements
            numberedMarker.on('click', function() {
                highlightPoiInList(poi.id);
            });

            numberedMarker.on('mouseover', function() {
                this.openPopup();
            });

            // Ajout au groupe de markers
            markersGroup.addLayer(numberedMarker);

            // Stockage de la référence du marker sur le POI
            poi._marker = numberedMarker;

        } catch (error) {
            console.error(`Erreur lors de l'ajout du POI ${poi.id}:`, error);
        }
    });
}

// Parsing des coordonnées depuis le format "50.04525N, 1.32983E"
function parseCoordinates(locationString) {
    try {
        const parts = locationString.split(',').map(s => s.trim());
        if (parts.length !== 2) return null;

        let lat = parseFloat(parts[0].replace(/[NS]/g, ''));
        let lng = parseFloat(parts[1].replace(/[EW]/g, ''));

        if (parts[0].includes('S')) lat = -lat;
        if (parts[1].includes('W')) lng = -lng;

        if (isNaN(lat) || isNaN(lng)) return null;

        return { lat, lng };
    } catch (error) {
        return null;
    }
}

// Détermination de la couleur du marker selon les médias
function getMarkerColor(poi) {
    const hasImage = poi.image;
    const hasVideo = poi.video;
    const hasAudio = poi.audio;

    if (hasImage && hasVideo && hasAudio) return '#9b59b6'; // Violet - tous médias
    if (hasImage && hasAudio) return '#9b59b6'; // Violet - image + audio
    if (hasVideo && hasAudio) return '#e74c3c'; // Rouge - vidéo + audio
    if (hasImage && hasVideo) return '#9b59b6'; // Violet - image + vidéo
    if (hasVideo) return '#e74c3c'; // Rouge - vidéo seule
    if (hasImage) return '#3498db'; // Bleu - image seule
    if (hasAudio) return '#2ecc71'; // Vert - audio seul
    
    return '#95a5a6'; // Gris - aucun média
}

// Création du contenu du popup avec médias
function createPopupContent(poi) {
    let mediaHtml = '';
    
    // Recherche des fichiers de médias pour ce POI
    const poiMediaFiles = Object.keys(mediaFiles).filter(path => 
        path.includes(`data/${poi.id}/`) || path.includes(`data/${poi.id}.`)
    );

    // Génération du HTML pour chaque type de média
    if (poi.image) {
        const imageFiles = poiMediaFiles.filter(path => {
            const ext = path.split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });
        
        imageFiles.forEach(imagePath => {
            if (mediaFiles[imagePath]) {
                mediaHtml += `
                    <div class="media-item">
                        <img src="${mediaFiles[imagePath].data}" alt="${poi.title}" 
                             style="max-width: 100%; height: auto; border-radius: 8px;">
                    </div>
                `;
            }
        });
    }

    if (poi.video) {
        const videoFiles = poiMediaFiles.filter(path => {
            const ext = path.split('.').pop().toLowerCase();
            return ['mp4', 'webm', 'mov', 'avi'].includes(ext);
        });
        
        videoFiles.forEach(videoPath => {
            if (mediaFiles[videoPath]) {
                mediaHtml += `
                    <div class="media-item">
                        <video controls style="width: 100%; max-height: 200px; border-radius: 8px;">
                            <source src="${mediaFiles[videoPath].data}" type="video/${mediaFiles[videoPath].type}">
                            Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                    </div>
                `;
            }
        });
    }

    if (poi.audio) {
        const audioFiles = poiMediaFiles.filter(path => {
            const ext = path.split('.').pop().toLowerCase();
            return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
        });
        
        audioFiles.forEach(audioPath => {
            if (mediaFiles[audioPath]) {
                mediaHtml += `
                    <div class="audio-player">
                        <div class="audio-icon">
                            <i class="fas fa-volume-up"></i>
                        </div>
                        <p><strong>Audio disponible</strong></p>
                        <audio controls style="width: 100%;">
                            <source src="${mediaFiles[audioPath].data}" type="audio/${mediaFiles[audioPath].type}">
                            Votre navigateur ne supporte pas la lecture audio.
                        </audio>
                    </div>
                `;
            }
        });
    }

    return `
        <div class="custom-popup">
            <div class="popup-header">
                <h3><i class="fas fa-map-marker-alt"></i> ${poi.title}</h3>
            </div>
            <div class="popup-content">
                ${poi.comment ? `<div class="popup-comment">${poi.comment}</div>` : ''}
                
                <div class="popup-coordinates">
                    <i class="fas fa-crosshairs"></i> ${poi.location}
                </div>
                
                ${mediaHtml ? `<div class="popup-media">${mediaHtml}</div>` : ''}
            </div>
        </div>
    `;
}

// Génération de la liste des POI dans la sidebar
function generatePoiList() {
    const poiList = document.getElementById('poi-list');
    poiList.innerHTML = '';

    visitData.pois.forEach(poi => {
        const poiItem = document.createElement('div');
        poiItem.className = 'poi-item';
        poiItem.dataset.poiId = poi.id;

        // Génération des badges de médias
        let mediaBadges = '';
        if (poi.image) mediaBadges += '<span class="media-badge"><i class="fas fa-image"></i> Photo</span>';
        if (poi.video) mediaBadges += '<span class="media-badge"><i class="fas fa-video"></i> Vidéo</span>';
        if (poi.audio) mediaBadges += '<span class="media-badge"><i class="fas fa-volume-up"></i> Audio</span>';

        poiItem.innerHTML = `
            <h4><span style="color: ${getMarkerColor(poi)};">●</span> ${poi.title}</h4>
            ${poi.comment ? `<p>${poi.comment}</p>` : ''}
            <p class="poi-coordinates"><i class="fas fa-crosshairs"></i> ${poi.location}</p>
            ${mediaBadges ? `<div class="poi-media-indicators">${mediaBadges}</div>` : ''}
        `;

        // Gestion des événements
        poiItem.addEventListener('click', function() {
            centerMapOnPoi(poi);
            highlightPoiInList(poi.id);
        });

        poiItem.addEventListener('mouseover', function() {
            if (poi._marker) {
                poi._marker.openPopup();
            }
        });

        poiList.appendChild(poiItem);
    });
}

// Centrage de la carte sur un POI
function centerMapOnPoi(poi) {
    if (poi._marker) {
        const coords = parseCoordinates(poi.location);
        if (coords) {
            map.setView([coords.lat, coords.lng], 16);
            poi._marker.openPopup();
        }
    }
}

// Mise en surbrillance d'un POI dans la liste
function highlightPoiInList(poiId) {
    // Suppression de la surbrillance précédente
    document.querySelectorAll('.poi-item').forEach(item => {
        item.classList.remove('active');
    });

    // Ajout de la surbrillance au POI actuel
    const poiItem = document.querySelector(`[data-poi-id="${poiId}"]`);
    if (poiItem) {
        poiItem.classList.add('active');
    }
}