// Global variables
let originalKmlContent = '';
let processedImages = [];
let folderName = '';
let communeName = '';
let startCoordinates = null;
let waypointData = {}; // { filename: { name: '', comment: '' } }

// DOM elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const editSection = document.getElementById('edit-section');
const statusText = document.getElementById('status-text');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
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

// Event listeners
uploadZone.addEventListener('click', () => fileInput.click());
selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

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
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

editCommuneBtn.addEventListener('click', () => {
    communeInput.readOnly = false;
    communeInput.focus();
    communeInput.select();
});

communeInput.addEventListener('blur', () => {
    communeName = communeInput.value.trim();
    updateFolderPreview();
});

communeInput.addEventListener('input', () => {
    communeName = communeInput.value.trim();
    updateFolderPreview();
});

githubBaseInput.addEventListener('input', updateFolderPreview);

downloadKmzBtn.addEventListener('click', downloadModifiedKmz);
downloadKmlBtn.addEventListener('click', downloadFinalKml);
resetBtn.addEventListener('click', resetApp);

// Main file handler
async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.kmz')) {
        alert('Veuillez sélectionner un fichier KMZ');
        return;
    }

    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';

    try {
        updateProgress(10, 'Lecture du fichier KMZ...');
        
        const zip = await JSZip.loadAsync(file);
        folderName = file.name.replace('.kmz', '');
        
        updateProgress(20, 'Extraction du fichier KML...');
        
        // Find and read KML file
        const kmlFile = Object.keys(zip.files).find(name => 
            name.toLowerCase().endsWith('.kml') || name.toLowerCase() === 'doc.kml'
        );
        
        if (!kmlFile) {
            throw new Error('Fichier KML introuvable dans le KMZ');
        }
        
        originalKmlContent = await zip.files[kmlFile].async('text');
        
        updateProgress(30, 'Extraction des coordonnées...');
        
        // Extract start coordinates
        extractStartCoordinates();
        
        updateProgress(40, 'Recherche des images...');
        
        // Find all images
        const imageFiles = Object.keys(zip.files).filter(name => 
            /\.(jpg|jpeg|png)$/i.test(name) && !name.startsWith('__MACOSX')
        );
        
        if (imageFiles.length === 0) {
            throw new Error('Aucune image trouvée dans le KMZ');
        }
        
        updateProgress(50, `Traitement de ${imageFiles.length} images...`);
        
        // Process images
        processedImages = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const fileName = imageFiles[i].split('/').pop();
            const blob = await zip.files[imageFiles[i]].async('blob');
            
            updateProgress(50 + (40 * (i / imageFiles.length)), 
                `Optimisation ${i + 1}/${imageFiles.length}: ${fileName}`);
            
            const optimized = await optimizeImage(blob, fileName);
            processedImages.push(optimized);
            
            // Initialize waypoint data
            waypointData[optimized.name] = {
                name: optimized.name.replace(/\.[^/.]+$/, ''), // Remove extension
                comment: ''
            };
        }
        
        updateProgress(90, 'Détection de la commune...');
        
        // Detect commune
        await detectCommune();
        
        updateProgress(100, 'Terminé !');
        
        // Show edit section
        setTimeout(() => {
            processingSection.style.display = 'none';
            editSection.style.display = 'block';
            displayWaypoints();
            updateStats();
            updateFolderPreview();
        }, 500);
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du traitement: ' + error.message);
        resetApp();
    }
}

// Update progress bar
function updateProgress(percent, text) {
    progress.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
    statusText.textContent = text;
}

// Optimize image
async function optimizeImage(blob, fileName) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 1920px)
            let width = img.width;
            let height = img.height;
            const maxSize = 1920;
            
            if (width > height && width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((optimizedBlob) => {
                URL.revokeObjectURL(url);
                
                // Create preview URL
                const previewUrl = URL.createObjectURL(optimizedBlob);
                
                resolve({
                    name: fileName,
                    blob: optimizedBlob,
                    size: optimizedBlob.size,
                    previewUrl: previewUrl,
                    width: width,
                    height: height
                });
            }, 'image/jpeg', 0.85);
        };
        
        img.src = url;
    });
}

// Extract start coordinates from KML
function extractStartCoordinates() {
    // Look for first coordinates in a Point
    const coordMatch = originalKmlContent.match(/<coordinates>([^<]+)<\/coordinates>/);
    if (coordMatch) {
        const coords = coordMatch[1].trim().split(',');
        if (coords.length >= 2) {
            startCoordinates = {
                lon: parseFloat(coords[0]),
                lat: parseFloat(coords[1])
            };
            console.log('Coordonnées de départ:', startCoordinates);
        }
    }
}

// Detect commune using reverse geocoding
async function detectCommune() {
    if (!startCoordinates) {
        communeName = 'Commune-Inconnue';
        communeInput.value = communeName;
        detectionStatus.textContent = '⚠️ Coordonnées non trouvées';
        detectionStatus.style.color = 'var(--warning)';
        return;
    }
    
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${startCoordinates.lat}&lon=${startCoordinates.lon}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'KMZ-Converter-PWA'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erreur API Nominatim');
        }
        
        const data = await response.json();
        
        // Extract commune name
        const address = data.address;
        communeName = address.village || address.town || address.city || 
                      address.municipality || address.county || 'Commune-Inconnue';
        
        // Clean name (remove spaces, special chars)
        communeName = communeName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .replace(/-+/g, '-');
        
        communeInput.value = communeName;
        detectionStatus.textContent = `✓ Détecté : ${data.display_name.split(',')[0]}`;
        detectionStatus.style.color = 'var(--success)';
        
        console.log('Commune détectée:', communeName, data);
        
    } catch (error) {
        console.error('Erreur détection commune:', error);
        communeName = 'Commune-Inconnue';
        communeInput.value = communeName;
        detectionStatus.textContent = '⚠️ Détection échouée, modifiez manuellement';
        detectionStatus.style.color = 'var(--warning)';
    }
}

// Display waypoints for editing
function displayWaypoints() {
    waypointsList.innerHTML = '';
    
    processedImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'waypoint-item';
        
        const data = waypointData[img.name];
        
        item.innerHTML = `
            <img src="${img.previewUrl}" class="waypoint-thumb" alt="${img.name}" data-index="${index}">
            <div class="waypoint-fields">
                <div class="waypoint-original">📄 ${img.name}</div>
                
                <div class="field-group">
                    <label>Nom du waypoint * (max 20 caractères)</label>
                    <input 
                        type="text" 
                        class="waypoint-name" 
                        value="${data.name}" 
                        maxlength="20" 
                        data-filename="${img.name}"
                        placeholder="Nom court..."
                    >
                    <div class="char-counter name-counter-${index}">
                        ${data.name.length}/20
                    </div>
                </div>
                
                <div class="field-group">
                    <label>Commentaire (optionnel, max 60 caractères)</label>
                    <textarea 
                        class="waypoint-comment" 
                        maxlength="60" 
                        data-filename="${img.name}"
                        placeholder="Description courte..."
                    >${data.comment}</textarea>
                    <div class="char-counter comment-counter-${index}">
                        ${data.comment.length}/60
                    </div>
                </div>
            </div>
        `;
        
        waypointsList.appendChild(item);
    });
    
    // Add event listeners
    document.querySelectorAll('.waypoint-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            const img = processedImages[index];
            window.open(img.previewUrl, '_blank');
        });
    });
    
    document.querySelectorAll('.waypoint-name').forEach(input => {
        input.addEventListener('input', (e) => {
            const filename = e.target.dataset.filename;
            const value = e.target.value;
            waypointData[filename].name = value;
            
            const index = Array.from(document.querySelectorAll('.waypoint-name')).indexOf(e.target);
            const counter = document.querySelector(`.name-counter-${index}`);
            counter.textContent = `${value.length}/20`;
            
            if (value.length > 15) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
        });
    });
    
    document.querySelectorAll('.waypoint-comment').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const filename = e.target.dataset.filename;
            const value = e.target.value;
            waypointData[filename].comment = value;
            
            const index = Array.from(document.querySelectorAll('.waypoint-comment')).indexOf(e.target);
            const counter = document.querySelector(`.comment-counter-${index}`);
            counter.textContent = `${value.length}/60`;
            
            if (value.length > 50) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
        });
    });
}

// Update stats
function updateStats() {
    photosCount.textContent = `${processedImages.length} photos`;
    
    const totalBytes = processedImages.reduce((sum, img) => sum + img.size, 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    totalSize.textContent = `${totalMB} MB`;
}

// Update folder preview
function updateFolderPreview() {
    const finalFolder = `${communeName}_${folderName}`;
    finalFolderPreview.textContent = finalFolder;
}

// Download modified KMZ (Step 1)
async function downloadModifiedKmz() {
    console.log('=== Génération KMZ modifié ===');
    console.log('Waypoint data:', waypointData);
    
    downloadKmzBtn.disabled = true;
    downloadKmzBtn.textContent = 'Génération du KMZ...';
    
    try {
        const zip = new JSZip();
        const finalFolder = `${communeName}_${folderName}`;
        
        // Modify KML with custom names and comments
        let modifiedKml = originalKmlContent;
        
        // IMPORTANT: Process images by finding their SPECIFIC Placemark
        processedImages.forEach(img => {
            const data = waypointData[img.name];
            const escapedName = img.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            console.log(`\nProcessing: ${img.name}`);
            console.log(`  New name: "${data.name}"`);
            console.log(`  Comment: "${data.comment}"`);
            
            // Find Placemark that has THIS specific image in its description
            const placemarkPattern = new RegExp(
                `(<Placemark>[\\s\\S]*?<description><!\\[CDATA\\[[\\s\\S]*?src="files/${escapedName}"[\\s\\S]*?\\]\\]></description>[\\s\\S]*?</Placemark>)`,
                'i'
            );
            
            const match = modifiedKml.match(placemarkPattern);
            if (!match) {
                console.log('  ✗ Placemark NOT found');
                return;
            }
            
            let placemark = match[1];
            console.log('  ✓ Found Placemark');
            
            // Replace name
            const namePattern = /(<name><!\[CDATA\[)([^\]]*)(]\]><\/name>)/i;
            placemark = placemark.replace(namePattern, `$1${data.name}$3`);
            console.log(`  ✓ Name replaced`);
            
            // Add comment
            if (data.comment) {
                const descPattern = /(<description><!\[CDATA\[)/i;
                placemark = placemark.replace(descPattern, 
                    `$1<p style="font-weight:600;margin-bottom:10px;color:#2563eb;">${data.comment}</p>`);
                console.log(`  ✓ Comment added`);
            }
            
            // Replace in main KML
            modifiedKml = modifiedKml.replace(match[1], placemark);
        });
        
        // Add modified KML
        zip.file('doc.kml', modifiedKml);
        
        // Add optimized images
        const filesFolder = zip.folder('files');
        processedImages.forEach(img => {
            filesFolder.file(img.name, img.blob);
        });
        
        // Generate and download
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${communeName}_${folderName}.kmz`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        
        downloadKmzBtn.disabled = false;
        downloadKmzBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            1. KMZ modifié (à uploader sur GitHub)
        `;
        
        console.log('=== KMZ généré avec succès ===');
        
    } catch (error) {
        console.error('Erreur génération KMZ:', error);
        alert('Erreur lors de la génération du KMZ: ' + error.message);
        downloadKmzBtn.disabled = false;
        downloadKmzBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            1. KMZ modifié (à uploader sur GitHub)
        `;
    }
}

// Download final KML with GitHub links (Step 2)
async function downloadFinalKml() {
    console.log('=== Génération KML final ===');
    
    downloadKmlBtn.disabled = true;
    downloadKmlBtn.textContent = 'Génération du KML...';
    
    try {
        const baseUrl = githubBaseInput.value.trim();
        if (!baseUrl) {
            throw new Error('URL GitHub requise');
        }
        
        const finalFolder = `${communeName}_${folderName}`;
        const githubBase = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + finalFolder + '/';
        
        console.log('URL GitHub base:', githubBase);
        
        // Start with modified KML (with names and comments)
        let finalKml = originalKmlContent;
        
        // Apply names and comments
        processedImages.forEach(img => {
            const data = waypointData[img.name];
            const localPath = `files/${img.name}`;
            
            console.log(`\nProcessing for KML: ${img.name}`);
            
            // Escape the filename for regex
            const escapedPath = localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Find the Placemark containing this image
            const placemarkRegex = new RegExp(
                `<Placemark>([\\s\\S]*?<img[^>]*src="${escapedPath}"[^>]*>[\\s\\S]*?)</Placemark>`,
                'i'
            );
            
            const placemarkMatch = finalKml.match(placemarkRegex);
            
            if (placemarkMatch) {
                const placemarkContent = placemarkMatch[0];
                
                // Replace the name
                const nameRegex = /(<n><!\[CDATA\[)([^\]]*)(]\]><\/name>)/i;
                const updatedPlacemark = placemarkContent.replace(nameRegex, `$1${data.name}$3`);
                
                finalKml = finalKml.replace(placemarkContent, updatedPlacemark);
            }
            
            // Add comment to description
            if (data.comment) {
                const descPattern = new RegExp(
                    `(<Placemark>[\\s\\S]*?<description><!\\[CDATA\\[)(<table[^>]*>[\\s\\S]*?<img[^>]*src="${escapedPath}"[^>]*>[\\s\\S]*?</table>)`,
                    'i'
                );
                
                finalKml = finalKml.replace(descPattern, 
                    `$1<p style="font-weight:600;margin-bottom:10px;color:#2563eb;">${data.comment}</p>$2`);
            }
        });
        
        // Add "Agrandir" links BEFORE replacing paths
        processedImages.forEach(img => {
            const githubUrl = githubBase + img.name;
            const localPath = `files/${img.name}`;
            
            // Find description and add link before ]]></description>
            const descriptionPattern = new RegExp(
                `(<Placemark>[\\s\\S]*?<img[^>]*src="${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[\\s\\S]*?<description><!\\[CDATA\\[[\\s\\S]*?</table>)(\\s*)(\\]\\]></description>)`,
                'i'
            );
            
            const match = finalKml.match(descriptionPattern);
            
            if (match && !match[0].includes('Agrandir')) {
                const linkHTML = `<br/><br/><div style="text-align:center;margin-top:15px;"><a href="${githubUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">🔍 Agrandir l'image</a></div>`;
                
                finalKml = finalKml.replace(match[0], match[1] + linkHTML + match[2] + match[3]);
                console.log(`  ✓ Lien "Agrandir" ajouté`);
            }
        });
        
        // Replace all files/ with GitHub URLs
        processedImages.forEach(img => {
            const localPath = `files/${img.name}`;
            const githubUrl = githubBase + img.name;
            
            finalKml = finalKml.replace(new RegExp(localPath, 'g'), githubUrl);
        });
        
        // Download
        const blob = new Blob([finalKml], { type: 'application/vnd.google-earth.kml+xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${communeName}_${folderName}.kml`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        
        downloadKmlBtn.disabled = false;
        downloadKmlBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            2. KML final (avec liens GitHub)
        `;
        
        console.log('=== KML généré avec succès ===');
        
    } catch (error) {
        console.error('Erreur génération KML:', error);
        alert('Erreur lors de la génération du KML: ' + error.message);
        downloadKmlBtn.disabled = false;
        downloadKmlBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            2. KML final (avec liens GitHub)
        `;
    }
}

// Reset app
function resetApp() {
    originalKmlContent = '';
    processedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    processedImages = [];
    folderName = '';
    communeName = '';
    startCoordinates = null;
    waypointData = {};
    
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    editSection.style.display = 'none';
    
    fileInput.value = '';
    progress.style.width = '0%';
    progressText.textContent = '0%';
}
