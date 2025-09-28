// map.js — initialise Leaflet, rend les POI, gère la géoloc


let map, markersLayer, gpsMarker = null;
let currentPosition = null;
let mediaMapGlobal = {};
let visitGlobal = null;
let poiGroups = {}; // key -> array of pois


function initMap(){
if (map) return;
map = L.map('map').setView([46.5, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
markersLayer = L.layerGroup().addTo(map);
}


function renderPOIs(visit, mediaMap){
if (!map) initMap();
visitGlobal = visit;
mediaMapGlobal = mediaMap || {};
markersLayer.clearLayers();
poiGroups = {};


// group by rounded coordinates (tolerance)
const keyFor = (lat, lon) => lat.toFixed(5) + '|' + lon.toFixed(5);


(visit.pois || []).forEach((p, idx) => {
const key = keyFor(p.lat, p.lon);
if (!poiGroups[key]) poiGroups[key] = [];
poiGroups[key].push({poi:p, idx: idx+1});
});


let index = 0;
for (const key in poiGroups){
const group = poiGroups[key];
const isComplex = group.length > 1;
// choose marker lat/lon from first
const lat = group[0].poi.lat, lon = group[0].poi.lon;
index++;
const colorClass = isComplex ? 'red' : 'blue';
const html = `<div class="number-marker ${colorClass}">${index}</div>`;
const marker = L.marker([lat,lon], { icon: L.divIcon({ html, className:'', iconSize:[34,34] }) }).addTo(markersLayer);


if (isComplex){
marker.on('click', () => showComplexListPopup(lat, lon, group));
} else {
marker.on('click', () => showPOIPopup(group[0].poi, group[0].idx));
}
}


// fit map to markers
const allCoords = (visit.pois || []).map(p => [p.lat, p.lon]);
if (allCoords.length) map.fitBounds(allCoords, {padding:[40,40]});
}


function showComplexListPopup(lat, lon, group){
const items = group.map(g => {
const title = g.poi.title || '(sans titre)';
return `<li><div class="poi-item"><span>${title}</span><button data-idx="${g.idx}">Voir</button></div></li>`;
}).join('');
if (poi) showPOIPopup(poi, idx