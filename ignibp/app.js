// Application ignibp - Calculateur d'indice IBP pour randonnées

class IgnibpApp {
    constructor() {
        this.map = null;
        this.currentLayer = null;
        this.gpxLayer = null;
        this.currentMapType = 'ign';
        this.currentGPXData = null; // Stocker les données GPX pour recalcul
        this.init();
    }
    
    init() {
        // Initialiser la carte
        this.initMap();
        
        // Événements
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('uploadZone').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        // Drag and drop
        const uploadZone = document.getElementById('uploadZone');
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
            if (files.length > 0) {
                this.processGPX(files[0]);
            }
        });
        
        // Boutons de sélection de carte
        document.querySelectorAll('.map-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.switchMapLayer(e.target.dataset.layer);
            });
        });
        
        // Changement des paramètres de calcul
        document.getElementById('smoothing').addEventListener('change', () => {
            if (this.currentGPXData) {
                this.reprocessWithNewSettings();
            }
        });
        
        document.getElementById('threshold').addEventListener('change', () => {
            if (this.currentGPXData) {
                this.reprocessWithNewSettings();
            }
        });
        
        // Enregistrer le service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(() => {
                console.log('Service Worker enregistré');
            });
        }
    }
    
    reprocessWithNewSettings() {
        // Recalculer avec les nouveaux paramètres
        if (!this.currentGPXData) return;
        
        const stats = this.calculateStats(this.currentGPXData.points);
        const ibp = this.calculateIBP(stats);
        this.displayResults(ibp, stats);
        this.drawTrack(stats.smoothedPoints || this.currentGPXData.points);
    }
    
    initMap() {
        // Initialiser Leaflet
        this.map = L.map('map').setView([45.5, 5.9], 8);
        
        // Couche IGN
        this.layers = {
            ign: L.tileLayer('https://wxs.ign.fr/cartes/geoportail/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
                attribution: '&copy; <a href="https://www.ign.fr/">IGN</a>',
                maxZoom: 18
            }),
            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            })
        };
        
        this.currentLayer = this.layers.ign;
        this.currentLayer.addTo(this.map);
    }
    
    switchMapLayer(layerType) {
        if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
        }
        this.currentLayer = this.layers[layerType];
        this.currentLayer.addTo(this.map);
        this.currentMapType = layerType;
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processGPX(file);
        }
    }
    
    async processGPX(file) {
        if (!file.name.endsWith('.gpx')) {
            this.showError('Veuillez sélectionner un fichier GPX valide');
            return;
        }
        
        this.showLoading();
        
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(text, 'text/xml');
            
            // Extraire les points de trace
            const points = this.extractTrackPoints(gpxDoc);
            
            if (points.length < 2) {
                throw new Error('Le fichier GPX ne contient pas suffisamment de points');
            }
            
            // Stocker les données pour recalcul si paramètres changent
            this.currentGPXData = { points };
            
            // Calculer les statistiques (avec lissage intégré)
            const stats = this.calculateStats(points);
            
            // Calculer l'indice IBP
            const ibp = this.calculateIBP(stats);
            
            // Afficher les résultats
            this.displayResults(ibp, stats);
            
            // Tracer le parcours sur la carte avec les points lissés
            this.drawTrack(stats.smoothedPoints || points);
            
        } catch (error) {
            this.showError('Erreur lors du traitement du fichier GPX: ' + error.message);
        }
    }
    
    extractTrackPoints(gpxDoc) {
        const points = [];
        const trkpts = gpxDoc.getElementsByTagName('trkpt');
        
        for (let i = 0; i < trkpts.length; i++) {
            const pt = trkpts[i];
            const lat = parseFloat(pt.getAttribute('lat'));
            const lon = parseFloat(pt.getAttribute('lon'));
            const eleNode = pt.getElementsByTagName('ele')[0];
            const ele = eleNode ? parseFloat(eleNode.textContent) : null;
            
            if (!isNaN(lat) && !isNaN(lon) && ele !== null) {
                points.push({ lat, lon, ele });
            }
        }
        
        return points;
    }
    
    smoothElevations(points, windowSize = 5) {
        // Lissage par moyenne mobile pour réduire le bruit
        // windowSize = nombre de points pour la moyenne (doit être impair)
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < points.length; i++) {
            const start = Math.max(0, i - halfWindow);
            const end = Math.min(points.length - 1, i + halfWindow);
            
            let sum = 0;
            let count = 0;
            
            for (let j = start; j <= end; j++) {
                sum += points[j].ele;
                count++;
            }
            
            smoothed.push({
                ...points[i],
                ele: sum / count,
                eleOriginal: points[i].ele // Conserver l'altitude originale
            });
        }
        
        return smoothed;
    }
    
    calculateStats(points) {
        // Récupérer les paramètres depuis l'interface
        const windowSize = parseInt(document.getElementById('smoothing')?.value || 5);
        const ELEVATION_THRESHOLD = parseFloat(document.getElementById('threshold')?.value || 1.5);
        
        // Appliquer un lissage des altitudes pour réduire le bruit
        const smoothedPoints = this.smoothElevations(points, windowSize);
        
        let totalDistance = 0;
        let positiveElevation = 0;
        let negativeElevation = 0;
        let minEle = Infinity;
        let maxEle = -Infinity;
        const slopes = [];
        
        // Calcul du D+ avec seuil minimum pour ignorer les micro-variations
        let cumulativeUp = 0;
        let cumulativeDown = 0;
        
        for (let i = 0; i < smoothedPoints.length - 1; i++) {
            const p1 = smoothedPoints[i];
            const p2 = smoothedPoints[i + 1];
            
            // Calcul de la distance (formule de Haversine)
            const distance = this.haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
            totalDistance += distance;
            
            // Dénivelé avec seuil
            const elevDiff = p2.ele - p1.ele;
            
            if (elevDiff > 0) {
                cumulativeUp += elevDiff;
                // N'ajouter que si le cumul dépasse le seuil
                if (cumulativeUp >= ELEVATION_THRESHOLD) {
                    positiveElevation += cumulativeUp;
                    cumulativeUp = 0;
                }
            } else {
                cumulativeDown += Math.abs(elevDiff);
                // N'ajouter que si le cumul dépasse le seuil
                if (cumulativeDown >= ELEVATION_THRESHOLD) {
                    negativeElevation += cumulativeDown;
                    cumulativeDown = 0;
                }
            }
            
            // Min/Max altitude (utiliser les valeurs lissées)
            minEle = Math.min(minEle, p1.ele, p2.ele);
            maxEle = Math.max(maxEle, p1.ele, p2.ele);
            
            // Pente (en pourcentage) - utiliser les données lissées
            if (distance > 0) {
                const slope = (elevDiff / distance) * 100;
                slopes.push(slope);
            }
        }
        
        // Ajouter les cumuls restants s'ils sont significatifs
        if (cumulativeUp >= ELEVATION_THRESHOLD) {
            positiveElevation += cumulativeUp;
        }
        if (cumulativeDown >= ELEVATION_THRESHOLD) {
            negativeElevation += cumulativeDown;
        }
        
        return {
            distance: totalDistance / 1000, // en km
            positiveElevation,
            negativeElevation,
            minEle,
            maxEle,
            slopes,
            smoothedPoints // Retourner les points lissés pour le tracé
        };
    }
    
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Rayon de la Terre en mètres
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
    
    calculateIBP(stats) {
        // Algorithme IBP approximatif
        // IBP = (D + (D+ × 2) + (D- × 0.5)) × C
        // D = distance en km
        // D+ = dénivelé positif en hm
        // D- = dénivelé négatif en hm
        // C = coefficient de difficulté basé sur la pente moyenne
        
        const D = stats.distance;
        const Dplus = stats.positiveElevation / 100; // en hectomètres
        const Dminus = stats.negativeElevation / 100;
        
        // Coefficient basé sur la difficulté
        const avgSlope = stats.positiveElevation / (stats.distance * 1000) * 100;
        let C = 1.0;
        if (avgSlope > 15) C = 1.5;
        else if (avgSlope > 10) C = 1.3;
        else if (avgSlope > 7) C = 1.2;
        else if (avgSlope > 5) C = 1.1;
        
        const ibp = Math.round((D + (Dplus * 2) + (Dminus * 0.5)) * C);
        
        return {
            value: ibp,
            difficulty: this.getDifficultyLevel(ibp),
            description: this.getDifficultyDescription(ibp)
        };
    }
    
    getDifficultyLevel(ibp) {
        if (ibp < 25) return 'Très facile';
        if (ibp < 50) return 'Facile';
        if (ibp < 75) return 'Modéré';
        if (ibp < 100) return 'Difficile';
        if (ibp < 125) return 'Très difficile';
        return 'Extrêmement difficile';
    }
    
    getDifficultyDescription(ibp) {
        if (ibp < 25) return 'Accessible à tous, idéal pour une promenade familiale';
        if (ibp < 50) return 'Randonnée accessible, peu d\'effort requis';
        if (ibp < 75) return 'Effort modéré, bonne condition physique recommandée';
        if (ibp < 100) return 'Effort soutenu, nécessite une bonne préparation';
        if (ibp < 125) return 'Très exigeant, pour randonneurs expérimentés';
        return 'Extrême, réservé aux randonneurs chevronnés';
    }
    
    displayResults(ibp, stats) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="result-card">
                <div style="font-size: 1rem; opacity: 0.95;">Indice IBP</div>
                <div class="ibp-value">${ibp.value}</div>
                <div class="difficulty-label">${ibp.difficulty}</div>
                <div style="opacity: 0.9; font-size: 0.95rem; line-height: 1.5;">${ibp.description}</div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Distance</div>
                        <div class="stat-value">${stats.distance.toFixed(2)} km</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">D+</div>
                        <div class="stat-value">${Math.round(stats.positiveElevation)} m</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">D-</div>
                        <div class="stat-value">${Math.round(stats.negativeElevation)} m</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Altitude</div>
                        <div class="stat-value">${Math.round(stats.minEle)}-${Math.round(stats.maxEle)} m</div>
                    </div>
                </div>
            </div>
        `;
        
        // Animation d'apparition
        setTimeout(() => {
            resultsDiv.querySelector('.result-card').classList.add('show');
        }, 100);
    }
    
    drawTrack(points) {
        // Supprimer la couche précédente si elle existe
        if (this.gpxLayer) {
            this.map.removeLayer(this.gpxLayer);
        }
        
        // Créer un groupe de couches
        this.gpxLayer = L.layerGroup();
        
        // Créer les segments avec gradient de couleur basé sur la pente
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculer la pente
            const distance = this.haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
            const elevDiff = p2.ele - p1.ele;
            const slope = distance > 0 ? (elevDiff / distance) * 100 : 0;
            
            // Déterminer la couleur basée sur la pente
            const color = this.getSlopeColor(slope);
            
            // Créer le segment
            const segment = L.polyline(
                [[p1.lat, p1.lon], [p2.lat, p2.lon]],
                {
                    color: color,
                    weight: 4,
                    opacity: 0.8
                }
            );
            
            // Ajouter une infobulle
            segment.bindPopup(`
                <strong>Pente:</strong> ${slope.toFixed(1)}%<br>
                <strong>Altitude:</strong> ${Math.round(p1.ele)} m → ${Math.round(p2.ele)} m
            `);
            
            this.gpxLayer.addLayer(segment);
        }
        
        // Ajouter des marqueurs au départ et à l'arrivée
        const start = points[0];
        const end = points[points.length - 1];
        
        const startMarker = L.marker([start.lat, start.lon], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">D</div>',
                iconSize: [30, 30]
            })
        }).bindPopup(`<strong>Départ</strong><br>Altitude: ${Math.round(start.ele)} m`);
        
        const endMarker = L.marker([end.lat, end.lon], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #dc2626; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">A</div>',
                iconSize: [30, 30]
            })
        }).bindPopup(`<strong>Arrivée</strong><br>Altitude: ${Math.round(end.ele)} m`);
        
        this.gpxLayer.addLayer(startMarker);
        this.gpxLayer.addLayer(endMarker);
        
        // Ajouter la couche à la carte
        this.gpxLayer.addTo(this.map);
        
        // Ajuster la vue pour afficher tout le parcours
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    getSlopeColor(slope) {
        // Gradient de couleur basé sur la pente
        if (slope < 5) return '#10b981'; // Vert
        if (slope < 10) return '#fbbf24'; // Jaune
        if (slope < 15) return '#f59e0b'; // Orange
        if (slope < 20) return '#f97316'; // Orange foncé
        return '#dc2626'; // Rouge
    }
    
    showLoading() {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Traitement du fichier GPX...</p>
            </div>
        `;
    }
    
    showError(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="error">
                <strong>❌ Erreur</strong><br>
                ${message}
            </div>
        `;
    }
}

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', () => {
    new IgnibpApp();
});
