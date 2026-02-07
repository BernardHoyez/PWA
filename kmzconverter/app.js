// Configuration
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

// State
let currentFileName = '';
let processedImages = [];

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');
const processing = document.getElementById('processing');
const results = document.getElementById('results');
const statusText = document.getElementById('status-text');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const imagePreview = document.getElementById('image-preview');
const resultsSummary = document.getElementById('results-summary');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// Event Listeners
selectBtn.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
downloadBtn.addEventListener('click', downloadZip);
resetBtn.addEventListener('click', resetApp);

// Drag and Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.kmz')) {
        handleFile(files[0]);
    } else {
        alert('Veuillez sélectionner un fichier KMZ');
    }
});

// Handle File Selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Main File Handler
async function handleFile(file) {
    currentFileName = file.name.replace('.kmz', '');
    processedImages = [];
    
    // Show processing UI
    uploadZone.style.display = 'none';
    processing.style.display = 'block';
    results.style.display = 'none';
    
    try {
        await extractAndProcessKMZ(file);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du traitement du fichier KMZ: ' + error.message);
        resetApp();
    }
}

// Extract and Process KMZ
async function extractAndProcessKMZ(file) {
    updateStatus('Lecture du fichier KMZ...', 10);
    
    const zip = new JSZip();
    const kmzContent = await zip.loadAsync(file);
    
    // Find files directory
    const imageFiles = [];
    kmzContent.forEach((relativePath, zipEntry) => {
        if (relativePath.startsWith('files/') && !zipEntry.dir) {
            const ext = relativePath.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                imageFiles.push({ path: relativePath, entry: zipEntry });
            }
        }
    });
    
    if (imageFiles.length === 0) {
        throw new Error('Aucune image trouvée dans le dossier files/');
    }
    
    updateStatus(`${imageFiles.length} image(s) trouvée(s). Traitement en cours...`, 20);
    
    // Process each image
    for (let i = 0; i < imageFiles.length; i++) {
        const { path, entry } = imageFiles[i];
        const progress = 20 + (i / imageFiles.length) * 70;
        updateStatus(`Traitement de l'image ${i + 1}/${imageFiles.length}...`, progress);
        
        const blob = await entry.async('blob');
        const optimizedBlob = await optimizeImage(blob);
        
        const fileName = path.split('/').pop();
        processedImages.push({
            name: fileName,
            blob: optimizedBlob,
            url: URL.createObjectURL(optimizedBlob)
        });
    }
    
    updateStatus('Finalisation...', 95);
    showResults();
}

// Optimize Image
async function optimizeImage(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }
            
            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob
            canvas.toBlob(
                (optimizedBlob) => {
                    if (optimizedBlob) {
                        resolve(optimizedBlob);
                    } else {
                        reject(new Error('Échec de l\'optimisation'));
                    }
                },
                'image/jpeg',
                JPEG_QUALITY
            );
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Impossible de charger l\'image'));
        };
        
        img.src = url;
    });
}

// Show Results
function showResults() {
    processing.style.display = 'none';
    results.style.display = 'block';
    
    // Calculate size reduction
    const totalSize = processedImages.reduce((sum, img) => sum + img.blob.size, 0);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    resultsSummary.textContent = `${processedImages.length} image(s) optimisée(s) • Taille totale: ${sizeMB} MB`;
    
    // Display thumbnails
    imagePreview.innerHTML = '';
    processedImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.title = img.name;
        
        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.alt = img.name;
        imgEl.loading = 'lazy';
        
        div.appendChild(imgEl);
        imagePreview.appendChild(div);
    });
}

// Download ZIP
async function downloadZip() {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Génération du ZIP...';
    
    try {
        const zip = new JSZip();
        const folderName = sanitizeFileName(currentFileName);
        const folder = zip.folder(folderName);
        
        // Add images
        processedImages.forEach(img => {
            folder.file(img.name, img.blob);
        });
        
        // Create index.html for viewing
        const indexHtml = generateIndexHtml(folderName, processedImages.map(img => img.name));
        folder.file('index.html', indexHtml);
        
        // Generate ZIP
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${folderName}.zip`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Télécharger le dossier optimisé
        `;
    } catch (error) {
        console.error('Erreur lors de la génération du ZIP:', error);
        alert('Erreur lors de la génération du fichier ZIP');
        downloadBtn.disabled = false;
    }
}

// Generate Index HTML
function generateIndexHtml(folderName, imageNames) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${folderName} - Photos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2rem;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        .gallery-item {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
            cursor: pointer;
        }
        .gallery-item:hover {
            transform: translateY(-5px);
        }
        .gallery-item img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            display: block;
        }
        .gallery-item p {
            padding: 10px;
            font-size: 0.9rem;
            color: #666;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .lightbox {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .lightbox.active { display: flex; }
        .lightbox img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            cursor: pointer;
            background: none;
            border: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗺️ ${folderName}</h1>
        <div class="gallery">
${imageNames.map(name => `            <div class="gallery-item" onclick="openLightbox('${name}')">
                <img src="${name}" alt="${name}" loading="lazy">
                <p>${name}</p>
            </div>`).join('\n')}
        </div>
    </div>
    
    <div class="lightbox" id="lightbox" onclick="closeLightbox()">
        <button class="lightbox-close">&times;</button>
        <img id="lightbox-img" src="" alt="">
    </div>
    
    <script>
        function openLightbox(src) {
            document.getElementById('lightbox').classList.add('active');
            document.getElementById('lightbox-img').src = src;
        }
        function closeLightbox() {
            document.getElementById('lightbox').classList.remove('active');
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    </script>
</body>
</html>`;
}

// Utility Functions
function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function updateStatus(text, progress) {
    statusText.textContent = text;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

function resetApp() {
    uploadZone.style.display = 'block';
    processing.style.display = 'none';
    results.style.display = 'none';
    fileInput.value = '';
    currentFileName = '';
    
    // Revoke object URLs
    processedImages.forEach(img => URL.revokeObjectURL(img.url));
    processedImages = [];
}
