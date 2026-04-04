/* carte.js — Module carte pour cenoutil
   Leaflet + MBTiles littoextract + marqueurs sites
*/

'use strict';

const Carte = (() => {

  let map = null;
  let mbtilesLayer = null;
  let markersLayer = null;
  let initialized = false;
  let markers = [];

  /* ── Initialisation de la carte ── */
  async function init(containerId, markersData) {
    if (initialized) return;
    markers = markersData;

    // Centre sur la zone d'étude (entre Le Havre et Étretat)
    map = L.map(containerId, {
      center: [49.59, 0.12],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Fond de carte OSM (fallback si MBTiles non chargé)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
      opacity: 0.6,
    });

    // Tentative de chargement du MBTiles littoextract depuis OPFS
    await _loadMBTiles(osmLayer);

    // Ajout des marqueurs
    _addMarkers(markersData);

    // Mise à jour du statut
    _updateStatus();

    initialized = true;
  }

  /* ── Chargement MBTiles ── */
  async function _loadMBTiles(fallbackLayer) {
    const status = document.getElementById('map-status-text');
    if (status) status.textContent = 'Chargement du fond de carte…';

    const found = await MBTiles.openFromOPFS('cenoutil.mbtiles');

    if (found && MBTiles.isReady()) {
      // Couche MBTiles
      const MBLayer = MBTiles.createLeafletLayer();
      mbtilesLayer = new MBLayer();
      mbtilesLayer.addTo(map);

      // Ajuster l'emprise si disponible
      const bounds = MBTiles.getBounds();
      if (bounds) map.fitBounds(bounds);

      if (status) status.textContent = 'Fond IGN BD ORTHO chargé';
    } else {
      // OSM fallback
      fallbackLayer.addTo(map);
      if (status) status.textContent = 'Fond OSM — importer le MBTiles littoextract pour le fond IGN';
    }
  }

  /* ── Import MBTiles depuis fichier utilisateur ── */
  async function importMBTiles(file) {
    const status = document.getElementById('map-status-text');
    if (status) status.textContent = 'Import MBTiles en cours…';

    await MBTiles.openFromFile(file);

    if (MBTiles.isReady()) {
      // Retirer le fallback OSM
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      if (mbtilesLayer) map.removeLayer(mbtilesLayer);

      const MBLayer = MBTiles.createLeafletLayer();
      mbtilesLayer = new MBLayer();
      mbtilesLayer.addTo(map);

      const bounds = MBTiles.getBounds();
      if (bounds) map.fitBounds(bounds);

      if (status) status.textContent = 'Fond IGN BD ORTHO chargé et sauvegardé';
    }
  }

  /* ── Ajout des marqueurs ── */
  function _addMarkers(markersData) {
    markersLayer = L.layerGroup().addTo(map);

    const iconHtml = `<div class="marker-cenoutil"></div>`;
    const markerIcon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    });

    markersData.forEach(site => {
      const marker = L.marker([site.lat, site.lng], { icon: markerIcon });

      // Popup avec photo miniature et bouton fiche complète
      const popupContent = `
        <div class="popup-inner">
          ${site.photo ? `<img class="popup-photo" src="${site.photo}" alt="${site.nom}" onerror="this.style.display='none'">` : ''}
          <div style="padding:10px 12px 4px;">
            <div class="popup-title">${site.nom}</div>
            <div class="popup-sub">${site.etat || ''}</div>
          </div>
          <button class="popup-btn" onclick="Carte.ouvrirFiche(${site.id})">
            Voir la fiche complète →
          </button>
        </div>`;

      marker.bindPopup(popupContent, {
        maxWidth: 220,
        className: 'cenoutil-popup',
      });

      marker.addTo(markersLayer);
    });
  }

  /* ── Ouverture fiche site (depuis popup) ── */
  function ouvrirFiche(siteId) {
    const site = markers.find(m => m.id === siteId);
    if (!site) return;
    map.closePopup();

    const detail = document.getElementById('site-detail');
    if (!detail) return;

    detail.querySelector('.site-content h2').textContent = site.nom;
    detail.querySelector('.site-coords').textContent =
      `${site.lat.toFixed(5)}°N  ${site.lng.toFixed(5)}°E`;
    detail.querySelector('.site-desc').textContent = site.description || '';
    detail.querySelector('.site-access-text').textContent = site.acces || '';

    const photo = detail.querySelector('.site-photo');
    if (photo) {
      photo.src = site.photo || '';
      photo.style.display = site.photo ? 'block' : 'none';
    }

    detail.classList.add('active');
  }

  /* ── Fermeture fiche site ── */
  function fermerFiche() {
    const detail = document.getElementById('site-detail');
    if (detail) detail.classList.remove('active');
  }

  /* ── Statut marqueurs visibles ── */
  function _updateStatus() {
    const countEl = document.getElementById('map-count');
    if (countEl) countEl.textContent = `${markers.length} sites`;
  }

  /* ── Invalidation taille (après activation onglet) ── */
  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  }

  return { init, importMBTiles, ouvrirFiche, fermerFiche, invalidateSize };

})();

window.Carte = Carte;
