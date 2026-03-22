/* ═══════════════════════════════════════════════════════════
   villes2csv — app.js
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── State ───────────────────────────────────────────────────
let cities = [];          // { nom, initiale, latitude, longitude, affichage_nominatim, _status, _isNew }
let map, markers = {};
let currentTile = 'osm';

// ─── Tile layers ─────────────────────────────────────────────
const TILES = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }
  },
  ign: {
    url: 'https://data.geopf.fr/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    opts: {
      attribution: '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme',
      maxZoom: 19
    }
  }
};

let tileLayer;

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  bindEvents();
  renderList();
});

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([46.8, 2.3], 6);
  tileLayer = L.tileLayer(TILES.osm.url, TILES.osm.opts).addTo(map);
}

// ─── Events ──────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('csv-input').addEventListener('change', onCsvLoad);
  document.getElementById('search-btn').addEventListener('click', onSearch);
  document.getElementById('city-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') onSearch();
  });
  document.getElementById('save-btn').addEventListener('click', onSave);
  document.getElementById('clear-btn').addEventListener('click', onClear);
  document.getElementById('picker-cancel').addEventListener('click', hidePicker);

  document.querySelectorAll('.tile-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.tile-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      switchTile(el.dataset.tile);
    });
  });
}

// ─── CSV Load ────────────────────────────────────────────────
function onCsvLoad(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('csv-filename').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    const parsed = parseCSV(ev.target.result);
    if (parsed.length === 0) { showStatus('CSV vide ou invalide', 'err'); return; }
    cities = parsed.map(r => ({ ...r, _status: 'valid', _isNew: false }));
    renderAll();
    showStatus(`${cities.length} ville(s) chargée(s)`, 'ok');
    document.getElementById('save-btn').disabled = false;
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // header: nom,initiale,latitude,longitude,affichage_nominatim
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    if (parts.length < 5) continue;
    rows.push({
      nom: parts[0].trim(),
      initiale: parts[1].replace(/"/g, '').trim(),
      latitude: parseFloat(parts[2]),
      longitude: parseFloat(parts[3]),
      affichage_nominatim: parts[4].replace(/^"|"$/g, '').trim()
    });
  }
  return rows.filter(r => r.nom && !isNaN(r.latitude) && !isNaN(r.longitude));
}

function splitCSVLine(line) {
  // Handles quoted fields containing commas
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Search / Nominatim ──────────────────────────────────────
async function onSearch() {
  const query = document.getElementById('city-input').value.trim();
  if (!query) return;
  showLoading(true);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=fr`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const data = await res.json();
    showLoading(false);
    if (!data || data.length === 0) {
      showStatus(`Aucun résultat pour "${query}"`, 'err');
      return;
    }
    if (data.length === 1) {
      addCityFromNominatim(data[0], query);
    } else {
      showPicker(data, query);
    }
  } catch (err) {
    showLoading(false);
    showStatus('Erreur réseau Nominatim', 'err');
  }
}

function addCityFromNominatim(item, queryName) {
  const nom = item.namedetails?.name || item.display_name.split(',')[0].trim() || queryName;
  const initiale = nom.replace(/^(le |la |les |l'|l')/i, '').trim()[0].toUpperCase();
  const city = {
    nom,
    initiale: `"${initiale}"`,
    latitude: parseFloat(parseFloat(item.lat).toFixed(6)),
    longitude: parseFloat(parseFloat(item.lon).toFixed(6)),
    affichage_nominatim: item.display_name,
    _status: 'new',
    _isNew: true
  };
  cities.unshift(city);
  renderAll();
  showStatus(`"${nom}" ajoutée — validez ou invalidez`, 'ok');
  document.getElementById('city-input').value = '';
  document.getElementById('save-btn').disabled = false;
  // Pan map
  map.setView([city.latitude, city.longitude], 10);
}

// ─── Picker modal ────────────────────────────────────────────
function showPicker(results, queryName) {
  const box = document.getElementById('picker-results');
  box.innerHTML = '';
  results.forEach(item => {
    const el = document.createElement('div');
    el.className = 'picker-item';
    const name = item.display_name.split(',')[0].trim();
    el.innerHTML = `<strong>${name}</strong><small>${item.display_name}</small>`;
    el.addEventListener('click', () => {
      hidePicker();
      addCityFromNominatim(item, queryName);
    });
    box.appendChild(el);
  });
  document.getElementById('picker-overlay').classList.remove('hidden');
}

function hidePicker() {
  document.getElementById('picker-overlay').classList.add('hidden');
}

// ─── Tile switch ─────────────────────────────────────────────
function switchTile(name) {
  if (!TILES[name]) return;
  currentTile = name;
  map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILES[name].url, TILES[name].opts).addTo(map);
}

// ─── Render ──────────────────────────────────────────────────
function renderAll() {
  renderList();
  renderMarkers();
  updateCount();
}

function renderList() {
  const container = document.getElementById('city-list');
  container.innerHTML = '';
  cities.forEach((city, idx) => {
    const card = document.createElement('div');
    card.className = `city-card ${city._status}`;
    const lat = typeof city.latitude  === 'number' ? city.latitude.toFixed(4)  : city.latitude;
    const lon = typeof city.longitude === 'number' ? city.longitude.toFixed(4) : city.longitude;
    const initialeRaw = (city.initiale || '').replace(/"/g,'');
    const badge = badgeHTML(city._status, city._isNew);
    card.innerHTML = `
      <div>
        <div class="city-name">${initialeRaw ? `<span style="color:var(--muted);font-size:.75em;margin-right:4px">${initialeRaw}</span>` : ''}${city.nom}</div>
        <div class="city-coords">${lat}, ${lon}</div>
      </div>
      ${badge}
      <div class="city-actions">
        <button class="icon-btn ok" title="Valider" data-idx="${idx}" data-action="validate">✓</button>
        <button class="icon-btn no" title="Invalider" data-idx="${idx}" data-action="invalidate">✗</button>
        <button class="icon-btn del" title="Supprimer" data-idx="${idx}" data-action="delete">🗑</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.city-actions')) return;
      map.setView([city.latitude, city.longitude], 12);
    });
    container.appendChild(card);
  });

  // Delegate action buttons
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = parseInt(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'validate')   { cities[idx]._status = 'valid';   cities[idx]._isNew = false; }
      if (action === 'invalidate') { cities[idx]._status = 'invalid'; cities[idx]._isNew = false; }
      if (action === 'delete')     { cities.splice(idx, 1); }
      renderAll();
    });
  });
}

function badgeHTML(status, isNew) {
  if (isNew)              return `<span class="city-badge badge-new">Nouvelle</span>`;
  if (status === 'valid') return `<span class="city-badge badge-valid">Validée</span>`;
  if (status === 'invalid') return `<span class="city-badge badge-invalid">Invalidée</span>`;
  return `<span class="city-badge badge-pending">?</span>`;
}

// ─── Markers ─────────────────────────────────────────────────
function renderMarkers() {
  // Clear old markers
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  cities.forEach((city, idx) => {
    if (isNaN(city.latitude) || isNaN(city.longitude)) return;
    const color = markerColor(city);
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:12px;height:12px;border-radius:50%;
        background:${color};
        border:2px solid rgba(255,255,255,.7);
        box-shadow:0 0 6px ${color}88;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const marker = L.marker([city.latitude, city.longitude], { icon })
      .addTo(map);

    const tooltipClass = `leaflet-tooltip-city tooltip-${city._status === 'new' || city._isNew ? 'new' : city._status}`;
    marker.bindTooltip(city.nom, {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      className: tooltipClass
    });

    marker.on('click', () => {
      map.setView([city.latitude, city.longitude], 12);
    });

    markers[idx] = marker;
  });

  // Fit bounds if we have cities
  if (cities.length > 0) {
    const validCoords = cities.filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
    if (validCoords.length > 1) {
      map.fitBounds(validCoords.map(c => [c.latitude, c.longitude]), { padding: [40, 40] });
    }
  }
}

function markerColor(city) {
  if (city._isNew || city._status === 'new') return 'var(--accent2, #50e3c2)';
  if (city._status === 'valid')   return '#4cdb7e';
  if (city._status === 'invalid') return '#e05a5a';
  return '#6b8db5';
}

// ─── Count ───────────────────────────────────────────────────
function updateCount() {
  const total = cities.length;
  const valid = cities.filter(c => c._status === 'valid').length;
  const inv   = cities.filter(c => c._status === 'invalid').length;
  const newC  = cities.filter(c => c._isNew).length;
  document.getElementById('csv-count').textContent =
    `${total} ville(s) — ✓ ${valid}  ✗ ${inv}  ★ ${newC}`;
}

// ─── Save CSV ────────────────────────────────────────────────
function onSave() {
  // Only save validated cities (not invalid)
  const toSave = cities.filter(c => c._status !== 'invalid');
  if (toSave.length === 0) { showStatus('Aucune ville à sauvegarder', 'err'); return; }

  const lines = ['nom,initiale,latitude,longitude,affichage_nominatim'];
  toSave.forEach(c => {
    const initiale = (c.initiale || '').replace(/"/g, '');
    const nom_field = c.nom.includes(',') ? `"${c.nom}"` : c.nom;
    const aff = c.affichage_nominatim || '';
    lines.push(`${nom_field},"${initiale}",${c.latitude},${c.longitude},"${aff}"`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'villes.csv';
  a.click();
  URL.revokeObjectURL(url);
  showStatus(`${toSave.length} ville(s) sauvegardée(s)`, 'ok');
}

// ─── Clear ───────────────────────────────────────────────────
function onClear() {
  if (cities.length === 0) return;
  if (!confirm('Effacer toutes les villes ?')) return;
  cities = [];
  document.getElementById('csv-filename').textContent = '';
  document.getElementById('csv-input').value = '';
  document.getElementById('save-btn').disabled = true;
  renderAll();
  map.setView([46.8, 2.3], 6);
}

// ─── UI helpers ──────────────────────────────────────────────
let statusTimer;
function showStatus(msg, type = '') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function showLoading(on) {
  document.getElementById('loading').classList.toggle('hidden', !on);
}

// ─── Service Worker registration ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
