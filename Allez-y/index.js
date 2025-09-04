// Nous utilisons Leaflet depuis un CDN, donc l'objet 'L' est disponible globalement.

class GeoTrackerApp {
    map = null;
    pointA = null;
    pointB = null;
    markerA = null;
    markerB = null;
    line = null;
    watchId = null;

    dom = {
        form: document.getElementById('point-a-form'),
        latInput: document.getElementById('lat-a'),
        lonInput: document.getElementById('lon-a'),
        distanceEl: document.getElementById('distance'),
        azimuthEl: document.getElementById('azimuth'),
        statusEl: document.getElementById('status'),
        mapEl: document.getElementById('map'),
        controlsEl: document.getElementById('controls'),
    };

    constructor() {
        this.fixLeafletIcons();
        this.initMap();
        this.initEventListeners();
    }

    fixLeafletIcons() {
        // Correction pour les icônes Leaflet lors de l'utilisation d'un CDN
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    }

    initMap() {
        if (!this.dom.mapEl) return;
        this.map = L.map(this.dom.mapEl, { zoomControl: false }).setView([48.8584, 2.2945], 13); // Défaut sur Paris
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    }

    initEventListeners() {
        this.dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.setPointA();
        });
    }

    setPointA() {
        const lat = parseFloat(this.dom.latInput.value);
        const lng = parseFloat(this.dom.lonInput.value);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.updateStatus('Coordonnées du Point A invalides.');
            return;
        }

        this.pointA = { lat, lng };

        // Masquer le formulaire pour maximiser l'espace de la carte
        this.dom.controlsEl.style.display = 'none';

        if (this.markerA) {
            this.markerA.setLatLng(this.pointA);
        } else if (this.map) {
            this.markerA = L.marker(this.pointA).addTo(this.map);
        }

        this.markerA?.bindPopup("Point A").openPopup();
        this.map?.setView(this.pointA, 15);

        this.updateStatus('En attente de votre position (Point B)...');
        this.startWatchingPosition();
    }

    startWatchingPosition() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        if (!navigator.geolocation) {
            this.updateStatus('La géolocalisation n\'est pas supportée par votre navigateur.');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            this.onLocationSuccess.bind(this),
            this.onLocationError.bind(this),
            options
        );
    }

    onLocationSuccess(position) {
        this.pointB = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        this.updateStatus('Position acquise. Mise à jour en temps réel.');

        if (!this.map) return;

        const blueIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        if (this.markerB) {
            this.markerB.setLatLng(this.pointB);
        } else {
            this.markerB = L.marker(this.pointB, { icon: blueIcon }).addTo(this.map);
        }
        this.markerB.bindPopup("Point B (Vous)");

        this.updateCalculations();
        this.updateMapElements();
    }

    onLocationError(error) {
        let message = 'Erreur de géolocalisation : ';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message += "Vous avez refusé l'accès à la localisation.";
                break;
            case error.POSITION_UNAVAILABLE:
                message += "Information de localisation indisponible.";
                break;
            case error.TIMEOUT:
                message += "La demande de localisation a expiré.";
                break;
            default:
                message += "Une erreur inconnue est survenue.";
                break;
        }
        this.updateStatus(message);
    }

    updateCalculations() {
        if (!this.pointA || !this.pointB) return;

        const distance = this.calculateDistance(this.pointA, this.pointB);
        const azimuth = this.calculateAzimuth(this.pointB, this.pointA);

        this.dom.distanceEl.textContent = `Distance : ${distance.toFixed(0)} m`;
        this.dom.azimuthEl.textContent = `Azimut : Nord ${azimuth.toFixed(0)}°`;
    }

    updateMapElements() {
        if (!this.map || !this.pointA || !this.pointB) return;

        const latLngs = [this.pointA, this.pointB];

        if (this.line) {
            this.line.setLatLngs(latLngs);
        } else {
            this.line = L.polyline(latLngs, { color: '#0078d4', weight: 3 }).addTo(this.map);
        }

        // Centrer la vue sur les deux points uniquement au début
        if (this.map.getZoom() <= 13) {
            this.map.fitBounds(L.latLngBounds(latLngs), { padding: [70, 70] });
        }
    }

    updateStatus(message) {
        this.dom.statusEl.textContent = message;
    }

    // Fonctions de calcul
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    calculateDistance(p1, p2) {
        const R = 6371e3; // Rayon de la Terre en mètres
        const phi1 = this.toRadians(p1.lat);
        const phi2 = this.toRadians(p2.lat);
        const deltaPhi = this.toRadians(p2.lat - p1.lat);
        const deltaLambda = this.toRadians(p2.lng - p1.lng);

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    calculateAzimuth(from, to) {
        const phi1 = this.toRadians(from.lat);
        const phi2 = this.toRadians(to.lat);
        const deltaLambda = this.toRadians(to.lng - from.lng);

        const y = Math.sin(deltaLambda) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) -
                  Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        const theta = Math.atan2(y, x);

        // Convertir le relèvement en degrés (0-360)
        return (this.toDegrees(theta) + 360) % 360;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeoTrackerApp();
});
