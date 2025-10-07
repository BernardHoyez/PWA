/*
Fonctionnalités principales implémentées :
- lecture d'un .zip contenant visit.json + dossier data/...
- affichage des POI sur carte Leaflet (OSM)
- détection POI complexes (coordonnées partagées) -> marqueurs rouges, simples -> bleus
- popup avec titre + vignette image ou vidéo (max width 300px)
- déplacement draggable des marqueurs
- bouton Valider position par POI
- sauvegarde ZIP modifié (utilise JSZip)
*/


let map, markers = {}, visit=null, zipFilename=null, zipRootFiles={};


function initMap(){
map = L.map('map').setView([46.5, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom: 19, attribution: '© OpenStreetMap'
}).addTo(map);
}


function isoCoordKey(lat, lon){ return lat.toFixed(6)+','+lon.toFixed(6); }


function colorForPoi(poi, coordCounts){
const key = isoCoordKey(poi.lat, poi.lon);
return (coordCounts[key] && coordCounts[key] > 1) ? 'red' : 'blue';
}


function makeIcon(color){
return L.circleMarker([0,0],{radius:8,fillColor:color,color:'#000',weight:1,fillOpacity:1});
}


function clearMarkers(){
Object.values(markers).forEach(m=>map.removeLayer(m.leaflet));
markers = {};
}


function renderPOIs(){
clearMarkers();
if(!visit) return;
const counts={};
visit.pois.forEach(p=>{ counts[isoCoordKey(p.lat,p.lon)] = (counts[isoCoordKey(p.lat,p.lon)]||0)+1 });


visit.pois.forEach(poi=>{
const color = colorForPoi(poi, counts);
const marker = L.marker([poi.lat, poi.lon], {draggable:true, riseOnHover:true});
marker.addTo(map);
// style: use circle marker via divIcon? Keep default pin; color via CSS not trivial; we add colored circle in popup and panel instead


// build popup content
let html = `<div class="popup-content"><strong>${escapeHtml(poi.title)}</strong><br>`;
if(poi.image){
const url = getMediaUrl(poi.image.name);
if(url) html += `<img src="${url}" width="300" alt="${escapeHtml(poi.title)}">`;
} else if(poi.video){
const url = getMediaUrl(poi.video.name);
if(url) html += `<video controls width="300" src="${url}"></video>`;
}
html += `</div>`;
marker.bindPopup(html);


marker.on('dragend', ()=>{
const latlng = marker.getLatLng();
poi.lat = parseFloat(latlng.lat.toFixed(6));
poi.lon = parseFloat(latlng.lng.toFixed(6));
const f = ev.target.files[0];