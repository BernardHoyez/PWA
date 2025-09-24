// Générateur d'icônes PWA en JavaScript
class IconGenerator {
    constructor() {
        this.iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // Génère une icône SVG de base
    generateBaseSVG(size = 512) {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#3498db;stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <!-- Background -->
                <rect width="${size}" height="${size}" rx="${size * 0.15}" ry="${size * 0.15}" fill="url(#bg)"/>
                
                <!-- Map container -->
                <rect x="${size * 0.125}" y="${size * 0.1875}" width="${size * 0.75}" height="${size * 0.625}" rx="${size * 0.047}" ry="${size * 0.047}" fill="#2ecc71" opacity="0.9"/>
                
                <!-- POI Markers -->
                <g>
                    <circle cx="${size * 0.3125}" cy="${size * 0.35}" r="${size * 0.039}" fill="#e74c3c" stroke="white" stroke-width="${size * 0.008}"/>
                    <text x="${size * 0.3125}" y="${size * 0.367}" font-family="Arial, sans-serif" font-size="${size * 0.027}" font-weight="bold" fill="white" text-anchor="middle">1</text>
                    
                    <circle cx="${size * 0.547}" cy="${size * 0.43}" r="${size * 0.039}" fill="#3498db" stroke="white" stroke-width="${size * 0.008}"/>
                    <text x="${size * 0.547}" y="${size * 0.445}" font-family="Arial, sans-serif" font-size="${size * 0.027}" font-weight="bold" fill="white" text-anchor="middle">2</text>
                    
                    <circle cx="${size * 0.664}" cy="${size * 0.35}" r="${size * 0.039}" fill="#9b59b6" stroke="white" stroke-width="${size * 0.008}"/>
                    <text x="${size * 0.664}" y="${size * 0.367}" font-family="Arial, sans-serif" font-size="${size * 0.027}" font-weight="bold" fill="white" text-anchor="middle">3</text>
                </g>
                
                <!-- Upload ZIP icon -->
                <g>
                    <rect x="${size * 0.742}" y="${size * 0.098}" width="${size * 0.156}" height="${size * 0.117}" rx="${size * 0.016}" ry="${size * 0.016}" fill="white" opacity="0.9"/>
                    <path d="M${size * 0.781} ${size * 0.137} L${size * 0.82} ${size * 0.166} L${size * 0.811} ${size * 0.166} L${size * 0.811} ${size * 0.186} L${size * 0.791} ${size * 0.186} L${size * 0.791} ${size * 0.166} L${size * 0.781} ${size * 0.166} Z" fill="#2c3e50"/>
                    <text x="${size * 0.82}" y="${size * 0.244}" font-family="Arial, sans-serif" font-size="${size * 0.02}" font-weight="bold" fill="white" text-anchor="middle">ZIP</text>
                </g>
            </svg>
        `;
    }

    // Génère et télécharge toutes les icônes
    async generateAllIcons() {
        console.log('🎨 Génération des icônes PWA...');
        
        for (const size of this.iconSizes) {
            try {
                await this.generatePNGIcon(size);
                console.log(`✅ Icône ${size}x${size} générée`);
            } catch (error) {
                console.error(`❌ Erreur génération ${size}x${size}:`, error);
            }
        }
        
        console.log('🎯 Toutes les icônes ont été générées !');
    }

    // Génère une icône PNG de taille spécifiée
    async generatePNGIcon(size) {
        return new Promise((resolve, reject) => {
            const svg = this.generateBaseSVG(size);
            const img = new Image();
            const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);

            this.canvas.width = size;
            this.canvas.height = size;

            img.onload = () => {
                this.ctx.clearRect(0, 0, size, size);
                this.ctx.drawImage(img, 0, 0, size, size);
                
                this.canvas.toBlob((blob) => {
                    this.downloadBlob(blob, `icon-${size}x${size}.png`);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error(`Impossible de charger l'image ${size}x${size}`));
            };

            img.src = url;
        });
    }

    // Télécharge un blob comme fichier
    downloadBlob(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Génère un favicon ICO (optionnel)
    generateFavicon() {
        const size = 32;
        const svg = this.generateBaseSVG(size);
        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        this.canvas.width = size;
        this.canvas.height = size;

        img.onload = () => {
            this.ctx.clearRect(0, 0, size, size);
            this.ctx.drawImage(img, 0, 0, size, size);
            
            this.canvas.toBlob((blob) => {
                this.downloadBlob(blob, 'favicon.ico');
                URL.revokeObjectURL(url);
            }, 'image/png');
        };

        img.src = url;
    }
}

// Utilisation
// const generator = new IconGenerator();
// generator.generateAllIcons();

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconGenerator;
}