// Initialisation de la carte
let map = L.map('map').setView([45.764043, 4.835659], 13); // Coordonnées de Lyon par défaut

// Couches de carte
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});

const ignLayer = L.tileLayer('https://wxs.ign.fr/{key}/geoportail/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE={style}&TILEMATRIXSET=PM&FORMAT={format}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', {
    key: 'choisir', // Pas besoin de clé API pour IGN Plan V.2
    style: 'normal',
    format: 'image/png',
    attribution: '© IGN'
});

// Chargement des MBtiles (utilisez une bibliothèque comme leaflet-tilelayer-mbtiles)
function loadMBtiles(file) {
    // Logique pour charger les MBtiles
}

// Gestion des boutons de mode
document.getElementById('online-btn').addEventListener('click', () => {
    map.removeLayer(ignLayer);
    map.addLayer(osmLayer);
});

document.getElementById('offline-btn').addEventListener('click', () => {
    map.removeLayer(osmLayer);
    // Charger les MBtiles ici
});

// Gestion du menu déroulant pour les sources de carte
document.getElementById('map-source').addEventListener('change', (e) => {
    if (e.target.value === 'osm') {
        map.removeLayer(ignLayer);
        map.addLayer(osmLayer);
    } else {
        map.removeLayer(osmLayer);
        map.addLayer(ignLayer);
    }
});

// Chargement initial de la carte
map.addLayer(osmLayer);
