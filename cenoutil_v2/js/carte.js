/* carte.js v2 — Module carte cenoutil
   Deux types de marqueurs : descentes (vert) + observations (ocre)
   Parsing GPS : DM (49°38.86N 0°09.26E) et DD (49.6477°N 0.1543°E)
*/

'use strict';

const Carte = (() => {

  let map = null;
  let mbtilesLayer = null;
  let layerDescentes = null;
  let layerObservations = null;
  let initialized = false;
  let descentes = [];
  let observations = [];

  /* ══════════════════════════════════════
     PARSING GPS — deux formats
     ══════════════════════════════════════ */

  function parseGPS(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim().toUpperCase().replace(/['']/g, "'");

    // Format DM : 49°38.86N 0°09.26E
    const dm = str.match(
      /(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([NS])\s+(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([EW])/
    );
    if (dm) {
      const lat = (parseFloat(dm[1]) + parseFloat(dm[2]) / 60) * (dm[3] === 'S' ? -1 : 1);
      const lng = (parseFloat(dm[4]) + parseFloat(dm[5]) / 60) * (dm[6] === 'W' ? -1 : 1);
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }

    // Format DD : 49.6477°N 0.1543°E
    const dd = str.match(
      /(\d+(?:\.\d+)?)°?\s*([NS])\s+(\d+(?:\.\d+)?)°?\s*([EW])/
    );
    if (dd) {
      const lat = parseFloat(dd[1]) * (dd[2] === 'S' ? -1 : 1);
      const lng = parseFloat(dd[3]) * (dd[4] === 'W' ? -1 : 1);
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

  async function init(containerId, descentesData, observationsData) {
    if (initialized) return;
    descentes    = descentesData    || [];
    observations = observationsData || [];

    map = L.map(containerId, {
      center: [49.59, 0.12],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19, opacity: 0.7,
    });

    await _loadMBTiles(osmLayer);
    _addDescentes(descentes);
    _addObservations(observations);
    _addLegend();
    _updateStatus();

    initialized = true;
  }

  /* ══════════════════════════════════════
     FOND DE CARTE MBTILES
     ══════════════════════════════════════ */

  async function _loadMBTiles(fallbackLayer) {
    _setStatus('Chargement du fond de carte…');
    const found = await MBTiles.openFromOPFS('cenoutil.mbtiles');
    if (found && MBTiles.isReady()) {
      const MBLayer = MBTiles.createLeafletLayer();
      mbtilesLayer = new MBLayer();
      mbtilesLayer.addTo(map);
      const bounds = MBTiles.getBounds();
      if (bounds) map.fitBounds(bounds);
      _setStatus('Fond IGN BD ORTHO chargé');
    } else {
      fallbackLayer.addTo(map);
      _setStatus('Fond OSM — importer le MBTiles littoextract via 📁');
    }
  }

  async function importMBTiles(file) {
    _setStatus('Import MBTiles en cours…');
    await MBTiles.openFromFile(file);
    if (MBTiles.isReady()) {
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      if (mbtilesLayer) map.removeLayer(mbtilesLayer);
      const MBLayer = MBTiles.createLeafletLayer();
      mbtilesLayer = new MBLayer();
      mbtilesLayer.addTo(map);
      const bounds = MBTiles.getBounds();
      if (bounds) map.fitBounds(bounds);
      _setStatus('Fond IGN BD ORTHO chargé et sauvegardé');
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
    layerObservations = L.layerGroup().addTo(map);
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
      m.addTo(layerObservations);
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
      ${fossilesCourt ? `<div class="popup-sub" style="font-style:italic;margin-top:2px;">${fossilesCourt}</div>` : ''}
    </div>
    <button class="popup-btn" style="background:#b5820a;" onclick="Carte.ouvrirObservation('${obs.id}')">Voir la fiche →</button>`;
  }

  /* ══════════════════════════════════════
     FICHE DESCENTE
     ══════════════════════════════════════ */

  function ouvrirDescente(siteId) {
    const site = descentes.find(m => m.id === siteId);
    if (!site) return;
    map.closePopup();
    const detail = document.getElementById('site-detail');
    if (!detail) return;
    detail.querySelector('.site-content h2').textContent = site.nom;
    detail.querySelector('.site-coords').textContent = formatDM(site.lat, site.lng);
    detail.querySelector('.site-desc').textContent = site.description || '';
    detail.querySelector('.site-access-text').textContent = site.acces || '';
    const photo = detail.querySelector('.site-photo');
    if (photo) { photo.src = site.photo || ''; photo.style.display = site.photo ? 'block' : 'none'; }
    detail.classList.add('active');
  }

  function fermerDescente() {
    document.getElementById('site-detail')?.classList.remove('active');
  }

  /* ══════════════════════════════════════
     FICHE OBSERVATION
     ══════════════════════════════════════ */

  function ouvrirObservation(obsId) {
    const obs = observations.find(o => o.id === obsId);
    if (!obs) return;
    map.closePopup();
    const detail = document.getElementById('obs-detail');
    if (!detail) return;

    // Coordonnées
    let lat = obs.lat, lng = obs.lng;
    if ((!lat || !lng) && obs.coords_originales) {
      const p = parseGPS(obs.coords_originales); if (p) { lat = p.lat; lng = p.lng; }
    }
    detail.querySelector('.obs-title').textContent = obs.nom;
    detail.querySelector('.obs-coords').textContent = obs.coords_originales || (lat ? formatDM(lat, lng) : '');

    // Photo
    const photoWrap = detail.querySelector('.obs-photo-wrap');
    const photo = detail.querySelector('.obs-photo');
    if (photo && obs.photo) {
      photo.src = obs.photo; photo.alt = obs.nom; photoWrap.style.display = 'flex';
      photo.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);
    } else { photoWrap.style.display = 'none'; }

    // Bouton zoom
    const zoomBtn = detail.querySelector('.obs-photo-zoom');
    if (zoomBtn && obs.photo) {
      zoomBtn.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);
    }

    // Champs structurés
    detail.querySelector('.obs-strat-value').textContent = obs.stratigraphie || '—';

    const fossilesEl = detail.querySelector('.obs-fossiles-list');
    if (obs.fossiles) {
      fossilesEl.innerHTML = obs.fossiles.split(',')
        .map(f => `<span class="obs-fossile-chip">${f.trim()}</span>`).join('');
    } else {
      fossilesEl.innerHTML = '<span style="color:var(--text-ter);font-size:12px;">—</span>';
    }

    detail.querySelector('.obs-commentaire').textContent = obs.commentaire || '—';

    const dateEl = detail.querySelector('.obs-date');
    if (obs.date) {
      const d = new Date(obs.date);
      dateEl.textContent = isNaN(d) ? obs.date : d.toLocaleDateString('fr-FR');
    } else { dateEl.textContent = '—'; }

    detail.querySelector('.obs-observateurs').textContent = obs.observateurs || '—';
    detail.classList.add('active');
  }

  function fermerObservation() {
    document.getElementById('obs-detail')?.classList.remove('active');
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

  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  }

  return {
    init, importMBTiles, invalidateSize, parseGPS, formatDM,
    ouvrirDescente, fermerDescente,
    ouvrirObservation, fermerObservation,
    ouvrirPhotoFullscreen, fermerPhotoFullscreen,
  };

})();

window.Carte = Carte;
