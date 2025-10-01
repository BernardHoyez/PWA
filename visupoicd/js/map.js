(function(){
    let map = null;
    let markersLayer = null;
    let gpsMarker = null;
    let currentPosition = null;
    let mediaMapGlobal = {};
    let visitGlobal = null;
    let poiGroups = {};
    let poiById = {};

    function getUtils() {
        if (window.visupoiUtils) return window.visupoiUtils;
        return {
            haversineDistance: function(lat1, lon1, lat2, lon2){
                const R = 6371000;
                const toRad = function(d) { return d * Math.PI / 180; };
                const phi1 = toRad(lat1);
                const phi2 = toRad(lat2);
                const deltaPhi = toRad(lat2 - lat1);
                const deltaLambda = toRad(lon2 - lon1);
                const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            },
            bearing: function(lat1, lon1, lat2, lon2){
                const toRad = function(d) { return d * Math.PI / 180; };
                const toDeg = function(r) { return r * 180 / Math.PI; };
                const phi1 = toRad(lat1);
                const phi2 = toRad(lat2);
                const lambda1 = toRad(lon1);
                const lambda2 = toRad(lon2);
                const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
                const x = Math.cos(phi1) * Math.sin(phi2) -
                          Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
                let theta = toDeg(Math.atan2(y, x));
                theta = (theta + 360) % 360;
                return theta;
            },
            formatLat: function(lat){
                const hemi = lat >= 0 ? 'N' : 'S';
                return Math.abs(lat).toFixed(6) + '°' + hemi;
            },
            formatLon: function(lon){
                const hemi = lon >= 0 ? 'E' : 'W';
                return Math.abs(lon).toFixed(6) + '°' + hemi;
            }
        };
    }

    function escapeHtml(s){
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"']/g, function(c){
            const entities = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
            return entities[c];
        });
    }

    window.initMap = function(){
        if (map) return;
        map = L.map('map').setView([46.5, 2.5], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
        setTimeout(function() { 
            map.invalidateSize(); 
        }, 150);
        window.addEventListener('resize', function() { 
            map.invalidateSize(); 
        });
    };

    window.renderPOIs = function(visit, mediaMap){
        if (!map) initMap();
        visitGlobal = visit || { pois: [] };
        mediaMapGlobal = mediaMap || {};
        markersLayer.clearLayers();
        poiGroups = {};
        poiById = {};

        var pois = visitGlobal.pois || [];
        pois.forEach(function(p, idx) {
            poiById[p.id] = p;
            p.__index = idx;
            const key = Number(p.lat).toFixed(5) + '|' + Number(p.lon).toFixed(5);
            if (!poiGroups[key]) poiGroups[key] = [];
            poiGroups[key].push(p);
        });

        let groupIndex = 0;
        for (const key in poiGroups){
            groupIndex++;
            const group = poiGroups[key];
            const isComplex = group.length > 1;
            const lat = group[0].lat;
            const lon = group[0].lon;
            const colorClass = isComplex ? 'red' : 'blue';
            const html = '<div class="number-marker ' + colorClass + '">' + groupIndex + '</div>';
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({ html: html, className:'', iconSize:[34,34] })
            }).addTo(markersLayer);

            if (isComplex){
                marker.on('click', function() { 
                    showComplexListPopup(lat, lon, group); 
                });
            } else {
                marker.on('click', function() { 
                    showPoiPopup(group[0]); 
                });
            }
        }

        const allCoords = pois.map(function(p) { 
            return [p.lat, p.lon]; 
        });
        if (allCoords.length) {
            map.fitBounds(allCoords, { padding: [40,40] });
        }
    };

    function showComplexListPopup(lat, lon, group){
        const items = group.map(function(p) {
            return '<li style="padding:6px 0;border-bottom:1px solid #eee">' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                    '<div style="flex:1">' + escapeHtml(p.title || '(sans titre)') + '</div>' +
                    '<button data-poi-id="' + escapeHtml(p.id) + '" ' +
                            'style="margin-left:8px;padding:6px 8px;border-radius:6px;border:none;background:#2b6cb0;color:#fff">Voir</button>' +
                '</div>' +
            '</li>';
        }).join('');

        const html = '<div style="min-width:200px;max-width:90vw">' +
            '<strong>' + group.length + ' POI à cette position</strong>' +
            '<ul style="list-style:none;padding:8px 0;margin:8px 0">' + items + '</ul>' +
        '</div>';

        const popup = L.popup({ maxWidth: 600 })
            .setLatLng([lat, lon])
            .setContent(html)
            .openOn(map);

        const popupEl = popup.getElement();
        if (!popupEl) return;

        const handler = function(evt){
            const btn = evt.target.closest ? evt.target.closest('button[data-poi-id]') : null;
            if (!btn) return;
            const poiId = btn.getAttribute('data-poi-id');
            if (!poiId) return;
            const poi = poiById[poiId];
            if (!poi) {
                console.warn('POI introuvable pour id', poiId);
                return;
            }
            map.closePopup();
            showPoiPopup(poi);
        };

        popupEl.addEventListener('click', handler);
        popup.on('remove', function(){
            try{ 
                popupEl.removeEventListener('click', handler); 
            } catch(e){}
        });
    }

    function showPoiPopup(poi){
        const lat = Number(poi.lat);
        const lon = Number(poi.lon);
        const utils = getUtils();

        const mediaName = function(m) {
            if (!m) return null;
            return (typeof m === 'string') ? m : (m.name || null);
        };

        let html = '<div style="min-width:240px;max-width:90vw">';
        html += '<h3>' + escapeHtml(poi.title || '') + '</h3>';
        html += '<div><small>' + utils.formatLat(lat) + ' , ' + utils.formatLon(lon) + '</small></div>';
        
        if (poi.comment) {
            html += '<p>' + escapeHtml(poi.comment) + '</p>';
        }

        const imgName = mediaName(poi.image);
        if (imgName && mediaMapGlobal[imgName]) {
            html += '<img src="' + mediaMapGlobal[imgName] + '" ' +
                          'alt="' + escapeHtml(poi.title) + '" ' +
                          'style="max-width:100%;display:block;margin:0.5rem 0;cursor:zoom-in;">';
        }

        const audioName = mediaName(poi.audio);
        if (audioName && mediaMapGlobal[audioName]) {
            html += '<audio controls src="' + mediaMapGlobal[audioName] + '" ' +
                            'style="width:100%;display:block;margin:0.5rem 0;"></audio>';
        }

        const videoKey = (typeof poi.video === 'string') ? poi.video : 
                        (poi.video && poi.video.name) ? poi.video.name : null;
        if (videoKey && mediaMapGlobal[videoKey]) {
            html += '<video controls src="' + mediaMapGlobal[videoKey] + '" ' +
                            'style="width:100%;display:block;margin:0.5rem 0;"></video>';
        }

        html += '<div class="dist-az" data-lat="' + lat + '" data-lon="' + lon + '" ' +
                      'style="margin-top:6px;">' +
            '<div>Distance: <span class="dist-val">--</span> m</div>' +
            '<div>Azimut: <span class="az-val">--</span></div>' +
        '</div>';
        html += '</div>';

        const popup = L.popup({ maxWidth: 600 })
            .setLatLng([lat, lon])
            .setContent(html)
            .openOn(map);

        updateDistAzInPopup(popup);
    }

    function updateAllDistAz(){
        if (!currentPosition) return;
        const els = document.querySelectorAll('.dist-az');
        const utils = getUtils();
        els.forEach(function(el) {
            const lat = Number(el.getAttribute('data-lat'));
            const lon = Number(el.getAttribute('data-lon'));
            if (isNaN(lat) || isNaN(lon)) return;
            const d = Math.round(utils.haversineDistance(
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
                lat, lon
            ));
            const b = Math.round(utils.bearing(
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
                lat, lon
            ));
            const distEl = el.querySelector('.dist-val');
            const azEl = el.querySelector('.az-val');
            if (distEl) distEl.textContent = d;
            if (azEl) azEl.textContent = 'Nord ' + b + '°';
        });
    }

    function updateDistAzInPopup(popup){
        try {
            const el = popup.getElement();
            if (!el) return;
            const container = el.querySelector('.dist-az');
            if (!container) return;

            if (!currentPosition) {
                const dv = container.querySelector('.dist-val');
                const av = container.querySelector('.az-val');
                if (dv) dv.textContent = '--';
                if (av) av.textContent = '--';
                return;
            }

            const lat = Number(container.getAttribute('data-lat'));
            const lon = Number(container.getAttribute('data-lon'));
            if (isNaN(lat) || isNaN(lon)) return;

            const utils = getUtils();
            const d = Math.round(utils.haversineDistance(
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
                lat, lon
            ));
            const b = Math.round(utils.bearing(
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
                lat, lon
            ));

            const distEl = container.querySelector('.dist-val');
            const azEl = container.querySelector('.az-val');
            if (distEl) distEl.textContent = d;
            if (azEl) azEl.textContent = 'Nord ' + b + '°';
        } catch (e) {
            console.warn('updateDistAzInPopup error', e);
        }
    }

    window.startGeolocation = function(){
        if (!navigator.geolocation) {
            const s = document.getElementById('status');
            if (s) s.textContent = 'Géolocalisation non supportée';
            return;
        }

        navigator.geolocation.watchPosition(function(pos) {
            currentPosition = pos;
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            if (!gpsMarker){
                const html = '<div class="gps-marker pulse"></div>';
                gpsMarker = L.marker([lat, lon], {
                    icon: L.divIcon({ html: html, className:'', iconSize:[28,28] })
                }).addTo(map);
            } else {
                gpsMarker.setLatLng([lat, lon]);
            }

            updateAllDistAz();
        }, function(err) {
            const s = document.getElementById('status');
            if (s) s.textContent = 'GEO ERR: ' + err.message;
            console.warn('geoloc error', err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 5000
        });
    };

    window.showPoiPopup = showPoiPopup;
})();