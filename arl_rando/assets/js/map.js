// Initialisation de la carte
let map = L.map('map').setView([45.764043, 4.835659], 13);

// Définition des couches
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});

const ignLayer = L.tileLayer(
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    '&LAYER=PLAN.IGN&STYLE=normal&TILEMATRIXSET=PM' +
    '&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    {
        attribution: '© IGN'
    }
);

// Ajout de la couche par défaut
map.addLayer(osmLayer);

// Gestion des boutons de mode
document.getElementById('online-btn').addEventListener('click', () => {
    map.removeLayer(ignLayer);
    map.addLayer(osmLayer);
});

document.getElementById('offline-btn').addEventListener('click', () => {
    map.removeLayer(osmLayer);
    // Logique pour charger les MBtiles ici
});

// Gestion du menu déroulant pour les sources de carte
document.getElementById('map-source').addEventListener('change', (e) => {
    if (e.target.value === 'osm') {
        map.removeLayer(ignLayer);
        map.addLayer(osmLayer);
    } else if (e.target.value === 'ign') {
        map.removeLayer(osmLayer);
        map.addLayer(ignLayer);
    }
});
