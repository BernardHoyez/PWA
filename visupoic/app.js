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
        this.lastAccuracy = null;
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.bindEvents();
        this.requestGeolocation();
    }
    
    initMap() {
        this.map = L.map('map').setView([46.603354, 1.888334], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    bindEvents() {
        document.getElementById('zipFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.showFileInfo(`Fichier sélectionné: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`, 'info');
                this.loadZipFile(file);
            }
        });
        
        document.getElementById('centerMap').addEventListener('click', () => {
            if (this.userPosition) {
                this.map.setView([this.userPosition.lat, this.userPosition.lng], 16);
            }
        });
        
        document.querySelectorAll('.popup-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.popup').classList.add('hidden');
            });
        });
        
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
                timeout: 30000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.updateUserPosition(position);
                    // Démarrer le suivi seulement après la première position
                    this.startWatching(options);
                },
                (error) => this.handleGeolocationError(error),
                options
            );
        } else {
            this.showStatus('Géolocalisation non supportée par ce navigateur');
        }
    }
    
    startWatching(options) {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.updateUserPosition(position),
            (error) => this.handleGeolocationError(error),
            options
        );
    }
    
    updateUserPosition(position) {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`Position GPS: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}, précision: ${accuracy.toFixed(0)}m`);
        
        // Mettre à jour seulement si le changement est significatif (plus de 5 mètres)
        if (this.userPosition) {
            const distance = this.calculateDistance(
                this.userPosition.lat, this.userPosition.lng,
                newLat, newLng
            );
            
            // Ne pas mettre à jour si le mouvement est inférieur à 5m (bruit GPS)
            if (distance < 5 && accuracy > 50) {
                console.log('Mouvement ignoré (bruit GPS)');
                return;
            }
        }
        
        this.userPosition = {
            lat: newLat,
            lng: newLng,
            accuracy: accuracy
        };
        
        this.lastAccuracy = accuracy;
        
        if (this.userMarker) {
            // Mise à jour douce de la position
            this.userMarker.setLatLng([newLat, newLng]);
        } else {
            // Création du marqueur
            const userIcon = L.divIcon({
                className: 'user-marker-container',
                html: '<div class="user-marker"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            this.userMarker = L.marker([newLat, newLng], {
                icon: userIcon,
                zIndexOffset: 1000
            }).addTo(this.map);
            
            this.userMarker.bindPopup(`Ma position<br>Précision: ${accuracy.toFixed(0)}m`);
        }
        
        document.getElementById('centerMap').disabled = false;
        this.showStatus(`Position: précision ${accuracy.toFixed(0)}m`);
    }
    
    handleGeolocationError(error) {
        let message = 'Erreur de géolocalisation: ';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Permission refusée. Autorisez la géolocalisation dans les paramètres.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Position non disponible';
                break;
            case error.TIMEOUT:
                message += 'Timeout - GPS trop lent';
                break;
            default:
                message += 'Erreur inconnue';
                break;
        }
        this.showStatus(message);
        console.error('Erreur géolocalisation:', error);
    }
    
    async loadZipFile(file) {
        this.showStatus('Chargement du fichier ZIP...');
        this.showFileInfo('Chargement en cours...', 'info');
        
        try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            console.log('=== DÉBUT ANALYSE ZIP ===');
            console.log('Tous les fichiers du ZIP:', Object.keys(zipContent.files));
            
            const visitJsonFile = zipContent.file('visit.json');
            if (!visitJsonFile) {
                throw new Error('Fichier visit.json non trouvé dans l\'archive');
            }
            
            const visitJsonText = await visitJsonFile.async('text');
            console.log('Contenu brut visit.json:', visitJsonText.substring(0, 500));
            
            const visitData = JSON.parse(visitJsonText);
            console.log('Données JSON parsées:', visitData);
            console.log('Nombre de POIs:', visitData.pois ? visitData.pois.length : 0);
            
            // Charger les médias AVANT de traiter les POIs
            await this.loadMediaFiles(zipContent);
            
            this.processPois(visitData);
            
            const message = `Visite chargée: ${this.pois.length} POIs`;
            this.showFileInfo(`✅ ${message} | Médias: ${this.mediaFiles.size} fichiers`, 'success');
            
            document.getElementById('status').innerHTML = `
                <h3>✅ Visite chargée avec succès !</h3>
                <p><strong>${this.pois.length} POI${this.pois.length > 1 ? 's' : ''}</strong> disponible${this.pois.length > 1 ? 's' : ''}</p>
                <p><strong>${this.mediaFiles.size} fichier${this.mediaFiles.size > 1 ? 's' : ''} média</strong> chargé${this.mediaFiles.size > 1 ? 's' : ''}</p>
                <p><small>Cliquez sur les marqueurs numérotés pour explorer les POI</small></p>
            `;
            document.getElementById('status').classList.add('loaded');
            
            if (this.pois.length > 0) {
                this.fitMapToPois();
            }
            
            console.log('=== FIN ANALYSE ZIP ===');
            
        } catch (error) {
            const errorMessage = 'Erreur lors du chargement: ' + error.message;
            this.showStatus(errorMessage);
            this.showFileInfo(`❌ ${errorMessage}`, 'error');
            console.error('Erreur complète:', error);
        }
    }
    
    async loadMediaFiles(zipContent) {
        this.mediaFiles.clear();
        
        console.log('--- Chargement des médias ---');
        
        // Lister tous les fichiers du ZIP
        const allFiles = Object.keys(zipContent.files);
        console.log('Tous les fichiers:', allFiles);
        
        // Filtrer les fichiers dans data/
        const dataFiles = allFiles.filter(filename => {
            const isInData = filename.startsWith('data/');
            const isNotFolder = !filename.endsWith('/');
            const isNotMacOS = !filename.includes('__MACOSX') && !filename.includes('.DS_Store');
            
            return isInData && isNotFolder && isNotMacOS;
        });
        
        console.log('Fichiers dans data/ (filtrés):', dataFiles);
        
        if (dataFiles.length === 0) {
            console.warn('⚠️ AUCUN FICHIER trouvé dans data/ !');
            console.log('Vérifiez que vos médias sont bien dans un dossier "data/" à la racine du ZIP');
        }
        
        for (const filename of dataFiles) {
            try {
                const file = zipContent.files[filename];
                
                // Extraire le nom du fichier
                const parts = filename.split('/');
                const fileName = parts[parts.length - 1];
                
                console.log(`Traitement: ${filename} -> ${fileName}`);
                
                // Détecter le type MIME
                const extension = fileName.toLowerCase().split('.').pop();
                let mimeType = 'application/octet-stream';
                
                switch(extension) {
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
                    case 'mp3':
                        mimeType = 'audio/mpeg';
                        break;
                    case 'wav':
                        mimeType = 'audio/wav';
                        break;
                    case 'ogg':
                        mimeType = 'audio/ogg';
                        break;
                    case 'mp4':
                        mimeType = 'video/mp4';
                        break;
                    case 'webm':
                        mimeType = 'video/webm';
                        break;
                }
                
                // Charger le blob
                const arrayBuffer = await file.async('arraybuffer');
                const blob = new Blob([arrayBuffer], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                // Stocker avec le nom de fichier simple
                this.mediaFiles.set(fileName, url);
                
                console.log(`✅ Média chargé: "${fileName}" (${mimeType}) taille: ${blob.size} bytes -> ${url.substring(0, 40)}...`);
                
            } catch (error) {
                console.error(`❌ Erreur chargement ${filename}:`, error);
            }
        }
        
        console.log('--- Fin chargement médias ---');
        console.log('Map des médias:', Array.from(this.mediaFiles.entries()).map(([k,v]) => `${k} -> ${v.substring(0,40)}...`));
    }
    
    processPois(visitData) {
        this.clearPois();
        this.pois = visitData.pois || visitData || [];
        this.poiCounter = 0;
        
        console.log('Traitement de', this.pois.length, 'POIs');
        
        const poiGroups = this.groupPoisByPosition();
        
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
        const tolerance = 0.0001;
        
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
        console.log('Affichage popup pour POI:', poi);
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
        console.log('--- Construction contenu POI ---');
        console.log('POI:', poi);
        console.log('Médias disponibles:', Array.from(this.mediaFiles.keys()));
        
        let html = `
            <div class="poi-title">${poi.title}</div>
            <div class="poi-location">Lat: ${poi.lat.toFixed(6)}, Lon: ${poi.lon.toFixed(6)}</div>
        `;
        
        if (poi.comment) {
            html += `<div class="poi-comment">${poi.comment}</div>`;
        }
        
        // IMAGE
        if (poi.image) {
            console.log(`Recherche image: "${poi.image}"`);
            const imageUrl = this.mediaFiles.get(poi.image);
            if (imageUrl) {
                console.log(`✅ Image trouvée: ${imageUrl.substring(0, 50)}...`);
                html += `<img src="${imageUrl}" alt="${poi.title}" class="poi-image" crossorigin="anonymous">`;
            } else {
                console.warn(`❌ Image "${poi.image}" NON TROUVÉE`);
                console.log('Fichiers disponibles:', Array.from(this.mediaFiles.keys()));
                html += `<div class="debug-info">⚠️ Image non trouvée: "${poi.image}"<br>Fichiers disponibles: ${Array.from(this.mediaFiles.keys()).join(', ')}</div>`;
            }
        }
        
        // AUDIO
        if (poi.audio) {
            console.log(`Recherche audio: "${poi.audio}"`);
            const audioUrl = this.mediaFiles.get(poi.audio);
            if (audioUrl) {
                console.log(`✅ Audio trouvé: ${audioUrl.substring(0, 50)}...`);
                html += `
                    <audio controls class="poi-audio" preload="metadata">
                        <source src="${audioUrl}" type="audio/mpeg">
                        <source src="${audioUrl}" type="audio/mp3">
                        Votre navigateur ne supporte pas l'audio.
                    </audio>`;
            } else {
                console.warn(`❌ Audio "${poi.audio}" NON TROUVÉ`);
                html += `<div class="debug-info">⚠️ Audio non trouvé: "${poi.audio}"</div>`;
            }
        }
        
        // VIDEO
        if (poi.video) {
            let videoName;
            if (typeof poi.video === 'string') {
                videoName = poi.video;
            } else if (poi.video && poi.video.name) {
                videoName = poi.video.name;
            }
            
            if (videoName) {
                console.log(`Recherche vidéo: "${videoName}"`);
                const videoUrl = this.mediaFiles.get(videoName);
                if (videoUrl) {
                    console.log(`✅ Vidéo trouvée: ${videoUrl.substring(0, 50)}...`);
                    html += `
                        <video controls class="poi-video" preload="metadata">
                            <source src="${videoUrl}" type="video/mp4">
                            Votre navigateur ne supporte pas la vidéo.
                        </video>`;
                } else {
                    console.warn(`❌ Vidéo "${videoName}" NON TROUVÉE`);
                    html += `<div class="debug-info">⚠️ Vidéo non trouvée: "${videoName}"</div>`;
                }
            }
        }
        
        // DISTANCE ET AZIMUT
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
                <div class="poi-distance">📍 Distance: ${distance.toFixed(0)} mètres</div>
                <div class="poi-azimuth">🧭 Direction: Nord ${azimuth.toFixed(0)}°</div>
            `;
        }
        
        console.log('--- Fin construction contenu ---');
        return html;
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
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
        
        if (this.userPosition) {
            bounds.extend([this.userPosition.lat, this.userPosition.lng]);
        }
        
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    clearPois() {
        this.poiMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.poiMarkers = [];
        
        this.mediaFiles.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.mediaFiles.clear();
    }
    
    showFileInfo(message, type = 'info') {
        const fileInfoElement = document.getElementById('fileInfo');
        if (fileInfoElement) {
            fileInfoElement.textContent = message;
            fileInfoElement.className = `file-info ${type}`;
        }
    }
    
    showStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement && !statusElement.classList.contains('loaded')) {
            statusElement.textContent = message;
        }
    }
    
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        this.clearPois();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visupoicApp = new VisupoicApp();
});

window.addEventListener('beforeunload', () => {
    if (window.visupoicApp) {
        window.visupoicApp.destroy();
    }
});