// map.js — initialise Leaflet, rend les POI, gère la géoloc
(function(){
  let map, markersLayer, gpsMarker = null;
  let currentPosition = null;
  let mediaMapGlobal = {};
  let visitGlobal = null;
  let poiGroups = {};

  function getUtils() {
    // utilise visupoiUtils si présent, sinon fallback interne
    if (window.visupoiUtils) return window.visupoiUtils;
    return {
      haversineDistance: function(lat1, lon1, lat2, lon2){
        const R = 6371000;
        const toRad = d => d * Math.PI / 180;
        const φ1 = toRad(lat1), φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1);
        const Δλ = toRad(lon2 - lon1);
        const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) +
                  Math.cos(φ1)*Math.cos(φ2) * Math.sin(Δλ/2)*Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      },
      bearing: function(lat1, lon1, lat2, lon2){
        const toRad = d => d * Math.PI / 180;
        const toDeg = r => r * 180 / Math.PI;
        const φ1 = toRad(lat1), φ2 = toRad(lat2);
        const λ1 = toRad(lon1), λ2 = toRad(lon2);
        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
        let θ = toDeg(Math.atan2(y, x));
        θ = (θ + 360) % 360;
        return θ;
      },
      formatLat: function(lat){ const hemi = lat >= 0 ? 'N':'S'; return Math.abs(lat).toFixed(6)+'°'+hemi; },
      formatLon: function(lon){ const hemi = lon >= 0 ? 'E':'W'; return Math.abs(lon).toFixed(6)+'°'+hemi; }
    };
  }

  // expose initMap, renderPOIs, startGeolocation to window so app.js peut les appeler sans dépendre du scope
  window.initMap = function(){
    if (map) return;
    map = L.map('map').setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
  };

  window.renderPOIs = function(visit, mediaMap){
    if (!map) initMap();
    visitGlobal = visit;
    mediaMapGlobal = mediaMap || {};
    markersLayer.clearLayers();
    poiGroups = {};

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

    const allCoords = (visit.pois || []).map(p => [p.lat, p.lon]);
    if (allCoords.length) map.fitBounds(allCoords, {padding:[40,40]});
  };

  function showComplexListPopup(lat, lon, group){
    const items = group.map(g => {
      const title = g.poi.title || '(sans titre)';
      return `<li><div class="poi-item"><span>${escapeHtml(title)}</span><button data-idx="${g.idx}">Voir</button></div></li>`;
    }).join('');
    const html = `<div><strong>${group.length} POI à cette position</strong><ul class="poi-list">${items}</ul></div>`;
    const popup = L.popup({maxWidth:600}).setLatLng([lat,lon]).setContent(html).openOn(map);

    setTimeout(()=>{
      const buttons = document.querySelectorAll('.poi-item button');
      buttons.forEach(b => b.addEventListener('click', (e)=>{
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'),10) - 1;
        const poi = (visitGlobal.pois || [])[idx];
        if (poi) showPOIPopup(poi, idx+1);
      }));
    }, 50);
  }

  function showPOIPopup(poi, number){
    const lat = poi.lat, lon = poi.lon;
    const utils = getUtils();
    let html = `<div style="min-width:240px;max-width:90vw"><h3>${escapeHtml(poi.title || '')}</h3>`;
    html += `<div><small>${utils.formatLat(lat)} , ${utils.formatLon(lon)}</small></div>`;
    if (poi.comment) html += `<p>${escapeHtml(poi.comment)}</p>`;
    if (poi.image){
      const src = mediaMapGlobal[poi.image] || '';
      if (src) html += `<img src="${src}" alt="${escapeHtml(poi.title)}">`;
    }
    if (poi.audio){
      const src = mediaMapGlobal[poi.audio] || '';
      if (src) html += `<audio controls src="${src}"></audio>`;
    }
    if (poi.video && poi.video.name){
      const src = mediaMapGlobal[poi.video.name] || '';
      if (src) html += `<video controls src="${src}"></video>`;
    }

    html += `<div class="dist-az">
              <div>Distance: <span class="dist-val">--</span> m</div>
              <div>Azimut: <span class="az-val">--</span></div>
            </div>`;
    html += `</div>`;

    const popup = L.popup({maxWidth:600}).setLatLng([lat,lon]).setContent(html).openOn(map);

    function update() {
      const distEl = document.querySelector('.dist-val');
      const azEl = document.querySelector('.az-val');
      if (!distEl || !azEl) return;
      if (!currentPosition) { distEl.textContent = '--'; azEl.textContent='--'; return; }
      const d = Math.round(getUtils().haversineDistance(currentPosition.coords.latitude, currentPosition.coords.longitude, lat, lon));
      const b = Math.round(getUtils().bearing(currentPosition.coords.latitude, currentPosition.coords.longitude, lat, lon));
      distEl.textContent = d;
      azEl.textContent = 'Nord ' + b + '°';
    }
    update();
    popup._updateDist = update;
  }

  // appelé lorsque la géoloc bouge
  function onPositionUpdate(pos){
    currentPosition = pos;
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    if (!gpsMarker){
      const html = '<div class="gps-marker pulse"></div>';
      gpsMarker = L.marker([lat,lon], {icon: L.divIcon({html, className:'', iconSize:[28,28]})}).addTo(map);
    } else {
      gpsMarker.setLatLng([lat,lon]);
    }

    // update popups that registered _updateDist
    map.eachLayer(layer => {
      if (layer && layer._popup && typeof layer._popup._updateDist === 'function'){
        try { layer._popup._updateDist(); } catch(e){ /* noop */ }
      }
    });
  }

  window.startGeolocation = function(){
    if (!navigator.geolocation) {
      const s = document.getElementById('status');
      if (s) s.textContent = 'Géolocalisation non supportée';
      return;
    }
    navigator.geolocation.watchPosition(onPositionUpdate, (err)=>{
      const s = document.getElementById('status');
      if (s) s.textContent = 'GEO ERR: ' + err.message;
    }, {enableHighAccuracy:true, maximumAge:5000});
  };

  function escapeHtml(s){
    if (!s) return '';
    return s.replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

})();
