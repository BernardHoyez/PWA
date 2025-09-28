class VisupoicApp {
    constructor() {
        this.map = null;
        this.userPosition = null;
        this.userMarker = null;
        this.watchId = null;
        this.pois = [];
        this.poiMarkers = [];
        this.mediaFiles = new Map();
        this.poiCounter = 0;
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.bindEvents();
        this.requestGeolocation();
    }
    
    initMap() {
        // Initialiser la carte centrée sur la France
        this.map = L.map('map').setView([46.603354, 1.888334], 6);
        
        // Ajouter les tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    bindEvents() {
        // Gestionnaire pour le chargement du fichier ZIP
        document.getElementById('loadZip').addEventListener('click', () => {
            const fileInput = document.getElementById('zipFile');
            if (fileInput.files.length > 0) {
                this.loadZipFile(fileInput.files[0]);
            } else {
                this.showStatus('Veuillez sélectionner un fichier ZIP');
            }
        });
        
        // Gestionnaire pour centrer la carte sur l'utilisateur
        document.getElementById('centerMap').addEventListener('click', () => {
            if (this.userPosition) {
                this.map.setView([this.userPosition.lat, this.userPosition.lng], 16);
            }
        });
        
        // Gestionnaires pour fermer les popups
        document.querySelectorAll('.popup-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.popup').classList.add('hidden');
            });
        });
        
        // Fermer popup en cliquant sur l'arrière-plan
        document.querySelectorAll('.popup').forEach(popup => {
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    popup.classList.add('hidden');
                }
            });
        });
    }
    
    requestGeolocation() {
        if ('geolocation' in navigator) {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            };
            
            // Position initiale
            navigator.geolocation.getCurrentPosition(
                (position) => this.updateUserPosition(position),
                (error) => this.handleGeolocationError(error),
                options
            );
            
            // Suivi en temps réel
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.updateUserPosition(position),
                (error) => this.handleGeolocationError(error),
                options
            );
        } else {
            this.showStatus('Géolocalisation non supportée par ce navigateur');
        }
    }
    
    updateUserPosition(position) {
        this.userPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        
        // Créer ou mettre à jour le marqueur utilisateur
        if (this.userMarker) {
            this.userMarker.setLatLng([this.userPosition.lat, this.userPosition.lng]);
        } else {
            const userIcon = L.divIcon({
                className: 'user-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            this.userMarker = L.marker([this.userPosition.lat, this.userPosition.lng], {
                icon: userIcon
            }).addTo(this.map);
        }
        
        // Activer le bouton "Me localiser"
        document.getElementById('centerMap').disabled = false;
        
        this.showStatus('Position mise à jour');
    }
    
    handleGeolocationError(error) {
        let message = 'Erreur de géolocalisation: ';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Permission refusée';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Position non disponible';
                break;
            case error.TIMEOUT:
                message += 'Timeout';
                break;
            default:
                message += 'Erreur inconnue';
                break;
        }
        this.showStatus(message);
    }
    
    async loadZipFile(file) {
        this.showStatus('Chargement du fichier ZIP...');
        
        try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            // Charger le fichier visit.json
            const visitJsonFile = zipContent.file('visit.json');
            if (!visitJsonFile) {
                throw new Error('Fichier visit.json non trouvé dans l\'archive');
            }
            
            const visitJsonText = await visitJsonFile.async('text');
            const visitData = JSON.parse(visitJsonText);
            
            // Charger les fichiers média
            await this.loadMediaFiles(zipContent);
            
            // Traiter les POIs
            this.processPois(visitData);
            
            this.showStatus(`Visite chargée: ${this.pois.length} POIs`);
            
            // Centrer la carte sur les POIs
            if (this.pois.length > 0) {
                this.fitMapToPois();
            }
            
        } catch (error) {
            this.showStatus('Erreur lors du chargement: ' + error.message);
            console.error('Erreur:', error);
        }
    }
    
    async loadMediaFiles(zipContent) {
        this.mediaFiles.clear();
        
        // Parcourir tous les fichiers du dossier data
        const dataFiles = Object.keys(zipContent.files).filter(filename => 
            filename.startsWith('data/') && !filename.endsWith('/')
        );
        
        for (const filename of dataFiles) {
            const file = zipContent.files[filename];
            const blob = await file.async('blob');
            const url = URL.createObjectURL(blob);
            
            // Extraire le nom du fichier sans le chemin
            const fileName = filename.split('/').pop();
            this.mediaFiles.set(fileName, url);
        }
    }
    
    processPois(visitData) {
        // Effacer les anciens POIs
        this.clearPois();
        this.pois = visitData.pois || visitData || [];
        this.poiCounter = 0;
        
        // Grouper les POIs par position
        const poiGroups = this.groupPoisByPosition();
        
        // Créer les marqueurs
        Object.values(poiGroups).forEach(group => {
            if (group.length === 1) {
                this.createSimplePoiMarker(group[0]);
            } else {
                this.createComplexPoiMarker(group);
            }
        });
    }
    
    groupPoisByPosition() {
        const groups = {};
        const tolerance = 0.0001; // ~11 mètres
        
        this.pois.forEach(poi => {
            const key = this.findPositionGroup(poi, groups, tolerance);
            if (key) {
                groups[key].push(poi);
            } else {
                const newKey = `${poi.lat.toFixed(6)}_${poi.lon.toFixed(6)}`;
                groups[newKey] = [poi];
            }
        });
        
        return groups;
    }
    
    findPositionGroup(poi, groups, tolerance) {
        for (const [key, group] of Object.entries(groups)) {
            const refPoi = group[0];
            if (Math.abs(poi.lat - refPoi.lat) <= tolerance && 
                Math.abs(poi.lon - refPoi.lon) <= tolerance) {
                return key;
            }
        }
        return null;
    }
    
    createSimplePoiMarker(poi) {
        this.poiCounter++;
        
        const icon = L.divIcon({
            className: 'simple-poi-marker',
            html: this.poiCounter.toString(),
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const marker = L.marker([poi.lat, poi.lon], { icon })
            .addTo(this.map)
            .on('click', () => this.showSimplePoiPopup(poi));
            
        this.poiMarkers.push(marker);
    }
    
    createComplexPoiMarker(poisGroup) {
        this.poiCounter++;
        
        const icon = L.divIcon({
            className: 'complex-poi-marker',
            html: this.poiCounter.toString(),
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const refPoi = poisGroup[0];
        const marker = L.marker([refPoi.lat, refPoi.lon], { icon })
            .addTo(this.map)
            .on('click', () => this.showComplexPoiPopup(poisGroup));
            
        this.poiMarkers.push(marker);
    }
    
    showSimplePoiPopup(poi) {
        const content = document.getElementById('poiContent');
        content.innerHTML = this.buildPoiContent(poi);
        document.getElementById('poiPopup').classList.remove('hidden');
    }
    
    showComplexPoiPopup(poisGroup) {
        const list = document.getElementById('complexPoiList');
        list.innerHTML = '';
        
        poisGroup.forEach(poi => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="complex-poi-title">${poi.title}</div>
                ${poi.comment ? `<div class="complex-poi-comment">${poi.comment}</div>` : ''}
            `;
            li.addEventListener('click', () => {
                document.getElementById('complexPoiPopup').classList.add('hidden');
                this.showSimplePoiPopup(poi);
            });
            list.appendChild(li);
        });
        
        document.getElementById('complexPoiPopup').classList.remove('hidden');
    }
    
    buildPoiContent(poi) {
        let html = `
            <div class="poi-title">${poi.title}</div>
            <div class="poi-location">Lat: ${poi.lat.toFixed(6)}, Lon: ${poi.lon.toFixed(6)}</div>
        `;
        
        if (poi.comment) {
            html += `<div class="poi-comment">${poi.comment}</div>`;
        }
        
        if (poi.image) {
            const imageUrl = this.mediaFiles.get(poi.image);
            if (imageUrl) {
                html += `<img src="${imageUrl}" alt="${poi.title}" class="poi-image">`;
            }
        }
        
        if (poi.audio) {
            const audioUrl = this.mediaFiles.get(poi.audio);
            if (audioUrl) {
                html += `<audio controls class="poi-audio"><source src="${audioUrl}" type="audio/mpeg"></audio>`;
            }
        }
        
        if (poi.video) {
            const videoName = poi.video.name || poi.video;
            const videoUrl = this.mediaFiles.get(videoName);
            if (videoUrl) {
                html += `<video controls class="poi-video"><source src="${videoUrl}" type="video/mp4"></video>`;
            }
        }
        
        // Calculer distance et azimut si position utilisateur disponible
        if (this.userPosition) {
            const distance = this.calculateDistance(
                this.userPosition.lat, this.userPosition.lng,
                poi.lat, poi.lon
            );
            const azimuth = this.calculateAzimuth(
                this.userPosition.lat, this.userPosition.lng,
                poi.lat, poi.lon
            );
            
            html += `
                <div class="poi-distance">Distance: ${distance.toFixed(0)} mètres</div>
                <div class="poi-azimuth">Direction: Nord ${azimuth.toFixed(0)}°</div>
            `;
        }
        
        return html;
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Rayon de la Terre en mètres
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    calculateAzimuth(lat1, lon1, lat2, lon2) {
        const dLon = this.toRadians(lon2 - lon1);
        const lat1Rad = this.toRadians(lat1);
        const lat2Rad = this.toRadians(lat2);
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        const azimuth = this.toDegrees(Math.atan2(y, x));
        return (azimuth + 360) % 360;
    }
    
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }
    
    fitMapToPois() {
        if (this.pois.length === 0) return;
        
        const bounds = L.latLngBounds();
        this.pois.forEach(poi => {
            bounds.extend([poi.lat, poi.lon]);
        });
        
        // Inclure la position utilisateur si disponible
        if (this.userPosition) {
            bounds.extend([this.userPosition.lat, this.userPosition.lng]);
        }
        
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }
    
    clearPois() {
        this.poiMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.poiMarkers = [];
        
        // Nettoyer les URLs des médias précédents
        this.mediaFiles.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.mediaFiles.clear();
    }
    
    showStatus(message) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        
        // Masquer automatiquement après 5 secondes
        setTimeout(() => {
            statusElement.textContent = '';
        }, 5000);
    }
    
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        this.clearPois();
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.visupoicApp = new VisupoicApp();
});

// Nettoyer lors de la fermeture
window.addEventListener('beforeunload', () => {
    if (window.visupoicApp) {
        window.visupoicApp.destroy();
    }
});