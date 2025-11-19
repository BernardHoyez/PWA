// Variables globales
let watchId = null;
let track = [];
let startTime = null;
let timerInterval = null;
let distance = 0;

// Fonction pour démarrer l'enregistrement
document.getElementById('start-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        startTime = new Date();
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                track.push({ lat: latitude, lng: longitude, time: new Date() });
                updateDistance();
                document.getElementById('coordinates').textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            },
            (error) => console.error("Erreur de géolocalisation :", error),
            { enableHighAccuracy: true }
        );
    }
});

// Fonction pour arrêter l'enregistrement
document.getElementById('stop-btn').addEventListener('click', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        clearInterval(timerInterval);
        saveTrack();
    }
});

// Mise à jour du temps écoulé
function updateTimer() {
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    document.getElementById('time-elapsed').textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Calcul de la distance parcourue
function updateDistance() {
    if (track.length < 2) return;
    let totalDistance = 0;
    for (let i = 1; i < track.length; i++) {
        const p1 = track[i - 1];
        const p2 = track[i];
        totalDistance += getDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    distance = totalDistance;
    document.getElementById('distance').textContent = `${Math.round(distance)} m`;
}

// Sauvegarde de la trace
function saveTrack() {
    if (track.length === 0) return;
    const gpx = convertToGPX(track);
    const kml = convertToKML(track);
    // Sauvegarde dans le dossier Documents/traces
    // (Utilisez l'API File System Access pour Android)
}

// Calcul de distance entre deux points (formule Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
