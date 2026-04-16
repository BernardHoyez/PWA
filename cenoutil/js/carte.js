/* carte.js v3 — Module carte cenoutil
   Fond de carte : IGN MBTiles (auto) | autre MBTiles (📁) | OSM (réseau)
   Marqueurs : descentes (vert) + observations (ocre)
   GPS : position temps réel
*/

'use strict';

const Carte = (() => {

  let map             = null;
  let mbtilesLayer    = null;
  let osmLayer        = null;
  let layerDescentes  = null;
  let layerObs        = null;
  let initialized     = false;
  let descentes       = [];
  let observations    = [];

  /* ══════════════════════════════════════
     PARSING GPS
     ══════════════════════════════════════ */

  function parseGPS(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim().toUpperCase().replace(/['']/g, "'");

    const dm = str.match(
      /(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([NS])\s+(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([EW])/
    );
    if (dm) {
      const lat = parseFloat(((parseFloat(dm[1]) + parseFloat(dm[2]) / 60) * (dm[3] === 'S' ? -1 : 1)).toFixed(4));
      const lng = parseFloat(((parseFloat(dm[4]) + parseFloat(dm[5]) / 60) * (dm[6] === 'W' ? -1 : 1)).toFixed(4));
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
    const dd = str.match(
      /(\d+(?:\.\d+)?)°?\s*([NS])\s+(\d+(?:\.\d+)?)°?\s*([EW])/
    );
    if (dd) {
      const lat = parseFloat((parseFloat(dd[1]) * (dd[2] === 'S' ? -1 : 1)).toFixed(4));
      const lng = parseFloat((parseFloat(dd[3]) * (dd[4] === 'W' ? -1 : 1)).toFixed(4));
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
    return null;
  }

  function formatDM(lat, lng) {
    const latD = Math.floor(Math.abs(lat));
    const latM = ((Math.abs(lat) - latD) * 60).toFixed(3);
    const lngD = Math.floor(Math.abs(lng));
    const lngM = ((Math.abs(lng) - lngD) * 60).toFixed(3);
    return `${latD}°${latM}${lat >= 0 ? 'N' : 'S'}  ${lngD}°${lngM}${lng >= 0 ? 'E' : 'W'}`;
  }

  /* ══════════════════════════════════════
     INITIALISATION
     ══════════════════════════════════════ */

  async function init(containerId, descentesData, obsData) {
    if (initialized) return;
    descentes    = descentesData || [];
    observations = obsData       || [];

    map = L.map(containerId, {
      center: [49.60, 0.13],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    /* OSM prêt mais pas encore ajouté */
    osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19, opacity: 0.8,
    });

    /* Chargement automatique MBTiles */
    await _autoLoadMap();

    _addDescentes(descentes);
    _addObservations(observations);
    _addLegend();
    _updateStatus();

    initialized = true;
  }

  /* ══════════════════════════════════════
     CHARGEMENT AUTOMATIQUE DU FOND
     ══════════════════════════════════════ */

  async function _autoLoadMap() {
    const result = await MBTiles.autoLoad((msg, pct) => {
      _setStatus(msg);
      _setProgress(pct);
    });

    if (result.mode === 'mbtiles') {
      _applyMBTilesLayer();
      const src = result.source === 'opfs' ? 'cache local' : 'téléchargé';
      _setStatus(`Fond IGN BD ORTHO (${src})`);
    } else {
      /* OSM fallback */
      osmLayer.addTo(map);
      _setStatus('Fond OSM — réseau requis');
    }

    _setProgress(null);  /* masquer la barre */
    _updateMapButtons();
  }

  function _applyMBTilesLayer() {
    /* Retirer OSM si présent */
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    /* Retirer ancien layer MBTiles si présent */
    if (mbtilesLayer && map.hasLayer(mbtilesLayer)) map.removeLayer(mbtilesLayer);

    const LayerClass = MBTiles.createLeafletLayer();
    mbtilesLayer = new LayerClass();
    mbtilesLayer.addTo(map);

    const bounds = MBTiles.getBounds();
    if (bounds) map.fitBounds(bounds);
  }

  /* ══════════════════════════════════════
     BOUTONS DE FOND DE CARTE
     ══════════════════════════════════════ */

  /* Import d'un autre fichier MBTiles */
  async function importAutreMBTiles(file) {
    _setStatus(`Import de ${file.name}…`);
    _setProgress(5);
    await MBTiles.openFromFile(file, (msg, pct) => {
      _setStatus(msg); _setProgress(pct);
    });
    if (MBTiles.isReady()) {
      _applyMBTilesLayer();
      _setStatus(`Fond : ${file.name}`);
    }
    _setProgress(null);
    _updateMapButtons();
  }

  /* Basculer vers OSM */
  function activerOSM() {
    if (mbtilesLayer && map.hasLayer(mbtilesLayer)) map.removeLayer(mbtilesLayer);
    if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
    _setStatus('Fond OSM (réseau requis)');
    _updateMapButtons();
  }

  /* Revenir au MBTiles en cache */
  async function activerMBTiles() {
    if (!MBTiles.isReady()) {
      _setStatus('Rechargement du fond IGN…');
      await _autoLoadMap();
      return;
    }
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    _applyMBTilesLayer();
    _setStatus('Fond IGN BD ORTHO');
    _updateMapButtons();
  }

  /* Mettre à jour l'apparence des boutons */
  function _updateMapButtons() {
    const btnMB  = document.getElementById('btn-mbtiles-autre');
    const btnOSM = document.getElementById('btn-osm');
    const usingOSM = map.hasLayer(osmLayer);

    if (btnOSM) {
      btnOSM.style.background    = usingOSM ? '#1a73e8' : 'white';
      btnOSM.style.color         = usingOSM ? 'white'   : '#555';
      btnOSM.style.borderColor   = usingOSM ? '#1558b0' : 'rgba(0,0,0,0.2)';
    }
    if (btnMB) {
      btnMB.style.background     = !usingOSM && MBTiles.isReady() ? '#2d7a4f' : 'white';
      btnMB.style.color          = !usingOSM && MBTiles.isReady() ? 'white'   : '#555';
    }
  }

  /* ══════════════════════════════════════
     MARQUEURS DESCENTES — cercle vert
     ══════════════════════════════════════ */

  function _addDescentes(data) {
    layerDescentes = L.layerGroup().addTo(map);
    const icon = L.divIcon({
      html: '<div class="marker-descente"></div>',
      className: '', iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-12],
    });
    data.forEach(site => {
      const m = L.marker([site.lat, site.lng], { icon });
      m.bindPopup(_popupDescente(site), { maxWidth: 230, className: 'cenoutil-popup' });
      m.addTo(layerDescentes);
    });
  }

  function _popupDescente(site) {
    return `<div class="popup-inner">
      ${site.photo ? `<img class="popup-photo" src="${site.photo}" alt="${site.nom}" onerror="this.style.display='none'">` : ''}
      <div style="padding:9px 12px 4px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#2d7a4f;margin-bottom:3px;">Accès falaise</div>
        <div class="popup-title">${site.nom}</div>
        <div class="popup-sub">${site.etat || ''}</div>
      </div>
      <button class="popup-btn" onclick="Carte.ouvrirDescente(${site.id})">Voir la fiche →</button>
    </div>`;
  }

  /* ══════════════════════════════════════
     MARQUEURS OBSERVATIONS — cercle ocre
     ══════════════════════════════════════ */

  function _addObservations(data) {
    layerObs = L.layerGroup().addTo(map);
    const icon = L.divIcon({
      html: '<div class="marker-observation"></div>',
      className: '', iconSize: [16,16], iconAnchor: [8,8], popupAnchor: [0,-10],
    });
    data.forEach(obs => {
      let lat = obs.lat, lng = obs.lng;
      if ((!lat || !lng) && obs.coords_originales) {
        const p = parseGPS(obs.coords_originales);
        if (p) { lat = p.lat; lng = p.lng; }
      }
      if (!isFinite(lat) || !isFinite(lng)) return;
      const m = L.marker([lat, lng], { icon });
      m.bindPopup(_popupObservation(obs), { maxWidth: 230, className: 'cenoutil-popup' });
      m.addTo(layerObs);
    });
  }

  function _popupObservation(obs) {
    const fossilesCourt = obs.fossiles
      ? obs.fossiles.split(',').slice(0,2).join(', ') + (obs.fossiles.split(',').length > 2 ? '…' : '')
      : '';
    return `<div class="popup-obs-inner">
      <div class="popup-obs-badge">Observation</div>
      <div class="popup-title">${obs.nom}</div>
      ${obs.stratigraphie ? `<div class="popup-sub">${obs.stratigraphie}</div>` : ''}
      ${fossilesCourt    ? `<div class="popup-sub" style="font-style:italic;margin-top:2px;">${fossilesCourt}</div>` : ''}
    </div>
    <button class="popup-btn" style="background:#b5820a;" onclick="Carte.ouvrirObservation('${obs.id}')">Voir la fiche →</button>`;
  }

  /* ══════════════════════════════════════
     FICHES DÉTAIL
     ══════════════════════════════════════ */

  function ouvrirDescente(siteId) {
    const site = descentes.find(m => m.id === siteId);
    if (!site) return;
    map.closePopup();
    _setZoomVisible(false);
    _setGeoButtonVisible(false);
    _setMapButtonsVisible(false);
    const detail = document.getElementById('site-detail');
    if (!detail) return;
    detail.querySelector('.site-content h2').textContent      = site.nom;
    detail.querySelector('.site-coords').textContent          = formatDM(site.lat, site.lng);
    detail.querySelector('.site-desc').textContent            = site.description || '';
    detail.querySelector('.site-access-text').textContent     = site.acces || '';
    const photo = detail.querySelector('.site-photo');
    if (photo) { photo.src = site.photo || ''; photo.style.display = site.photo ? 'block' : 'none'; }
    detail.classList.add('active');
  }

  function fermerDescente() {
    document.getElementById('site-detail')?.classList.remove('active');
    _setZoomVisible(true);
    _setGeoButtonVisible(true);
    _setMapButtonsVisible(true);
  }

  function ouvrirObservation(obsId) {
    const obs = observations.find(o => o.id === obsId);
    if (!obs) return;
    map.closePopup();
    _setZoomVisible(false);
    _setGeoButtonVisible(false);
    _setMapButtonsVisible(false);
    const detail = document.getElementById('obs-detail');
    if (!detail) return;

    let lat = obs.lat, lng = obs.lng;
    if ((!lat || !lng) && obs.coords_originales) {
      const p = parseGPS(obs.coords_originales);
      if (p) { lat = p.lat; lng = p.lng; }
    }
    detail.querySelector('.obs-title').textContent  = obs.nom;
    detail.querySelector('.obs-coords').textContent = obs.coords_originales || (lat ? formatDM(lat, lng) : '');

    const photoWrap = detail.querySelector('.obs-photo-wrap');
    const photo     = detail.querySelector('.obs-photo');
    if (photo && obs.photo) {
      photo.src = obs.photo; photo.alt = obs.nom; photoWrap.style.display = 'flex';
      photo.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);
    } else { photoWrap.style.display = 'none'; }

    const zoomBtn = detail.querySelector('.obs-photo-zoom');
    if (zoomBtn && obs.photo) zoomBtn.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);

    detail.querySelector('.obs-strat-value').textContent = obs.stratigraphie || '—';

    const fossilesEl = detail.querySelector('.obs-fossiles-list');
    if (obs.fossiles) {
      fossilesEl.innerHTML = obs.fossiles.split(',')
        .map(f => `<span class="obs-fossile-chip">${f.trim()}</span>`).join('');
    } else {
      fossilesEl.innerHTML = '<span style="color:var(--text-ter);font-size:12px;">—</span>';
    }

    detail.querySelector('.obs-commentaire').textContent   = obs.commentaire || '—';
    const dateEl = detail.querySelector('.obs-date');
    if (obs.date) { const d = new Date(obs.date); dateEl.textContent = isNaN(d) ? obs.date : d.toLocaleDateString('fr-FR'); }
    else dateEl.textContent = '—';
    detail.querySelector('.obs-observateurs').textContent  = obs.observateurs || '—';
    detail.classList.add('active');
  }

  function fermerObservation() {
    document.getElementById('obs-detail')?.classList.remove('active');
    _setZoomVisible(true);
    _setGeoButtonVisible(true);
    _setMapButtonsVisible(true);
  }

  /* ══════════════════════════════════════
     PHOTO PLEIN ÉCRAN
     ══════════════════════════════════════ */

  function ouvrirPhotoFullscreen(src, alt) {
    const fs = document.getElementById('obs-photo-fullscreen');
    if (!fs) return;
    const img = fs.querySelector('img');
    if (img) { img.src = src; img.alt = alt || ''; }
    fs.classList.add('active');
  }

  function fermerPhotoFullscreen() {
    document.getElementById('obs-photo-fullscreen')?.classList.remove('active');
  }

  /* ══════════════════════════════════════
     GÉOLOCALISATION
     ══════════════════════════════════════ */

  let _geoActive   = false;
  let _geoWatchId  = null;
  let _geoMarker   = null;
  let _geoCircle   = null;
  let _geoFirstFix = true;

  function toggleGeolocate() {
    _geoActive ? _stopGeo() : _startGeo();
  }

  function _startGeo() {
    if (!navigator.geolocation) { _setStatus('GPS non disponible'); return; }
    _geoActive = true; _geoFirstFix = true;
    _setBtnGeoActive(true);
    _setStatus('Acquisition GPS…');
    _geoWatchId = navigator.geolocation.watchPosition(_onGeoSuccess, _onGeoError,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  }

  function _stopGeo() {
    if (_geoWatchId !== null) { navigator.geolocation.clearWatch(_geoWatchId); _geoWatchId = null; }
    if (_geoMarker) { map.removeLayer(_geoMarker); _geoMarker = null; }
    if (_geoCircle) { map.removeLayer(_geoCircle); _geoCircle = null; }
    _geoActive = false;
    _setBtnGeoActive(false);
    _setStatus('Position désactivée');
    setTimeout(_updateStatus, 2000);
  }

  function _onGeoSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = Math.round(pos.coords.accuracy);
    if (_geoMarker) {
      _geoMarker.setLatLng([lat, lng]);
      _geoCircle.setLatLng([lat, lng]).setRadius(acc);
    } else {
      _geoCircle = L.circle([lat, lng], {
        radius: acc, color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.1, weight: 1,
      }).addTo(map);
      const icon = L.divIcon({ html: '<div class="geo-dot"></div>', className: '', iconSize: [18,18], iconAnchor: [9,9] });
      _geoMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
    }
    if (_geoFirstFix) { map.setView([lat, lng], Math.max(map.getZoom(), 16)); _geoFirstFix = false; }
    _setStatus(`📍 ${formatDM(lat, lng)} · ±${acc} m`);
  }

  function _onGeoError(err) {
    const msgs = { 1: 'Permission GPS refusée', 2: 'Position indisponible', 3: 'Délai GPS dépassé' };
    _setStatus(msgs[err.code] || 'Erreur GPS');
    _stopGeo();
  }

  function _setBtnGeoActive(active) {
    const btn  = document.getElementById('btn-geolocate');
    const icon = document.getElementById('geo-icon');
    if (!btn || !icon) return;
    btn.style.background  = active ? '#1a73e8' : 'white';
    btn.style.borderColor = active ? '#1558b0' : 'rgba(0,0,0,0.2)';
    icon.setAttribute('stroke', active ? 'white' : '#555');
    const nord = icon.querySelector('polygon');
    if (nord) nord.setAttribute('fill', active ? 'white' : '#c0392b');
  }

  /* ══════════════════════════════════════
     LÉGENDE + UTILITAIRES
     ══════════════════════════════════════ */

  function _addLegend() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const leg = document.createElement('div');
    leg.className = 'map-legend';
    leg.innerHTML = `
      <div><span class="legend-dot" style="background:#2d7a4f;"></span>Accès falaise (${descentes.length})</div>
      <div><span class="legend-dot" style="background:#b5820a;"></span>Observations (${observations.length})</div>`;
    mapEl.appendChild(leg);
  }

  function _setStatus(txt) {
    const el = document.getElementById('map-status-text');
    if (el) el.textContent = txt;
  }

  function _updateStatus() {
    const el = document.getElementById('map-count');
    if (el) el.textContent = `${descentes.length} accès · ${observations.length} obs.`;
  }

  function _setProgress(pct) {
    const bar  = document.getElementById('map-progress-bar');
    const wrap = document.getElementById('map-progress-wrap');
    if (!bar || !wrap) return;
    if (pct === null) {
      wrap.style.display = 'none';
    } else {
      wrap.style.display = 'block';
      bar.style.width    = pct + '%';
    }
  }

  function _setZoomVisible(v) {
    const ctrl = document.querySelector('.leaflet-control-zoom');
    if (ctrl) ctrl.style.display = v ? '' : 'none';
  }

  function _setGeoButtonVisible(v) {
    const btn = document.getElementById('btn-geolocate');
    if (btn) btn.style.display = v ? '' : 'none';
  }

  function _setMapButtonsVisible(v) {
    const wrap = document.getElementById('map-buttons-wrap');
    if (wrap) wrap.style.display = v ? '' : 'none';
  }

  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  }

  return {
    init, invalidateSize, parseGPS, formatDM,
    importAutreMBTiles, activerOSM, activerMBTiles, toggleGeolocate,
    ouvrirDescente, fermerDescente,
    ouvrirObservation, fermerObservation,
    ouvrirPhotoFullscreen, fermerPhotoFullscreen,
  };

})();

window.Carte = Carte;
