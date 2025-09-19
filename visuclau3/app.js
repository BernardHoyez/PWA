class FieldGuideApp {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = [];
        this.pois = [];
        this.userPosition = null;
        this.zipData = null;
        this.watchId = null;
        this.deferredPrompt = null;
        this.swRegistration = null;
        
        this.initMap();
        this.initEventListeners();
        this.initPWA();
        this.startGeolocation();
    }

    initMap() {
        // Initialize map centered on France
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([46.603354, 1.888334], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 2
        }).addTo(this.map);

        // Add loading control
        this.map.on('loading', () => {
            document.getElementById('loading').style.display = 'block';
        });
        
        this.map.on('load', () => {
            document.getElementById('loading').style.display = 'none';
        });
    }

    initEventListeners() {
        document.getElementById('zipFile').addEventListener('change', (e) => {
            this.handleZipUpload(e.target.files[0]);
        });

        // Handle install prompt
        document.getElementById('installBtn').addEventListener('click', () => {
            this.installPWA();
        });

        document.getElementById('closeInstall').addEventListener('click', () => {
            document.getElementById('installPrompt').style.display = 'none';
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 100);
        });

        // Handle visibility changes (battery optimization)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('App en arrière-plan');
            } else {
                console.log('App au premier plan');
                if (this.userPosition) {
                    // Refresh location when app becomes visible
                    this.startGeolocation();
                }
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            console.log('Connexion rétablie');
            this.updateStatus('En ligne', true);
        });

        window.addEventListener('offline', () => {
            console.log('Mode hors ligne');
            this.updateStatus('Hors ligne', false);
        });
    }

    async initPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            await this.registerServiceWorker();
        }

        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('installPrompt').style.display = 'flex';
        });

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installée avec succès');
            document.getElementById('installPrompt').style.display = 'none';
        });
    }

    async registerServiceWorker() {
        try {
            this.swRegistration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker enregistré:', this.swRegistration);

            // Check for updates
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });

        } catch (error) {
            console.error('Erreur Service Worker:', error);
        }
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div>
                <strong>Mise à jour disponible</strong>
                <div style="font-size: 0.9rem; margin-top: 0.25rem;">
                    Une nouvelle version de l'application est disponible.
                </div>
            </div>
            <button onclick="app.updateApp()">Mettre à jour</button>
        `;
        notification.style.display = 'flex';
        document.body.appendChild(notification);

        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 10000);
    }

    updateApp() {
        if (this.swRegistration && this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log('Résultat installation:', outcome);
            this.deferredPrompt = null;
            document.getElementById('installPrompt').style.display = 'none';
        }
    }

    startGeolocation() {
        if (!navigator.geolocation) {
            this.updateStatus('Géolocalisation non supportée', false);
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
        };

        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onLocationSuccess(position),
            (error) => this.onLocationError(error),
            options
        );
    }

    onLocationSuccess(position) {
        this.userPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };

        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        // Create pulsing GPS marker with custom icon
        const gpsIcon = L.divIcon({
            className: 'custom-gps-marker',
            html: '<div class="gps-marker-icon"></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        this.userMarker = L.marker([this.userPosition.lat, this.userPosition.lng], {
            icon: gpsIcon,
            title: `Position actuelle (±${Math.round(this.userPosition.accuracy)}m)`
        }).addTo(this.map);

        this.updateStatus(`GPS actif (±${Math.round(this.userPosition.accuracy)}m)`, true);
        this.updateDistances();
    }

    onLocationError(error) {
        console.error('Erreur géolocalisation:', error);
        let message = 'GPS inactif';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS refusé';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS indisponible';
                break;
            case error.TIMEOUT:
                message = 'GPS timeout';
                break;
        }
        
        this.updateStatus(message, false);
    }

    updateStatus(text, gpsActive) {
        document.getElementById('statusText').textContent = text;
        const indicator = document.getElementById('gpsIndicator');
        
        if (gpsActive) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }

    async handleZipUpload(file) {
        if (!file) return;

        document.getElementById('loading').style.display = 'block';
        this.updateStatus('Chargement du fichier...', false);

        try {
            const zip = new JSZip();
            this.zipData = await zip.loadAsync(file);
            
            await this.loadVisitData();
            this.updateStatus(`${this.pois.length} POI chargés`, true);
        } catch (error) {
            console.error('Erreur chargement ZIP:', error);
            this.showError(`Erreur lors du chargement: ${error.message}`);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async loadVisitData() {
        try {
            const visitJsonFile = this.zipData.file('visit.json');
            if (!visitJsonFile) {
                throw new Error('Fichier visit.json non trouvé dans le ZIP');
            }

            const visitJsonText = await visitJsonFile.async('string');
            console.log('Contenu visit.json:', visitJsonText.substring(0, 200) + '...');
            
            let visitData;
            try {
                visitData = JSON.parse(visitJsonText);
            } catch (jsonError) {
                throw new Error(`Format JSON invalide: ${jsonError.message}`);
            }

            // Vérifier que c'est bien un tableau
            if (!Array.isArray(visitData)) {
                console.error('visit.json n\'est pas un tableau:', typeof visitData, visitData);
                
                // Essayer de récupérer un tableau s'il est dans une propriété
                if (visitData && typeof visitData === 'object') {
                    // Chercher une propriété qui contient un tableau
                    const possibleArrays = Object.keys(visitData).filter(key => Array.isArray(visitData[key]));
                    if (possibleArrays.length > 0) {
                        console.log('Tableau trouvé dans la propriété:', possibleArrays[0]);
                        visitData = visitData[possibleArrays[0]];
                    } else {
                        throw new Error('visit.json doit contenir un tableau de POI. Format actuel: ' + typeof visitData);
                    }
                } else {
                    throw new Error('visit.json doit être un tableau JSON, reçu: ' + typeof visitData);
                }
            }

            console.log(`Chargement de ${visitData.length} POI depuis visit.json`);
            this.pois = [];

            for (const item of visitData) {
                if (!item || typeof item !== 'object') {
                    console.warn('POI invalide ignoré:', item);
                    continue;
                }
                
                const poi = await this.loadPOI(item);
                if (poi) {
                    this.pois.push(poi);
                }
            }

            if (this.pois.length === 0) {
                throw new Error('Aucun point d\'intérêt valide trouvé dans le fichier');
            }

            console.log(`${this.pois.length} POI chargés avec succès`);
            this.displayPOIsOnMap();
            this.fitMapToPOIs();
        } catch (error) {
            console.error('Erreur détaillée:', error);
            throw new Error(`Erreur chargement données: ${error.message}`);
        }
    }

    async loadPOI(item) {
        try {
            const folderPath = `data/${item.folder}/`;
            const poi = { ...item };

            // Load text files with error handling
            if (item.titleFile) {
                const titleFile = this.zipData.file(folderPath + item.titleFile);
                poi.title = titleFile ? (await titleFile.async('string')).trim() : `POI ${item.id}`;
            } else {
                poi.title = `POI ${item.id}`;
            }

            if (item.locationFile) {
                const locationFile = this.zipData.file(folderPath + item.locationFile);
                if (locationFile) {
                    const locationText = await locationFile.async('string');
                    poi.coordinates = this.parseLocation(locationText);
                }
            }

            if (item.commentFile) {
                const commentFile = this.zipData.file(folderPath + item.commentFile);
                poi.comment = commentFile ? (await commentFile.async('string')).trim() : '';
            }

            // Load media files as blob URLs
            await this.loadMediaFiles(poi, folderPath, item);

            return poi;
        } catch (error) {
            console.error(`Erreur chargement POI ${item.id}:`, error);
            return null;
        }
    }

    async loadMediaFiles(poi, folderPath, item) {
        const mediaTypes = [
            { key: 'image', prop: 'imageUrl', mimeType: 'image/jpeg' },
            { key: 'video', prop: 'videoUrl', mimeType: 'video/mp4' },
            { key: 'audio', prop: 'audioUrl', mimeType: 'audio/mpeg' }
        ];

        for (const media of mediaTypes) {
            if (item[media.key]) {
                try {
                    const mediaFile = this.zipData.file(folderPath + item[media.key]);
                    if (mediaFile) {
                        const blob = await mediaFile.async('blob');
                        const typedBlob = new Blob([blob], { type: media.mimeType });
                        poi[media.prop] = URL.createObjectURL(typedBlob);
                    }
                } catch (error) {
                    console.error(`Erreur chargement ${media.key} pour POI ${item.id}:`, error);
                }
            }
        }
    }

    parseLocation(locationText) {
        const lines = locationText.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
            // Multiple coordinate formats
            const patterns = [
                /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/,
                /lat[:\s]*(-?\d+\.?\d*)[,\s]*lon[:\s]*(-?\d+\.?\d*)/i,
                /latitude[:\s]*(-?\d+\.?\d*)[,\s]*longitude[:\s]*(-?\d+\.?\d*)/i,
                /(\d+\.?\d*)[°\s]*[NS][,\s]*(\d+\.?\d*)[°\s]*[EW]/i
            ];
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    let lat = parseFloat(match[1]);
                    let lng = parseFloat(match[2]);
                    
                    // Handle N/S E/W notation
                    if (line.includes('S') || line.includes('Sud')) lat = -lat;
                    if (line.includes('W') || line.includes('Ouest')) lng = -lng;
                    
                    // Validate coordinates
                    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        return { lat, lng };
                    }
                }
            }
        }
        
        return null;
    }

    displayPOIsOnMap() {
        // Clear existing markers
        this.poiMarkers.forEach(marker => this.map.removeLayer(marker));
        this.poiMarkers = [];

        // Group POIs by coordinates
        const poiGroups = {};
        
        this.pois.forEach(poi => {
            if (!poi.coordinates) return;
            
            const key = `${poi.coordinates.lat.toFixed(6)},${poi.coordinates.lng.toFixed(6)}`;
            if (!poiGroups[key]) {
                poiGroups[key] = [];
            }
            poiGroups[key].push(poi);
        });

        // Create markers for each location
        Object.entries(poiGroups).forEach(([coordKey, poisAtLocation]) => {
            const coords = poisAtLocation[0].coordinates;
            
            // Create custom numbered marker
            const markerIcon = L.divIcon({
                className: 'custom-poi-marker',
                html: `<div class="poi-marker-icon">${poisAtLocation[0].id}</div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });

            const marker = L.marker([coords.lat, coords.lng], {
                icon: markerIcon,
                title: poisAtLocation.length > 1 ? 
                    `${poisAtLocation.length} POI à cette position` : 
                    poisAtLocation[0].title
            });

            marker.on('click', () => {
                if (poisAtLocation.length === 1) {
                    this.showPOIPopup(poisAtLocation[0]);
                } else {
                    this.showPOIList(poisAtLocation, coords);
                }
            });

            marker.addTo(this.map);
            this.poiMarkers.push(marker);
        });
    }

    showPOIList(pois, coords) {
        // Stocker les POIs dans une variable globale pour y accéder facilement
        window.currentPOIs = pois;
        
        let listHtml = `
            <div class="custom-popup">
                <h3>🏛️ Points d'intérêt (${pois.length})</h3>
                <div class="popup-coords">📍 ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</div>
                <div id="debug-info" style="font-size:0.8rem;color:#666;padding:0.5rem;background:#f0f0f0;margin-bottom:0.5rem;border-radius:6px;">
                    Status: Liste chargée - Cliquez sur un POI
                </div>
                <div class="poi-list">
        `;
        
        pois.forEach((poi, index) => {
            // Méthode simple : utiliser onclick directement dans le HTML
            listHtml += `
                <div class="poi-item-wrapper">
                    <div class="poi-item" onclick="selectPOI(${poi.id})">
                        <div class="poi-item-icon">${poi.id}</div>
                        <div class="poi-item-content">
                            <div class="poi-item-title">${poi.title || `POI ${poi.id}`}</div>
                            ${poi.comment ? `<div class="poi-item-preview">${poi.comment.substring(0, 40)}...</div>` : ''}
                        </div>
                        <div class="poi-item-arrow">▶</div>
                    </div>
                </div>
            `;
        });
        
        listHtml += `
                </div>
                <div style="margin-top:1rem;padding:0.75rem;background:#e6f3ff;border-radius:6px;font-size:0.85rem;color:#0066cc;">
                    💡 Tapez sur un titre pour ouvrir sa fiche détaillée
                </div>
            </div>
        `;
        
        const popup = L.popup({
            maxWidth: Math.min(window.innerWidth * 0.9, 450),
            className: 'multi-poi-popup',
            closeButton: true,
            autoClose: false
        })
        .setLatLng([coords.lat, coords.lng])
        .setContent(listHtml)
        .openOn(this.map);

        // Définir la fonction globale pour la sélection de POI
        window.selectPOI = (poiId) => {
            const debugEl = document.getElementById('debug-info');
            if (debugEl) {
                debugEl.textContent = `Status: Sélection POI ${poiId}...`;
                debugEl.style.background = '#d4edda';
                debugEl.style.color = '#155724';
            }
            
            const selectedPoi = window.currentPOIs.find(p => p.id === poiId);
            if (selectedPoi) {
                if (debugEl) {
                    debugEl.textContent = `Status: POI trouvé - ${selectedPoi.title}`;
                }
                
                // Fermer la liste
                this.map.closePopup();
                
                // Ouvrir le POI après un délai
                setTimeout(() => {
                    this.showPOIPopup(selectedPoi);
                }, 200);
            } else {
                if (debugEl) {
                    debugEl.textContent = `Status: ERREUR - POI ${poiId} non trouvé`;
                    debugEl.style.background = '#f8d7da';
                    debugEl.style.color = '#721c24';
                }
            }
        };

        // Nettoyer quand le popup se ferme
        popup.on('remove', () => {
            delete window.selectPOI;
            delete window.currentPOIs;
        });
    }

    showPOIPopup(poi) {
        if (!poi.coordinates) return;

        const distance = this.calculateDistance(poi.coordinates);
        const azimuth = this.calculateAzimuth(poi.coordinates);

        let popupContent = `
            <div class="custom-popup">
                <h3>🗺️ ${poi.title || `POI ${poi.id}`}</h3>
                <div class="popup-coords">📍 ${poi.coordinates.lat.toFixed(6)}, ${poi.coordinates.lng.toFixed(6)}</div>
        `;

        if (distance !== null) {
            const distanceText = distance > 1000 ? 
                `${(distance/1000).toFixed(1)} km` : 
                `${distance.toFixed(0)} m`;
            popupContent += `<div class="popup-distance">🧭 ${distanceText} - ${azimuth}</div>`;
        }

        if (poi.comment) {
            popupContent += `<div class="popup-comment">${poi.comment.replace(/\n/g, '<br>')}</div>`;
        }

        popupContent += '<div class="popup-media">';

        if (poi.imageUrl) {
            popupContent += `<img src="${poi.imageUrl}" alt="Image ${poi.title}" loading="lazy" onclick="window.open(this.src, '_blank')">`;
        }

        if (poi.videoUrl) {
            popupContent += `
                <video controls preload="metadata" playsinline>
                    <source src="${poi.videoUrl}" type="video/mp4">
                    Votre navigateur ne supporte pas la vidéo.
                </video>
            `;
        }

        if (poi.audioUrl) {
            popupContent += `
                <audio controls preload="metadata">
                    <source src="${poi.audioUrl}" type="audio/mpeg">
                    Votre navigateur ne supporte pas l'audio.
                </audio>
            `;
        }

        popupContent += '</div></div>';

        L.popup({
            maxWidth: Math.min(window.innerWidth * 0.85, 500),
            className: 'poi-popup'
        })
        .setLatLng([poi.coordinates.lat, poi.coordinates.lng])
        .setContent(popupContent)
        .openOn(this.map);
    }

    calculateDistance(coords) {
        if (!this.userPosition) return null;

        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(coords.lat - this.userPosition.lat);
        const dLng = this.toRadians(coords.lng - this.userPosition.lng);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(this.toRadians(this.userPosition.lat)) * Math.cos(this.toRadians(coords.lat)) *
                 Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateAzimuth(coords) {
        if (!this.userPosition) return '';

        const dLng = this.toRadians(coords.lng - this.userPosition.lng);
        const lat1 = this.toRadians(this.userPosition.lat);
        const lat2 = this.toRadians(coords.lat);

        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

        const bearing = this.toDegrees(Math.atan2(y, x));
        const normalizedBearing = (bearing + 360) % 360;

        return `Nord ${normalizedBearing.toFixed(0)}°`;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    fitMapToPOIs() {
        if (this.pois.length === 0) return;

        const validPOIs = this.pois.filter(poi => poi.coordinates);
        if (validPOIs.length === 0) return;

        if (validPOIs.length === 1) {
            // Single POI - center on it with reasonable zoom
            const poi = validPOIs[0];
            this.map.setView([poi.coordinates.lat, poi.coordinates.lng], 15);
        } else {
            // Multiple POIs - fit bounds
            const group = new L.featureGroup(this.poiMarkers.filter(marker => marker.getLatLng()));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    updateDistances() {
        // Called when user position changes - distances are calculated on popup display
        if (this.userPosition && this.pois.length > 0) {
            console.log('Position mise à jour, distances recalculables');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `⚠️ ${message}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 6000);
    }

    // Cleanup method
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        // Revoke blob URLs to free memory
        this.pois.forEach(poi => {
            if (poi.imageUrl) URL.revokeObjectURL(poi.imageUrl);
            if (poi.videoUrl) URL.revokeObjectURL(poi.videoUrl);
            if (poi.audioUrl) URL.revokeObjectURL(poi.audioUrl);
        });
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FieldGuideApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});