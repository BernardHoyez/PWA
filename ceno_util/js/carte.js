/* carte.js — ceno_util
   Marqueurs : accès (vert) · observation sans audio (ocre) ·
               observation avec audio (violet) · GPS (bleu)
   Audio : lecture MP3 sur bouton ▶ dans la fiche
   Proximité : bip à 30 m d'un marqueur vocalisé (une fois par session)
*/

'use strict';

const Carte = (() => {

  let map          = null;
  let mbtilesLayer = null;
  let osmLayer     = null;
  let initialized  = false;
  let descentes    = [];
  let observations = [];

  /* Ensemble des marqueurs vocalisés déjà alertés cette session */
  const _alertedIds = new Set();

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
      const lat = parseFloat(((parseFloat(dm[1]) + parseFloat(dm[2]) / 60) * (dm[3]==='S'?-1:1)).toFixed(4));
      const lng = parseFloat(((parseFloat(dm[4]) + parseFloat(dm[5]) / 60) * (dm[6]==='W'?-1:1)).toFixed(4));
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
    const dd = str.match(/(\d+(?:\.\d+)?)°?\s*([NS])\s+(\d+(?:\.\d+)?)°?\s*([EW])/);
    if (dd) {
      const lat = parseFloat((parseFloat(dd[1]) * (dd[2]==='S'?-1:1)).toFixed(4));
      const lng = parseFloat((parseFloat(dd[3]) * (dd[4]==='W'?-1:1)).toFixed(4));
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
    return null;
  }

  function formatDM(lat, lng) {
    const latD = Math.floor(Math.abs(lat));
    const latM = ((Math.abs(lat) - latD) * 60).toFixed(3);
    const lngD = Math.floor(Math.abs(lng));
    const lngM = ((Math.abs(lng) - lngD) * 60).toFixed(3);
    return `${latD}°${latM}${lat>=0?'N':'S'}  ${lngD}°${lngM}${lng>=0?'E':'W'}`;
  }

  /* ══════════════════════════════════════
     DISTANCE HAVERSINE (mètres)
     ══════════════════════════════════════ */

  function _distanceM(lat1, lng1, lat2, lng2) {
    const R  = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /* ══════════════════════════════════════
     BIP DE PROXIMITÉ (Web Audio API)
     ══════════════════════════════════════ */

  function _bip() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, start, dur) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type      = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop (ctx.currentTime + start + dur + 0.05);
      };
      play(880, 0.0, 0.18);   /* bip 1 */
      play(1100, 0.22, 0.18); /* bip 2 */
      /* Vibration si supportée */
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    } catch(e) { console.warn('[audio] bip:', e); }
  }

  /* ══════════════════════════════════════
     INITIALISATION CARTE
     ══════════════════════════════════════ */

  async function init(containerId, descentesData, obsData) {
    if (initialized) return;
    descentes    = descentesData || [];
    observations = obsData       || [];

    map = L.map(containerId, { center:[49.60,0.13], zoom:13, zoomControl:true });

    osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap', maxZoom:19, opacity:0.8
    });

    await _autoLoadMap();
    _addDescentes(descentes);
    _addObservations(observations);
    _addLegend();
    _updateStatus();

    initialized = true;
  }

  /* ══════════════════════════════════════
     FOND DE CARTE
     ══════════════════════════════════════ */

  async function _autoLoadMap() {
    const result = await MBTiles.autoLoad((msg, pct) => {
      _setStatus(msg); _setProgress(pct);
    });
    if (result.mode === 'mbtiles') {
      _applyMBTilesLayer();
      _setStatus(`Fond IGN BD ORTHO (${result.source==='opfs'?'cache':'téléchargé'})`);
    } else {
      osmLayer.addTo(map);
      _setStatus('Fond OSM — réseau requis');
    }
    _setProgress(null);
    _updateMapButtons();
  }

  function _applyMBTilesLayer() {
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    if (mbtilesLayer && map.hasLayer(mbtilesLayer)) map.removeLayer(mbtilesLayer);
    const LC  = MBTiles.createLeafletLayer();
    mbtilesLayer = new LC();
    mbtilesLayer.addTo(map);
    const b = MBTiles.getBounds();
    if (b) map.fitBounds(b);
  }

  async function importAutreMBTiles(file) {
    _setStatus(`Import de ${file.name}…`); _setProgress(5);
    await MBTiles.openFromFile(file, (msg,pct)=>{ _setStatus(msg); _setProgress(pct); });
    if (MBTiles.isReady()) { _applyMBTilesLayer(); _setStatus(`Fond : ${file.name}`); }
    _setProgress(null); _updateMapButtons();
  }

  function activerOSM() {
    if (mbtilesLayer && map.hasLayer(mbtilesLayer)) map.removeLayer(mbtilesLayer);
    if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
    _setStatus('Fond OSM (réseau requis)'); _updateMapButtons();
  }

  function _updateMapButtons() {
    const btnOSM = document.getElementById('btn-osm');
    const btnMB  = document.getElementById('btn-mbtiles-autre');
    const usingOSM = map.hasLayer(osmLayer);
    if (btnOSM) {
      btnOSM.style.background  = usingOSM ? '#1a73e8' : 'white';
      btnOSM.style.color       = usingOSM ? 'white'   : '#555';
    }
    if (btnMB) {
      btnMB.style.background   = !usingOSM && MBTiles.isReady() ? '#2d7a4f' : 'white';
      btnMB.style.color        = !usingOSM && MBTiles.isReady() ? 'white'   : '#555';
    }
  }

  /* ══════════════════════════════════════
     MARQUEURS DESCENTES — vert
     ══════════════════════════════════════ */

  function _addDescentes(data) {
    const layer = L.layerGroup().addTo(map);
    const icon  = L.divIcon({ html:'<div class="marker-descente"></div>',
      className:'', iconSize:[18,18], iconAnchor:[9,9], popupAnchor:[0,-12] });
    data.forEach(site => {
      const m = L.marker([site.lat, site.lng], { icon });
      m.bindPopup(_popupDescente(site), { maxWidth:230 });
      m.addTo(layer);
    });
  }

  function _popupDescente(site) {
    return `<div class="popup-inner">
      ${site.photo?`<img class="popup-photo" src="${site.photo}" alt="${site.nom}" onerror="this.style.display='none'">`: ''}
      <div style="padding:9px 12px 4px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#2d7a4f;margin-bottom:3px;">Accès falaise</div>
        <div class="popup-title">${site.nom}</div>
        <div class="popup-sub">${site.etat||''}</div>
      </div>
      <button class="popup-btn" onclick="Carte.ouvrirDescente(${site.id})">Voir la fiche →</button>
    </div>`;
  }

  /* ══════════════════════════════════════
     MARQUEURS OBSERVATIONS — ocre ou violet
     ══════════════════════════════════════ */

  function _addObservations(data) {
    const layer = L.layerGroup().addTo(map);
    data.forEach(obs => {
      let lat = obs.lat, lng = obs.lng;
      if ((!lat || !lng) && obs.coords_originales) {
        const p = parseGPS(obs.coords_originales);
        if (p) { lat = p.lat; lng = p.lng; }
      }
      if (!isFinite(lat) || !isFinite(lng)) return;

      const hasAudio = !!obs.audio;
      /* Icône : point ocre ou violet avec petit symbole son */
      const html = hasAudio
        ? `<div class="marker-audio"><span class="marker-audio-icon">♪</span></div>`
        : `<div class="marker-observation"></div>`;
      const icon = L.divIcon({
        html, className:'',
        iconSize:[hasAudio?22:16, hasAudio?22:16],
        iconAnchor:[hasAudio?11:8, hasAudio?11:8],
        popupAnchor:[0,-12]
      });
      const m = L.marker([lat, lng], { icon });
      m.bindPopup(_popupObservation(obs), { maxWidth:240 });
      m.addTo(layer);
    });
  }

  function _popupObservation(obs) {
    const fossilesCourt = obs.fossiles
      ? obs.fossiles.split(',').slice(0,2).join(', ') + (obs.fossiles.split(',').length>2?'…':'')
      : '';
    const audioBadge = obs.audio
      ? `<div style="font-size:9px;font-weight:700;background:#f3eaff;color:#7b4fa6;
           padding:2px 7px;border-radius:8px;display:inline-block;margin-top:3px;">♪ Audio disponible</div>`
      : '';
    return `<div class="popup-obs-inner">
      <div class="popup-obs-badge" style="${obs.audio?'background:#7b4fa6;':''}">
        ${obs.audio?'♪ ':''}Observation
      </div>
      <div class="popup-title">${obs.nom}</div>
      ${obs.stratigraphie?`<div class="popup-sub">${obs.stratigraphie}</div>`:''}
      ${fossilesCourt?`<div class="popup-sub" style="font-style:italic;margin-top:2px;">${fossilesCourt}</div>`:''}
      ${audioBadge}
    </div>
    <button class="popup-btn" style="background:${obs.audio?'#7b4fa6':'#b5820a'};"
      onclick="Carte.ouvrirObservation('${obs.id}')">Voir la fiche →</button>`;
  }

  /* ══════════════════════════════════════
     FICHE DESCENTE
     ══════════════════════════════════════ */

  function ouvrirDescente(siteId) {
    const site = descentes.find(m => m.id === siteId);
    if (!site) return;
    map.closePopup();
    _setZoomVisible(false); _setGeoButtonVisible(false); _setMapButtonsVisible(false);
    const d = document.getElementById('site-detail');
    if (!d) return;
    d.querySelector('.site-content h2').textContent  = site.nom;
    d.querySelector('.site-coords').textContent      = formatDM(site.lat, site.lng);
    d.querySelector('.site-desc').textContent        = site.description || '';
    d.querySelector('.site-access-text').textContent = site.acces || '';
    const photo = d.querySelector('.site-photo');
    if (photo) { photo.src = site.photo||''; photo.style.display = site.photo?'block':'none'; }
    d.classList.add('active');
  }

  function fermerDescente() {
    document.getElementById('site-detail')?.classList.remove('active');
    _setZoomVisible(true); _setGeoButtonVisible(true); _setMapButtonsVisible(true);
  }

  /* ══════════════════════════════════════
     FICHE OBSERVATION (avec audio)
     ══════════════════════════════════════ */

  function ouvrirObservation(obsId) {
    const obs = observations.find(o => o.id === obsId);
    if (!obs) return;
    map.closePopup();
    _setZoomVisible(false); _setGeoButtonVisible(false); _setMapButtonsVisible(false);

    const d = document.getElementById('obs-detail');
    if (!d) return;

    let lat = obs.lat, lng = obs.lng;
    if ((!lat||!lng) && obs.coords_originales) {
      const p = parseGPS(obs.coords_originales);
      if (p) { lat = p.lat; lng = p.lng; }
    }
    d.querySelector('.obs-title').textContent  = obs.nom;
    d.querySelector('.obs-coords').textContent = obs.coords_originales || (lat ? formatDM(lat,lng) : '');

    /* Photo */
    const photoWrap = d.querySelector('.obs-photo-wrap');
    const photo     = d.querySelector('.obs-photo');
    if (photo && obs.photo) {
      photo.src = obs.photo; photo.alt = obs.nom; photoWrap.style.display = 'flex';
      photo.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);
    } else { photoWrap.style.display = 'none'; }

    const zBtn = d.querySelector('.obs-photo-zoom');
    if (zBtn && obs.photo) zBtn.onclick = () => ouvrirPhotoFullscreen(obs.photo, obs.nom);

    /* Champs structurés */
    d.querySelector('.obs-strat-value').textContent  = obs.stratigraphie || '—';
    const fosEl = d.querySelector('.obs-fossiles-list');
    fosEl.innerHTML = obs.fossiles
      ? obs.fossiles.split(',').map(f=>`<span class="obs-fossile-chip">${f.trim()}</span>`).join('')
      : '<span style="color:var(--text-ter);font-size:12px;">—</span>';
    d.querySelector('.obs-commentaire').textContent  = obs.commentaire || '—';
    const dateEl = d.querySelector('.obs-date');
    if (obs.date) { const dt = new Date(obs.date); dateEl.textContent = isNaN(dt)?obs.date:dt.toLocaleDateString('fr-FR'); }
    else dateEl.textContent = '—';
    d.querySelector('.obs-observateurs').textContent = obs.observateurs || '—';

    /* ── AUDIO ── */
    const audioSec  = d.querySelector('.obs-audio-section');
    const audioBtn  = d.querySelector('.obs-audio-btn');
    const audioEl   = d.querySelector('.obs-audio-player');

    if (obs.audio) {
      audioSec.style.display = 'block';
      /* Réinitialiser le lecteur */
      audioEl.pause();
      audioEl.src    = obs.audio;
      audioEl.currentTime = 0;
      _setAudioBtnState(audioBtn, audioEl, 'stopped');

      audioBtn.onclick = () => {
        if (audioEl.paused) {
          audioEl.play().catch(e => console.warn('[audio]', e));
        } else {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
      };
      audioEl.onplay  = () => _setAudioBtnState(audioBtn, audioEl, 'playing');
      audioEl.onpause = () => _setAudioBtnState(audioBtn, audioEl, 'stopped');
      audioEl.onended = () => _setAudioBtnState(audioBtn, audioEl, 'stopped');
    } else {
      audioSec.style.display = 'none';
      audioEl.pause(); audioEl.src = '';
    }

    d.classList.add('active');
  }

  function _setAudioBtnState(btn, audio, state) {
    if (!btn) return;
    if (state === 'playing') {
      btn.innerHTML = `<span style="font-size:18px;">⏹</span><span>Arrêter</span>`;
      btn.style.background = '#5a2a8a';
    } else {
      btn.innerHTML = `<span style="font-size:18px;">▶</span><span>Écouter le commentaire</span>`;
      btn.style.background = '#7b4fa6';
    }
  }

  function fermerObservation() {
    /* Arrêter l'audio si en cours */
    const audioEl = document.querySelector('.obs-audio-player');
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    document.getElementById('obs-detail')?.classList.remove('active');
    _setZoomVisible(true); _setGeoButtonVisible(true); _setMapButtonsVisible(true);
  }

  /* ══════════════════════════════════════
     PHOTO PLEIN ÉCRAN
     ══════════════════════════════════════ */

  function ouvrirPhotoFullscreen(src, alt) {
    const fs = document.getElementById('obs-photo-fullscreen');
    if (!fs) return;
    const img = fs.querySelector('img');
    if (img) { img.src = src; img.alt = alt||''; }
    fs.classList.add('active');
  }

  function fermerPhotoFullscreen() {
    document.getElementById('obs-photo-fullscreen')?.classList.remove('active');
  }

  /* ══════════════════════════════════════
     GÉOLOCALISATION + PROXIMITÉ AUDIO
     ══════════════════════════════════════ */

  let _geoActive  = false;
  let _geoWatchId = null;
  let _geoMarker  = null;
  let _geoCircle  = null;
  let _geoFirst   = true;

  const PROX_RADIUS = 30; /* mètres */

  function toggleGeolocate() {
    _geoActive ? _stopGeo() : _startGeo();
  }

  function _startGeo() {
    if (!navigator.geolocation) { _setStatus('GPS non disponible'); return; }
    _geoActive = true; _geoFirst = true;
    _setBtnGeoActive(true);
    _setStatus('Acquisition GPS…');
    _geoWatchId = navigator.geolocation.watchPosition(_onGeoSuccess, _onGeoError,
      { enableHighAccuracy:true, maximumAge:5000, timeout:15000 });
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
        radius:acc, color:'#1a73e8', fillColor:'#1a73e8', fillOpacity:0.1, weight:1
      }).addTo(map);
      const icon = L.divIcon({ html:'<div class="geo-dot"></div>',
        className:'', iconSize:[18,18], iconAnchor:[9,9] });
      _geoMarker = L.marker([lat, lng], { icon, zIndexOffset:1000 }).addTo(map);
    }

    if (_geoFirst) {
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
      _geoFirst = false;
    }

    _setStatus(`📍 ${formatDM(lat, lng)} · ±${acc} m`);

    /* ── Détection de proximité audio (30 m) ── */
    observations.forEach(obs => {
      if (!obs.audio) return;
      if (_alertedIds.has(obs.id)) return;

      let olat = obs.lat, olng = obs.lng;
      if ((!olat || !olng) && obs.coords_originales) {
        const p = parseGPS(obs.coords_originales);
        if (p) { olat = p.lat; olng = p.lng; }
      }
      if (!isFinite(olat) || !isFinite(olng)) return;

      const dist = _distanceM(lat, lng, olat, olng);
      if (dist <= PROX_RADIUS) {
        _alertedIds.add(obs.id);
        _bip();
        _showProximityToast(obs.nom, dist);
      }
    });
  }

  function _onGeoError(err) {
    const msgs = { 1:'Permission GPS refusée', 2:'Position indisponible', 3:'Délai GPS dépassé' };
    _setStatus(msgs[err.code] || 'Erreur GPS');
    _stopGeo();
  }

  /* Toast de proximité */
  function _showProximityToast(nom, dist) {
    const t = document.createElement('div');
    t.style.cssText = [
      'position:fixed', 'bottom:72px', 'left:50%', 'transform:translateX(-50%)',
      'background:#7b4fa6', 'color:white', 'padding:9px 16px', 'border-radius:20px',
      'font-size:13px', 'font-weight:600', 'box-shadow:0 3px 12px rgba(0,0,0,.25)',
      'z-index:9999', 'white-space:nowrap', 'pointer-events:none',
      'max-width:90vw', 'text-overflow:ellipsis', 'overflow:hidden',
    ].join(';');
    t.textContent = `♪ Site à ${Math.round(dist)} m — ${nom}`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .4s';
      setTimeout(() => t.remove(), 500); }, 5000);
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
     LÉGENDE
     ══════════════════════════════════════ */

  function _addLegend() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const nbAudio = observations.filter(o => !!o.audio).length;
    const nbSans  = observations.filter(o => !o.audio).length;
    const leg = document.createElement('div');
    leg.className = 'map-legend';
    leg.innerHTML = `
      <div><span class="legend-dot" style="background:#2d7a4f;"></span>Accès falaise (${descentes.length})</div>
      ${nbSans  ? `<div><span class="legend-dot" style="background:#b5820a;"></span>Observations (${nbSans})</div>` : ''}
      ${nbAudio ? `<div><span class="legend-dot" style="background:#7b4fa6;"></span>Observations + audio (${nbAudio})</div>` : ''}`;
    mapEl.appendChild(leg);
  }

  /* ══════════════════════════════════════
     UTILITAIRES
     ══════════════════════════════════════ */

  function _setStatus(txt) { const e=document.getElementById('map-status-text'); if(e) e.textContent=txt; }
  function _updateStatus() { const e=document.getElementById('map-count'); if(e) e.textContent=`${descentes.length} accès · ${observations.length} obs.`; }
  function _setProgress(pct) {
    const bar=document.getElementById('map-progress-bar');
    const wrap=document.getElementById('map-progress-wrap');
    if (!bar||!wrap) return;
    if (pct===null) { wrap.style.display='none'; }
    else { wrap.style.display='block'; bar.style.width=pct+'%'; }
  }
  function _setZoomVisible(v)      { const c=document.querySelector('.leaflet-control-zoom'); if(c) c.style.display=v?'':'none'; }
  function _setGeoButtonVisible(v) { const b=document.getElementById('btn-geolocate');         if(b) b.style.display=v?'':'none'; }
  function _setMapButtonsVisible(v){ const w=document.getElementById('map-buttons-wrap');      if(w) w.style.display=v?'':'none'; }
  function invalidateSize()        { if(map) setTimeout(()=>map.invalidateSize(),100); }

  return {
    init, invalidateSize, parseGPS, formatDM,
    importAutreMBTiles, activerOSM, toggleGeolocate,
    ouvrirDescente, fermerDescente,
    ouvrirObservation, fermerObservation,
    ouvrirPhotoFullscreen, fermerPhotoFullscreen,
  };

})();

window.Carte = Carte;
