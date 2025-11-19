// Variable globale pour la couche MBtiles
let mbtilesLayer = null;

// Initialisation de la carte
let map = L.map('map').setView([45.764043, 4.835659], 13);

// Définition des couches
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});

const ignLayer = L.tileLayer(
    '//data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
    '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal' +
    '&FORMAT=image/png&TILEMATRIXSET=PM' +
    '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    {
        attribution: '© IGN'
    }
);

// Ajout de la couche par défaut
map.addLayer(osmLayer);

// Gestion des boutons de mode
document.getElementById('online-btn').addEventListener('click', () => {
    if (mbtilesLayer) {
        map.removeLayer(mbtilesLayer);
    }
    map.removeLayer(ignLayer);
    map.addLayer(osmLayer);
});

document.getElementById('offline-btn').addEventListener('click', () => {
    map.removeLayer(osmLayer);
    map.removeLayer(ignLayer);
    // Ne rien faire d'autre ici, le chargement des MBtiles se fait via le bouton dédié
});

// Gestion du menu déroulant pour les sources de carte
document.getElementById('map-source').addEventListener('change', (e) => {
    if (e.target.value === 'osm') {
        if (mbtilesLayer) {
            map.removeLayer(mbtilesLayer);
        }
        map.removeLayer(ignLayer);
        map.addLayer(osmLayer);
    } else if (e.target.value === 'ign') {
        if (mbtilesLayer) {
            map.removeLayer(mbtilesLayer);
        }
        map.removeLayer(osmLayer);
        map.addLayer(ignLayer);
    }
});

// Fonction pour charger les MBtiles
function loadMBtiles(arrayBuffer) {
    if (mbtilesLayer) {
        map.removeLayer(mbtilesLayer);
    }
    mbtilesLayer = L.tileLayer.mbTiles(arrayBuffer, {
        minZoom: 1,
        maxZoom: 14
    }).addTo(map);
    map.setView([45.764043, 4.835659], 13); // Recentrer la carte après chargement
}
