// app.js - edition d'une visite (editpoi)
'use strict';


// Données en mémoire
let visit = { title: 'Visite', referenceMode: 'fixed', referencePos: {lat:0, lon:0}, pois: [] };
let map, markerRef, layerGroup;
let currentEditId = null;


// Helpers géo
function toRad(d){return d*Math.PI/180}
function toDeg(r){return r*180/Math.PI}


function haversineDist(lat1,lon1,lat2,lon2){
const R=6371000; // m
const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1);
const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
return Math.round(R*c);
}


function bearing(lat1,lon1,lat2,lon2){
const y=Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2));
const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
let br=toDeg(Math.atan2(y,x));
br=(br+360)%360;
return Math.round(br);
}


// DOM refs
const el = id => document.getElementById(id);


// Init map
function initMap(){
map = L.map('map').setView([0,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
layerGroup = L.layerGroup().addTo(map);
markerRef = L.marker([visit.referencePos.lat, visit.referencePos.lon], {draggable:false}).addTo(map).bindPopup('Référence');


// click to set lat/lon
map.on('click', function(e){
el('lat').value = e.latlng.lat.toFixed(6);
el('lon').value = e.latlng.lng.toFixed(6);
updateDistanceAndBearing();
});
}


// UI render
function renderPOIList(){
const container = el('poiList');
container.innerHTML='';
visit.pois.sort((a,b)=> (a.zIndex||0) - (b.zIndex||0));
visit.pois.forEach(p=>{
const div = document.createElement('div'); div.className='poi-item';
const thumb = document.createElement('img'); thumb.className='poi-thumb';
thumb.src = p.image ? URL.createObjectURL(p.image) : '';
thumb.onerror = ()=>{thumb.style.display='none'}
const meta = document.createElement('div'); meta.className='poi-meta';
meta.innerHTML = `<strong>${p.title}</strong><br>${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}<br>dist ${p.distance} m • N${String(p.bearing).padStart(3,'0')}°`;
const actions = document.createElement('div'); actions.className='poi-actions';
const mv = document.createElement('button'); mv.textContent='Déplacer'; mv.onclick = ()=>startMove(p.id);
const edit = document.createElement('button'); edit.textContent='Edit'; edit.onclick = ()=>loadEdit(p.id);
const del = document.createElement('button'); del.textContent='Suppr'; del.onclick = ()=>{ if(confirm('Supprimer ?')){ deletePOI(p.id)} };
actions.appendChild(mv); actions.appendChild(edit); actions.appendChild(del);
div.appendChild(thumb); div.appendChild(meta); div.appendChild(actions);
container.appendChild(div);
});
}


function startMove(id){
p.bearing