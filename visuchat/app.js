import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@4.0.0/dist/jszip.min.js';
const a = document.createElement('a'); a.href='#'; a.textContent = q.title || ('#'+q.id);
a.addEventListener('click', ev=>{ ev.preventDefault(); showPoiDetails(q); });
li.appendChild(a); ul.appendChild(li);
});
listDiv.appendChild(ul); content.appendChild(listDiv);
}


const h = document.createElement('h3'); h.textContent = p.title || ('#'+p.id); content.appendChild(h);
const coords = document.createElement('div'); coords.textContent = p.latlng ? `${p.latlng[0].toFixed(6)}, ${p.latlng[1].toFixed(6)}` : 'Pas de coords'; content.appendChild(coords);
if (p.comment) { const c = document.createElement('div'); c.textContent = p.comment; content.appendChild(c); }
if (userPos && p.latlng){ const d = document.createElement('div'); d.textContent = `Distance: ${Math.round(distanceMeters(userPos,p.latlng))} m — Nord ${azimuth(userPos,p.latlng)}°`; content.appendChild(d);}


const mediaDiv = document.createElement('div'); mediaDiv.className='media';
p.media.images.forEach(img=>{ const el = document.createElement('img'); el.src = img.url; el.alt = p.title; mediaDiv.appendChild(el); });
p.media.videos.forEach(v=>{ const el = document.createElement('video'); el.controls=true; el.src=v.url; mediaDiv.appendChild(el); });
p.media.audios.forEach(a=>{ const el = document.createElement('audio'); el.controls=true; el.src=a.url; mediaDiv.appendChild(el); });
content.appendChild(mediaDiv);


popup.setContent(content);
marker.bindPopup(popup);
marker.addTo(markersGroup);
});


if (bounds.length) map.fitBounds(bounds, {padding:[40,40]});
}


function showPoiDetails(p){
// simple modal-like display using Leaflet popup on same coords
const popup = L.popup({maxWidth: Math.floor(window.innerWidth * 0.85)});
const content = document.createElement('div');
content.className='popup-content';
const h = document.createElement('h3'); h.textContent = p.title || ('#'+p.id); content.appendChild(h);
const coords = document.createElement('div'); coords.textContent = p.latlng ? `${p.latlng[0].toFixed(6)}, ${p.latlng[1].toFixed(6)}` : 'Pas de coords'; content.appendChild(coords);
if (p.comment) { const c = document.createElement('div'); c.textContent = p.comment; content.appendChild(c); }
if (userPos && p.latlng){ const d = document.createElement('div'); d.textContent = `Distance: ${Math.round(distanceMeters(userPos,p.latlng))} m — Nord ${azimuth(userPos,p.latlng)}°`; content.appendChild(d);}
const mediaDiv = document.createElement('div'); mediaDiv.className='media';
p.media.images.forEach(img=>{ const el = document.createElement('img'); el.src = img.url; el.alt = p.title; mediaDiv.appendChild(el); });
p.media.videos.forEach(v=>{ const el = document.createElement('video'); el.controls=true; el.src=v.url; mediaDiv.appendChild(el); });
p.media.audios.forEach(a=>{ const el = document.createElement('audio'); el.controls=true; el.src=a.url; mediaDiv.appendChild(el); });
content.appendChild(mediaDiv);
popup.setContent(content);
if (p.latlng) popup.setLatLng(p.latlng).openOn(map);
}


zipInput.addEventListener('change', e=>{ if (e.target.files && e.target.files[0]) handleZipFile(e.target.files[0]); });


startGpsBtn.addEventListener('click', ()=>{
if (!navigator.geolocation){ setGpsStatus('error','Géolocalisation non supportée'); return; }
setGpsStatus('starting','Démarrage GPS...');
watchId = navigator.geolocation.watchPosition(pos=>{
userPos = [pos.coords.latitude, pos.coords.longitude];
setGpsStatus('ok',`GPS ok (${Math.round(pos.coords.accuracy)} m)`);
// update or create user marker
if (window.userMarker) { window.userMarker.setLatLng(userPos); } else { window.userMarker = L.circleMarker(userPos, {radius:8, color:'crimson', fillColor:'crimson', fillOpacity:0.6}).addTo(map); }
// refresh markers to update distances
renderMarkers();
}, err=>{
console.error(err); setGpsStatus('error',err.message);
}, {enableHighAccuracy:true,maximumAge:5000,timeout:10000});
});


stopGpsBtn.addEventListener('click', ()=>{
if (watchId) { navigator.geolocation.clearWatch(watchId); watchId=null; setGpsStatus('idle','GPS arrêté'); if (window.userMarker){ map.removeLayer(window.userMarker); window.userMarker=null; } }
});


// register service worker
if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('./sw.js').then(()=>console.log('Service Worker enregistré')).catch(err=>console.warn('SW failed',err));
}

