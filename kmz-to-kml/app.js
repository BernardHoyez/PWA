// ========================================
// KMZ to KML Converter v1.0
// Utilise DOMParser pour manipulation KML
// ========================================

// Global State
let state = {
    originalZip: null,
    kmlDoc: null,
    waypoints: [],
    images: {},
    folderName: '',
    communeName: '',
    startCoords: null
};

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const editSection = document.getElementById('edit-section');
const statusText = document.getElementById('status-text');
const progress = document.getElementById('progress');
const waypointsList = document.getElementById('waypoints-list');
const photosCount = document.getElementById('photos-count');
const totalSize = document.getElementById('total-size');
const communeInput = document.getElementById('commune-input');
const editCommuneBtn = document.getElementById('edit-commune-btn');
const detectionStatus = document.getElementById('detection-status');
const githubBaseInput = document.getElementById('github-base-input');
const finalFolderPreview = document.getElementById('final-folder-preview');
const downloadKmzBtn = document.getElementById('download-kmz-btn');
const downloadKmlBtn = document.getElementById('download-kml-btn');
const resetBtn = document.getElementById('reset-btn');

// ========================================
// Event Listeners
// ========================================

uploadZone.addEventListener('click', () => fileInput.click());
selectBtn.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--primary)';
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = 'var(--border)';
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--border)';
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

editCommuneBtn.addEventListener('click', () => {
    communeInput.readOnly = false;
    communeInput.focus();
    communeInput.select();
});

communeInput.addEventListener('blur', () => {
    state.communeName = communeInput.value.trim();
    updateFolderPreview();
});

communeInput.addEventListener('input', () => {
    state.communeName = communeInput.value.trim();
    updateFolderPreview();
});

githubBaseInput.addEventListener('input', updateFolderPreview);

downloadKmzBtn.addEventListener('click', downloadModifiedKmz);
downloadKmlBtn.addEventListener('click', downloadFinalKml);
resetBtn.addEventListener('click', resetApp);

// ========================================
// Main Processing Function
// ========================================

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.kmz')) {
        alert('Veuillez sélectionner un fichier KMZ');
        return;
    }

    // Show processing
    showSection(processingSection);
    state.folderName = file.name.replace('.kmz', '');

    try {
        updateProgress(10, 'Lecture du fichier KMZ...');

        // Load ZIP
        const zip = await JSZip.loadAsync(file);
        state.originalZip = zip;

        updateProgress(20, 'Extraction du fichier KML...');

        // Find and parse KML
        const kmlFile = zip.file('doc.kml');
        if (!kmlFile) throw new Error('Fichier doc.kml introuvable');

        const kmlText = await kmlFile.async('text');
        state.kmlDoc = new DOMParser().parseFromString(kmlText, 'text/xml');

        updateProgress(30, 'Analyse des waypoints photo...');

        // Extract waypoints (OruxMaps style #3)
        await extractWaypoints(zip);

        if (state.waypoints.length === 0) {
            throw new Error('Aucun waypoint photo trouvé (style #3)');
        }

        updateProgress(50, 'Détection de la commune...');

        // Detect commune from first waypoint
        await detectCommune();

        updateProgress(60, `Optimisation de ${state.waypoints.length} photos...`);

        // Optimize images
        for (let i = 0; i < state.waypoints.length; i++) {
            const wp = state.waypoints[i];
            state.images[wp.imgSrc] = await optimizeImage(state.images[wp.imgSrc]);
            updateProgress(60 + (30 * (i / state.waypoints.length)), 
                `Optimisation ${i + 1}/${state.waypoints.length}...`);
        }

        updateProgress(100, 'Terminé !');

        // Show edit section
        setTimeout(() => {
            showSection(editSection);
            displayWaypoints();
            updateStats();
            updateFolderPreview();
        }, 500);

    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du traitement : ' + error.message);
        resetApp();
    }
}

// ========================================
// Extract Waypoints from KML
// ========================================

async function extractWaypoints(zip) {
    state.waypoints = [];
    state.images = {};

    const placemarks = state.kmlDoc.getElementsByTagName('Placemark');

    for (let pm of placemarks) {
        // Check if style is #3 (OruxMaps photo waypoint)
        const styleUrl = pm.getElementsByTagName('styleUrl')[0];
        if (!styleUrl || styleUrl.textContent.trim() !== '#3') continue;

        const nameEl = pm.getElementsByTagName('name')[0];
        const descEl = pm.getElementsByTagName('description')[0];
        const coordEl = pm.getElementsByTagName('coordinates')[0];

        if (!coordEl || !descEl) continue;

        // Extract name (max 20 chars)
        const originalName = (nameEl ? nameEl.textContent.trim() : '').slice(0, 20);

        // Extract image from description
        const descHTML = getElementContent(descEl);
        const imgMatch = descHTML.match(/<img[^>]*src\s*=\s*["']?([^"'\s>]+)["']?/i);
        if (!imgMatch) continue;

        const imgSrc = imgMatch[1].trim().replace(/^\.?\//, '');
        const imgFile = zip.file(imgSrc);
        if (!imgFile) continue;

        // Load image
        const imgBlob = await imgFile.async('blob');
        state.images[imgSrc] = imgBlob;

        // Extract coordinates
        const coordsText = coordEl.textContent.trim().split(/[\s,]+/).filter(Boolean);
        if (coordsText.length < 2) continue;

        const lon = parseFloat(coordsText[0]);
        const lat = parseFloat(coordsText[1]);
        if (isNaN(lon) || isNaN(lat)) continue;

        // Store first coordinates for commune detection
        if (!state.startCoords) {
            state.startCoords = { lon, lat };
        }

        // Add waypoint
        state.waypoints.push({
            placemark: pm,
            originalName: originalName,
            name: originalName,
            comment: '',
            imgSrc: imgSrc,
            coords: { lon, lat }
        });
    }
}

// ========================================
// Helper: Get element content (handles CDATA)
// ========================================

function getElementContent(element) {
    if (!element) return '';
    
    // Check for CDATA
    if (element.firstChild && element.firstChild.nodeType === 4) {
        return element.firstChild.nodeValue || '';
    }
    
    return element.textContent || '';
}

// ========================================
// Detect Commune via Nominatim
// ========================================

async function detectCommune() {
    if (!state.startCoords) {
        state.communeName = 'Commune-Inconnue';
        communeInput.value = state.communeName;
        detectionStatus.textContent = '⚠️ Coordonnées non trouvées';
        detectionStatus.style.color = 'var(--warning)';
        return;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.startCoords.lat}&lon=${state.startCoords.lon}&zoom=14&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'KMZ-to-KML-Converter' }
        });

        if (!response.ok) throw new Error('Erreur API Nominatim');

        const data = await response.json();
        const addr = data.address || {};
        
        const communeRaw = addr.village || addr.town || addr.city || 
                          addr.municipality || addr.county || 'Commune-Inconnue';
        
        // Normalize (remove accents, special chars)
        state.communeName = communeRaw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .replace(/-+/g, '-');

        communeInput.value = state.communeName;
        detectionStatus.textContent = `✓ Détecté : ${data.display_name.split(',')[0]}`;
        detectionStatus.style.color = 'var(--success)';

    } catch (error) {
        console.error('Erreur détection commune:', error);
        state.communeName = 'Commune-Inconnue';
        communeInput.value = state.communeName;
        detectionStatus.textContent = '⚠️ Détection échouée, modifiez manuellement';
        detectionStatus.style.color = 'var(--warning)';
    }
}

// ========================================
// Optimize Image
// ========================================

async function optimizeImage(blob) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;
            const maxSize = 1920;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round(height * maxSize / width);
                    width = maxSize;
                } else {
                    width = Math.round(width * maxSize / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((optimizedBlob) => {
                URL.revokeObjectURL(img.src);
                resolve(optimizedBlob);
            }, 'image/jpeg', 0.82);
        };
        img.src = URL.createObjectURL(blob);
    });
}

// ========================================
// Display Waypoints for Editing
// ========================================

function displayWaypoints() {
    waypointsList.innerHTML = '';

    state.waypoints.forEach((wp, index) => {
        const item = document.createElement('div');
        item.className = 'waypoint-item';

        const previewUrl = URL.createObjectURL(state.images[wp.imgSrc]);

        item.innerHTML = `
            <img src="${previewUrl}" class="waypoint-thumb" alt="${wp.imgSrc}" data-index="${index}">
            <div class="waypoint-fields">
                <div class="waypoint-original">📄 ${wp.imgSrc}</div>
                
                <div class="field-group">
                    <label>Nom du waypoint (max 20 caractères)</label>
                    <input 
                        type="text" 
                        class="waypoint-name" 
                        value="${wp.name}" 
                        maxlength="20" 
                        data-index="${index}"
                    >
                    <div class="char-counter name-counter-${index}">${wp.name.length}/20</div>
                </div>
                
                <div class="field-group">
                    <label>Commentaire optionnel (max 60 caractères)</label>
                    <textarea 
                        class="waypoint-comment" 
                        maxlength="60" 
                        data-index="${index}"
                        placeholder="Description courte..."
                    >${wp.comment}</textarea>
                    <div class="char-counter comment-counter-${index}">${wp.comment.length}/60</div>
                </div>
            </div>
        `;

        waypointsList.appendChild(item);
    });

    // Add event listeners
    document.querySelectorAll('.waypoint-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const wp = state.waypoints[index];
            const url = URL.createObjectURL(state.images[wp.imgSrc]);
            window.open(url, '_blank');
        });
    });

    document.querySelectorAll('.waypoint-name').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = e.target.value;
            state.waypoints[index].name = value;

            const counter = document.querySelector(`.name-counter-${index}`);
            counter.textContent = `${value.length}/20`;
            counter.classList.toggle('warning', value.length > 15);
        });
    });

    document.querySelectorAll('.waypoint-comment').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = e.target.value;
            state.waypoints[index].comment = value;

            const counter = document.querySelector(`.comment-counter-${index}`);
            counter.textContent = `${value.length}/60`;
            counter.classList.toggle('warning', value.length > 50);
        });
    });
}

// ========================================
// Update Stats
// ========================================

function updateStats() {
    photosCount.textContent = `${state.waypoints.length} photos`;

    const totalBytes = Object.values(state.images).reduce((sum, blob) => sum + blob.size, 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    totalSize.textContent = `${totalMB} MB`;
}

// ========================================
// Update Folder Preview
// ========================================

function updateFolderPreview() {
    const finalFolder = `${state.communeName}_${state.folderName}`;
    finalFolderPreview.textContent = finalFolder;
}

// ========================================
// Download Modified KMZ (Step 1)
// ========================================

async function downloadModifiedKmz() {
    console.log('=== Génération KMZ modifié ===');

    downloadKmzBtn.disabled = true;
    downloadKmzBtn.textContent = 'Génération en cours...';

    try {
        const newZip = new JSZip();

        // Update waypoint names and comments using DOMParser
        state.waypoints.forEach(wp => {
            const pm = wp.placemark;

            // Update name
            const nameEl = pm.getElementsByTagName('name')[0];
            if (nameEl) {
                nameEl.textContent = wp.name;
            }

            // Update description (add comment if provided)
            let descEl = pm.getElementsByTagName('description')[0];
            if (!descEl) {
                descEl = state.kmlDoc.createElement('description');
                pm.appendChild(descEl);
            }

            let currentContent = getElementContent(descEl);

            if (wp.comment.trim()) {
                currentContent += (currentContent.trim() ? '<br>' : '') + wp.comment.trim();
            }

            // Replace with CDATA
            while (descEl.firstChild) descEl.removeChild(descEl.firstChild);
            const cdata = state.kmlDoc.createCDATASection(currentContent);
            descEl.appendChild(cdata);
        });

        // Serialize KML
        const serializer = new XMLSerializer();
        let newKmlText = serializer.serializeToString(state.kmlDoc);
        newKmlText = newKmlText.replace(/>\s+</g, '><'); // Minify
        newZip.file('doc.kml', newKmlText);

        // Add optimized images
        for (const [path, blob] of Object.entries(state.images)) {
            newZip.file(path, blob);
        }

        // Copy other files from original zip
        for (const filename in state.originalZip.files) {
            const zipEntry = state.originalZip.files[filename];

            if (
                filename === 'doc.kml' ||
                state.images[filename] ||
                zipEntry.dir === true ||
                !zipEntry.async
            ) {
                continue;
            }

            try {
                const blob = await zipEntry.async('blob');
                newZip.file(filename, blob);
            } catch (e) {
                console.warn(`Skip ${filename}:`, e.message);
            }
        }

        // Generate and download
        const blob = await newZip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.communeName}_${state.folderName}.kmz`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('=== KMZ généré avec succès ===');
        downloadKmzBtn.disabled = false;
        downloadKmzBtn.innerHTML = `✅ KMZ téléchargé<br><small>Uploadez-le maintenant sur GitHub</small>`;

    } catch (error) {
        console.error('Erreur génération KMZ:', error);
        alert('Erreur : ' + error.message);
        downloadKmzBtn.disabled = false;
        downloadKmzBtn.innerHTML = `📦 Télécharger KMZ modifié<br><small>Étape 1 : Pour upload sur GitHub</small>`;
    }
}

// ========================================
// Download Final KML (Step 2)
// ========================================

async function downloadFinalKml() {
    console.log('=== Génération KML final ===');

    const baseUrl = githubBaseInput.value.trim();
    if (!baseUrl) {
        alert('Veuillez configurer l\'URL GitHub');
        return;
    }

    downloadKmlBtn.disabled = true;
    downloadKmlBtn.textContent = 'Génération en cours...';

    try {
        const finalFolder = `${state.communeName}_${state.folderName}`;
        const githubBase = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + finalFolder + '/';

        console.log('GitHub base URL:', githubBase);

        // Clone the KML document to avoid modifying the original
        const kmlClone = state.kmlDoc.cloneNode(true);

        // Process each waypoint
        state.waypoints.forEach(wp => {
            // Find the corresponding placemark in the clone
            const placemarks = kmlClone.getElementsByTagName('Placemark');
            let targetPlacemark = null;

            for (let pm of placemarks) {
                const styleUrl = pm.getElementsByTagName('styleUrl')[0];
                if (!styleUrl || styleUrl.textContent.trim() !== '#3') continue;

                const descEl = pm.getElementsByTagName('description')[0];
                if (!descEl) continue;

                const descContent = getElementContent(descEl);
                if (descContent.includes(wp.imgSrc)) {
                    targetPlacemark = pm;
                    break;
                }
            }

            if (!targetPlacemark) return;

            // Update name
            const nameEl = targetPlacemark.getElementsByTagName('name')[0];
            if (nameEl) nameEl.textContent = wp.name;

            // Update description
            let descEl = targetPlacemark.getElementsByTagName('description')[0];
            if (!descEl) {
                descEl = kmlClone.createElement('description');
                targetPlacemark.appendChild(descEl);
            }

            let descContent = getElementContent(descEl);

            // Add comment if provided
            if (wp.comment.trim()) {
                descContent += (descContent.trim() ? '<br>' : '') + wp.comment.trim();
            }

            // Replace image paths with GitHub URLs
            descContent = descContent.replace(
                new RegExp(`files/${wp.imgSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                githubBase + wp.imgSrc
            );

            // Add "Agrandir l'image" button
            const enlargeButton = `<br><br><div style="text-align:center;margin-top:15px;"><a href="${githubBase}${wp.imgSrc}" target="_blank" style="display:inline-block;padding:10px 20px;background:#4a7c59;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">🔍 Agrandir l'image</a></div>`;
            
            if (!descContent.includes('Agrandir')) {
                descContent += enlargeButton;
            }

            // Update with CDATA
            while (descEl.firstChild) descEl.removeChild(descEl.firstChild);
            const cdata = kmlClone.createCDATASection(descContent);
            descEl.appendChild(cdata);
        });

        // Serialize final KML
        const serializer = new XMLSerializer();
        let finalKmlText = serializer.serializeToString(kmlClone);
        finalKmlText = finalKmlText.replace(/>\s+</g, '><');

        // Download
        const blob = new Blob([finalKmlText], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.communeName}_${state.folderName}.kml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('=== KML généré avec succès ===');
        downloadKmlBtn.disabled = false;
        downloadKmlBtn.innerHTML = `✅ KML téléchargé<br><small>Prêt pour Google Earth</small>`;

    } catch (error) {
        console.error('Erreur génération KML:', error);
        alert('Erreur : ' + error.message);
        downloadKmlBtn.disabled = false;
        downloadKmlBtn.innerHTML = `📄 Télécharger KML final<br><small>Étape 2 : Avec liens GitHub</small>`;
    }
}

// ========================================
// Utility Functions
// ========================================

function updateProgress(percent, text) {
    progress.style.width = percent + '%';
    statusText.textContent = text;
}

function showSection(section) {
    uploadSection.classList.remove('active');
    processingSection.classList.remove('active');
    editSection.classList.remove('active');
    section.classList.add('active');
}

function resetApp() {
    // Clean up URLs
    state.waypoints.forEach(wp => {
        if (state.images[wp.imgSrc]) {
            const url = URL.createObjectURL(state.images[wp.imgSrc]);
            URL.revokeObjectURL(url);
        }
    });

    // Reset state
    state = {
        originalZip: null,
        kmlDoc: null,
        waypoints: [],
        images: {},
        folderName: '',
        communeName: '',
        startCoords: null
    };

    // Reset UI
    fileInput.value = '';
    progress.style.width = '0%';
    statusText.textContent = 'Initialisation...';
    waypointsList.innerHTML = '';
    communeInput.value = '';
    detectionStatus.textContent = '';
    
    downloadKmzBtn.disabled = false;
    downloadKmzBtn.innerHTML = `📦 Télécharger KMZ modifié<br><small>Étape 1 : Pour upload sur GitHub</small>`;
    downloadKmlBtn.disabled = false;
    downloadKmlBtn.innerHTML = `📄 Télécharger KML final<br><small>Étape 2 : Avec liens GitHub</small>`;

    showSection(uploadSection);
}

// ========================================
// Service Worker Registration
// ========================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('✓ Service Worker enregistré'))
        .catch(err => console.log('Service Worker error:', err));
}
