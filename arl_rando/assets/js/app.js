// Variables globales
let watchId = null;
let track = [];
let startTime = null;
let timerInterval = null;
let distance = 0;
let polyline = null;

// Fonction pour démarrer l'enregistrement
document.getElementById('start-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        startTime = new Date();
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
        track = [];
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const point = { lat: latitude, lng: longitude, time: new Date() };
                track.push(point);
                updateDistance();
                document.getElementById('coordinates').textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                // Afficher la trace sur la carte
                if (!polyline) {
                    polyline = L.polyline([], {color: 'red'}).addTo(map);
                }
                polyline.addLatLng([latitude, longitude]);
            },
            (error) => console.error("Erreur de géolocalisation :", error),
            { enableHighAccuracy: true }
        );
    } else {
        alert("La géolocalisation n'est pas supportée par votre navigateur.");
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

    // Sauvegarde des fichiers
    const gpxBlob = new Blob([gpx], { type: 'application/gpx+xml' });
    const kmlBlob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });

    const gpxUrl = URL.createObjectURL(gpxBlob);
    const kmlUrl = URL.createObjectURL(kmlBlob);

    const gpxLink = document.createElement('a');
    gpxLink.href = gpxUrl;
    gpxLink.download = `trace_${new Date().toISOString().slice(0, 10)}.gpx`;
    document.body.appendChild(gpxLink);
    gpxLink.click();
    document.body.removeChild(gpxLink);

    const kmlLink = document.createElement('a');
    kmlLink.href = kmlUrl;
    kmlLink.download = `trace_${new Date().toISOString().slice(0, 10)}.kml`;
    document.body.appendChild(kmlLink);
    kmlLink.click();
    document.body.removeChild(kmlLink);
}

// Charger un fichier MBtiles
document.getElementById('load-mbtiles-btn').addEventListener('click', () => {
    document.getElementById('mbtiles-input').click();
});

document.getElementById('mbtiles-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        loadMBtiles(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
});

// Calcul de distance entre deux points (formule Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
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
