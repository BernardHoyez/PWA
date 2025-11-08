let latitude, longitude;

document.getElementById('getPosition').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(pos => {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        document.getElementById('position').textContent =
            `Latitude: ${latitude.toFixed(4)}°, Longitude: ${longitude.toFixed(4)}°`;
    }, err => alert('Erreur GPS : ' + err.message));
});

document.getElementById('calculer').addEventListener('click', () => {
    if (latitude === undefined) {
        alert("Veuillez d'abord obtenir la position GPS.");
        return;
    }

    const a = parseFloat(document.getElementById('grandAxe').value);
    const rad = Math.PI / 180;
    const b = a * Math.sin(latitude * rad);
    const c = Math.sqrt(a ** 2 - b ** 2);
    const L = 2 * a;

    let resultat = `Latitude : ${latitude.toFixed(2)}°
`;
    resultat += `Grand axe a = ${a.toFixed(2)} m
Petit axe b = ${b.toFixed(2)} m
`;
    resultat += `Distance entre foyers = ${(2 * c).toFixed(2)} m
Longueur corde = ${L.toFixed(2)} m

`;

    resultat += "Heures solaires (6h → 18h) :\n";
    resultat += "Heure | x (m) | y (m) | Angle depuis le Nord\n";
    resultat += "----------------------------------------------\n";
    for (let H = 6; H <= 18; H++) {
        const Ha = 15 * (H - 12) * rad;
        const x = a * Math.sin(Ha);
        const y = b * Math.cos(Ha);
        const angle = (Math.atan2(x, y) / rad + 360) % 360;
        resultat += `${H.toString().padStart(2, '0')}h  | ${x.toFixed(2)} | ${y.toFixed(2)} | ${angle.toFixed(1)}°\n`;
    }

    document.getElementById('resultat').textContent = resultat;
});

// Enregistrement du service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}
