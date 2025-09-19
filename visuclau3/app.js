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
            { key: 'image', prop: 'imageUrl' },
            { key: 'video', prop: 'videoUrl' },
            { key: 'audio', prop: 'audioUrl' }
        ];

        for (const media of mediaTypes) {
            if (item[media.key]) {
                try {
                    console.log(`Chargement ${media.key}:`, folderPath + item[media.key]);
                    
                    const mediaFile = this.zipData.file(folderPath + item[media.key]);
                    if (mediaFile) {
                        // Lire d'abord comme arraybuffer pour les images
                        if (media.key === 'image') {
                            const arrayBuffer = await mediaFile.async('arraybuffer');
                            console.log(`Image arraybuffer:`, arrayBuffer.byteLength, 'bytes');
                            
                            // Déterminer le type MIME basé sur l'extension
                            const extension = item[media.key].toLowerCase().split('.').pop();
                            let mimeType;
                            switch (extension) {
                                case 'jpg':
                                case 'jpeg':
                                    mimeType = 'image/jpeg';
                                    break;
                                case 'png':
                                    mimeType = 'image/png';
                                    break;
                                case 'gif':
                                    mimeType = 'image/gif';
                                    break;
                                case 'webp':
                                    mimeType = 'image/webp';
                                    break;
                                default:
                                    mimeType = 'image/jpeg'; // défaut
                            }
                            
                            // Créer le blob avec le bon type MIME
                            const imageBlob = new Blob([arrayBuffer], { type: mimeType });
                            poi[media.prop] = URL.createObjectURL(imageBlob);
                            
                            console.log(`Image URL créée:`, poi[media.prop], 'type:', mimeType, 'taille:', imageBlob.size);
                            
                            // Créer aussi une version base64 comme fallback
                            const uint8Array = new Uint8Array(arrayBuffer);
                            let binaryString = '';
                            for (let i = 0; i < uint8Array.length; i++) {
                                binaryString += String.fromCharCode(uint8Array[i]);
                            }
                            const base64String = btoa(binaryString);
                            poi[media.prop + '_base64'] = `data:${mimeType};base64,${base64String}`;
                            
                            console.log(`Image base64 créée, taille:`, base64String.length, 'caractères');
                            
                        } else {
                            // Pour vidéo et audio, utiliser la méthode normale
                            const blob = await mediaFile.async('blob');
                            console.log(`${media.key} blob créé:`, blob.size, 'bytes, type:', blob.type);
                            
                            let mimeType = blob.type;
                            if (!mimeType || mimeType === 'application/octet-stream') {
                                const extension = item[media.key].toLowerCase().split('.').pop();
                                if (media.key === 'video') {
                                    mimeType = extension === 'webm' ? 'video/webm' : 'video/mp4';
                                } else if (media.key === 'audio') {
                                    mimeType = extension === 'wav' ? 'audio/wav' : 'audio/mpeg';
                                }
                            }
                            
                            const typedBlob = new Blob([blob], { type: mimeType });
                            poi[media.prop] = URL.createObjectURL(typedBlob);
                            
                            console.log(`${media.key} URL créée:`, poi[media.prop], 'type:', mimeType);
                        }
                        
                    } else {
                        console.warn(`Fichier ${media.key} non trouvé:`, folderPath + item[media.key]);
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
        // Version ultra-simplifiée avec debug intégré
        
        let listHtml = `
            <div style="padding: 1rem; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 1rem 0; color: #333;">🏛️ Sélectionner un POI (${pois.length})</h3>
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
                    📍 ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}
                </div>
        `;
        
        // Ajouter chaque POI avec style inline pour éviter les problèmes CSS
        pois.forEach((poi, index) => {
            listHtml += `
                <div style="
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    margin: 0.5rem 0;
                    padding: 1rem;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmousedown="this.style.background='#2563eb'; this.style.color='white';" 
                   onmouseup="this.style.background='white'; this.style.color='black'; window.handlePOISelection(${poi.id});"
                   ontouchstart="this.style.background='#2563eb'; this.style.color='white';"
                   ontouchend="this.style.background='white'; this.style.color='black'; window.handlePOISelection(${poi.id});">
                    
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #2563eb;
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            font-size: 1.1rem;
                        ">${poi.id}</div>
                        
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 0.25rem;">
                                ${poi.title || `POI ${poi.id}`}
                            </div>
                            ${poi.comment ? `
                                <div style="font-size: 0.9rem; color: #666; line-height: 1.3;">
                                    ${poi.comment.substring(0, 60)}${poi.comment.length > 60 ? '...' : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div style="font-size: 1.5rem; color: #999;">▶</div>
                    </div>
                </div>
            `;
        });
        
        listHtml += `
                <div style="
                    margin-top: 1rem;
                    padding: 0.75rem;
                    background: #e6f3ff;
                    border: 1px solid #b3d9ff;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    color: #0066cc;
                    text-align: center;
                ">
                    📱 Appuyez sur un POI pour voir ses détails
                </div>
            </div>
        `;
        
        // Fonction globale ultra-simple
        window.handlePOISelection = (poiId) => {
            try {
                console.log('Sélection POI:', poiId);
                
                const selectedPoi = pois.find(p => p.id === poiId);
                if (selectedPoi) {
                    console.log('POI trouvé:', selectedPoi.title);
                    
                    // Fermer le popup actuel
                    this.map.closePopup();
                    
                    // Petite pause puis ouvrir le nouveau popup
                    setTimeout(() => {
                        try {
                            this.showPOIPopup(selectedPoi);
                        } catch (error) {
                            console.error('Erreur showPOIPopup:', error);
                            alert(`Erreur lors de l'ouverture du POI ${selectedPoi.title}: ${error.message}`);
                        }
                    }, 300);
                    
                } else {
                    console.error('POI non trouvé:', poiId);
                    alert(`POI ${poiId} non trouvé dans la liste`);
                }
            } catch (error) {
                console.error('Erreur handlePOISelection:', error);
                alert(`Erreur de sélection: ${error.message}`);
            }
        };
        
        const popup = L.popup({
            maxWidth: Math.min(window.innerWidth * 0.9, 500),
            className: 'simple-poi-popup'
        })
        .setLatLng([coords.lat, coords.lng])
        .setContent(listHtml)
        .openOn(this.map);

        // Nettoyage
        popup.on('remove', () => {
            delete window.handlePOISelection;
        });
    }

    showPOIPopup(poi) {
        if (!poi.coordinates) return;

        const distance = this.calculateDistance(poi.coordinates);
        const azimuth = this.calculateAzimuth(poi.coordinates);

        let popupContent = `
            <div style="padding: 1rem; font-family: Arial, sans-serif; max-width: 100%;">
                <h3 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    🗺️ ${poi.title || `POI ${poi.id}`}
                </h3>
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 6px; font-family: monospace;">
                    📍 ${poi.coordinates.lat.toFixed(6)}, ${poi.coordinates.lng.toFixed(6)}
                </div>
        `;

        if (distance !== null) {
            const distanceText = distance > 1000 ? 
                `${(distance/1000).toFixed(1)} km` : 
                `${distance.toFixed(0)} m`;
            popupContent += `
                <div style="font-size: 0.9rem; color: #059669; font-weight: 600; margin-bottom: 0.75rem; background: rgba(16, 185, 129, 0.1); padding: 0.5rem; border-radius: 6px; display: flex; align-items: center; gap: 0.5rem;">
                    🧭 ${distanceText} - ${azimuth}
                </div>
            `;
        }

        if (poi.comment) {
            popupContent += `
                <div style="color: #374151; line-height: 1.6; margin-bottom: 1rem; font-size: 0.95rem;">
                    ${poi.comment.replace(/\n/g, '<br>')}
                </div>
            `;
        }

        // Médias avec double fallback pour les images
        let mediaContent = '';
        
        if (poi.imageUrl) {
            console.log('Affichage image:', poi.imageUrl);
            mediaContent += `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #555; font-size: 0.9rem;">📸 Image</h4>
                    
                    <!-- Première tentative: Blob URL -->
                    <img id="img-blob-${poi.id}" src="${poi.imageUrl}" 
                         alt="Image ${poi.title}" 
                         style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; display: block;" 
                         onclick="window.open(this.src, '_blank');"
                         onload="console.log('Image blob chargée avec succès'); document.getElementById('img-error-${poi.id}').style.display='none';"
                         onerror="
                            console.error('Erreur chargement image blob:', this.src); 
                            this.style.display='none'; 
                            ${poi.imageUrl_base64 ? `document.getElementById('img-base64-${poi.id}').style.display='block';` : `document.getElementById('img-error-${poi.id}').style.display='block';`}
                         ">
                    
                    ${poi.imageUrl_base64 ? `
                    <!-- Deuxième tentative: Base64 -->
                    <img id="img-base64-${poi.id}" src="${poi.imageUrl_base64}" 
                         alt="Image ${poi.title}" 
                         style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; display: none;" 
                         onclick="window.open(this.src, '_blank');"
                         onload="console.log('Image base64 chargée avec succès'); document.getElementById('img-error-${poi.id}').style.display='none';"
                         onerror="console.error('Erreur chargement image base64'); this.style.display='none'; document.getElementById('img-error-${poi.id}').style.display='block';">
                    ` : ''}
                    
                    <!-- Message d'erreur -->
                    <div id="img-error-${poi.id}" style="display: none; padding: 1rem; background: #fee2e2; color: #dc2626; border-radius: 8px; text-align: center;">
                        ❌ Impossible de charger l'image<br>
                        <small style="font-size: 0.8rem;">Fichier: ${poi.image || 'Nom inconnu'}</small><br>
                        <small style="font-size: 0.7rem;">Types tentés: Blob URL${poi.imageUrl_base64 ? ' + Base64' : ''}</small>
                    </div>
                </div>
            `;
        }

        if (poi.videoUrl) {
            console.log('Affichage vidéo:', poi.videoUrl);
            mediaContent += `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #555; font-size: 0.9rem;">🎥 Vidéo</h4>
                    <video controls preload="metadata" playsinline 
                           style="width: 100%; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                           onloadedmetadata="console.log('Vidéo chargée avec succès');"
                           onerror="console.error('Erreur chargement vidéo:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <source src="${poi.videoUrl}" type="video/mp4">
                        Votre navigateur ne supporte pas la vidéo.
                    </video>
                    <div style="display: none; padding: 1rem; background: #fee2e2; color: #dc2626; border-radius: 8px; text-align: center;">
                        ❌ Impossible de lire la vidéo<br>
                        <small style="font-size: 0.8rem;">Format non supporté ou fichier corrompu</small>
                    </div>
                </div>
            `;
        }

        if (poi.audioUrl) {
            console.log('Affichage audio:', poi.audioUrl);
            mediaContent += `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #555; font-size: 0.9rem;">🎵 Audio</h4>
                    <audio controls preload="metadata" 
                           style="width: 100%; border-radius: 6px;"
                           onloadedmetadata="console.log('Audio chargé avec succès');"
                           onerror="console.error('Erreur chargement audio:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <source src="${poi.audioUrl}" type="audio/mpeg">
                        Votre navigateur ne supporte pas l'audio.
                    </audio>
                    <div style="display: none; padding: 1rem; background: #fee2e2; color: #dc2626; border-radius: 8px; text-align: center;">
                        ❌ Impossible de lire l'audio<br>
                        <small style="font-size: 0.8rem;">Format non supporté ou fichier corrompu</small>
                    </div>
                </div>
            `;
        }

        if (mediaContent) {
            popupContent += `<div style="border-top: 1px solid #e5e7eb; padding-top: 1rem;">${mediaContent}</div>`;
        } else {
            popupContent += `
                <div style="padding: 1rem; background: #f9fafb; border-radius: 8px; text-align: center; color: #6b7280; font-style: italic;">
                    ℹ️ Aucun média associé à ce point d'intérêt
                </div>
            `;
        }

        popupContent += '</div>';

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