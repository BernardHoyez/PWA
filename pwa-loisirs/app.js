/* ────────────────────────────────────────────
   Loisirs Proches — app.js
   Source : OpenAgenda API v2 (gratuite)
   ──────────────────────────────────────────── */

'use strict';

// ── CONFIG ────────────────────────────────────
const CONFIG = {
  // Clé publique OpenAgenda — remplacer par votre clé sur https://openagenda.com/settings
  OA_KEY: '35981cffea494577b26c917eaa63f985',
  OA_BASE: 'https://api.openagenda.com/v2/events',
  MAX_EVENTS: 100,
  CACHE_TTL: 15 * 60 * 1000, // 15 min
};

// Couleurs par catégorie
const CATEGORY_COLORS = {
  'concert':      '#ff6b6b',
  'musique':      '#ff6b6b',
  'exposition':   '#a78bfa',
  'theatre':      '#f59e0b',
  'spectacle':    '#f59e0b',
  'cinema':       '#60a5fa',
  'sport':        '#34d399',
  'festival':     '#fb923c',
  'marche':       '#4ade80',
  'conference':   '#94a3b8',
  'atelier':      '#f472b6',
  'default':      '#6366f1',
};

// ── STATE ─────────────────────────────────────
let state = {
  coords: null,
  radius: 10,
  days: 7,
  tariff: 'all',
  events: [],
  filtered: [],
  cache: null,
  cacheTime: 0,
};

// ── DOM REFS ──────────────────────────────────
const $ = id => document.getElementById(id);
const radiusSlider  = $('radiusSlider');
const daysSlider    = $('daysSlider');
const radiusVal     = $('radiusVal');
const daysVal       = $('daysVal');
const searchBtn     = $('searchBtn');
const eventsGrid    = $('eventsGrid');
const statusText    = $('statusText');
const loadingState  = $('loadingState');
const emptyState    = $('emptyState');
const locationText  = $('locationText');
const modalOverlay  = $('modalOverlay');
const modalCard     = $('modalCard');
const modalContent  = $('modalContent');
const modalClose    = $('modalClose');
const offlineBanner = $('offlineBanner');
const installPrompt = $('installPrompt');

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  registerSW();
  bindSliders();
  bindTariffPills();
  bindSearch();
  bindModal();
  bindInstallPrompt();
  monitorNetwork();
  geolocate();
});

// ── SERVICE WORKER ────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] enregistré :', reg.scope))
      .catch(err => console.warn('[SW] échec :', err));
  }
}

// ── GÉOLOCALISATION ───────────────────────────
function geolocate() {
  if (!navigator.geolocation) {
    locationText.textContent = 'Géolocalisation indisponible';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      reverseGeocode(state.coords);
    },
    err => {
      console.warn('[Geo] erreur :', err.message);
      locationText.textContent = 'Position non obtenue';
      statusText.textContent = '⚠ Activez la géolocalisation pour rechercher.';
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

async function reverseGeocode({ lat, lng }) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
    const res = await fetch(url);
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
    const cp   = data.address?.postcode || '';
    locationText.textContent = city ? `${city} ${cp}`.trim() : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    locationText.textContent = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

// ── SLIDERS ───────────────────────────────────
function bindSliders() {
  radiusSlider.addEventListener('input', () => {
    state.radius = +radiusSlider.value;
    radiusVal.textContent = `${state.radius} km`;
  });
  daysSlider.addEventListener('input', () => {
    state.days = +daysSlider.value;
    daysVal.textContent = `${state.days} jour${state.days > 1 ? 's' : ''}`;
  });
}

// ── TARIFF PILLS ──────────────────────────────
function bindTariffPills() {
  $('tariffFilter').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.tariff = pill.dataset.val;
    if (state.events.length) applyFilters();
  });
}

// ── SEARCH ────────────────────────────────────
function bindSearch() {
  searchBtn.addEventListener('click', startSearch);
}

async function startSearch() {
  if (!state.coords) {
    geolocate();
    statusText.textContent = '⏳ Obtention de la position…';
    return;
  }
  setLoading(true);
  try {
    state.events = await fetchEvents();
    applyFilters();
  } catch (err) {
    console.error('[Search]', err);
    statusText.textContent = '⚠ Erreur lors de la recherche. Vérifiez votre connexion.';
    setLoading(false);
  }
}

// ── FETCH EVENTS ──────────────────────────────
async function fetchEvents() {
  const now = Date.now();
  // Cache valide ?
  if (state.cache && (now - state.cacheTime) < CONFIG.CACHE_TTL) {
    return state.cache;
  }

  const { lat, lng } = state.coords;
  const today    = new Date();
  const horizon  = new Date();
  horizon.setDate(today.getDate() + state.days);

  const params = new URLSearchParams({
    key:             CONFIG.OA_KEY,
    longdec:         lng.toFixed(6),
    latdec:          lat.toFixed(6),
    radius:          state.radius,
    size:            CONFIG.MAX_EVENTS,
    lang:            'fr',
    'timings[gte]':  today.toISOString().slice(0, 10),
    'timings[lte]':  horizon.toISOString().slice(0, 10),
  });

  const url = `${CONFIG.OA_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const events = (json.events || []).map(normalizeEvent.bind(null, { lat, lng }));

  // Mise en cache
  state.cache     = events;
  state.cacheTime = now;

  // Stockage localStorage (fallback offline)
  try {
    localStorage.setItem('oa_cache', JSON.stringify({ events, time: now }));
  } catch(_) {}

  return events;
}

// ── NORMALIZE EVENT ───────────────────────────
function normalizeEvent({ lat: userLat, lng: userLng }, ev) {
  const title = ev.title?.fr || ev.title?.en || ev.title || 'Événement sans titre';
  const desc  = ev.description?.fr || ev.description?.en || '';
  const loc   = ev.location || {};
  const city  = loc.city || loc.address || '';
  const evLat = loc.latitude  || 0;
  const evLng = loc.longitude || 0;
  const dist  = haversine(userLat, userLng, evLat, evLng);

  // Tarif
  const priceStr = (ev.conditions?.fr || ev.conditions?.en || '').toLowerCase();
  let tariff = 'unknown';
  if (/gratuit|free|0\s*€|0\s*eur/i.test(priceStr)) tariff = 'free';
  else if (priceStr && priceStr.length > 0)           tariff = 'paid';

  // Dates
  const timings  = ev.timings?.[0] || {};
  const dateStr  = timings.begin ? formatDate(timings.begin) : '';

  // Catégorie
  const cats   = ev.keywords?.fr || ev.keywords?.en || [];
  const cat    = Array.isArray(cats) ? cats[0] : (cats || '');
  const color  = pickColor(cat);

  // URL
  const slug = ev.slug || ev.uid;
  const oa   = ev.originAgenda?.slug || '';
  const link = slug && oa ? `https://openagenda.com/${oa}/events/${slug}` : null;

  return {
    id: ev.uid, title, desc, city, dist,
    dateStr, tariff, priceStr,
    cat: cat || 'Événement', color, link,
    lat: evLat, lng: evLng,
  };
}

// ── APPLY FILTERS ─────────────────────────────
function applyFilters() {
  let list = [...state.events];

  if (state.tariff === 'free') list = list.filter(e => e.tariff === 'free');
  if (state.tariff === 'paid') list = list.filter(e => e.tariff === 'paid');

  // Trier par distance
  list.sort((a, b) => a.dist - b.dist);

  state.filtered = list;
  renderGrid(list);
}

// ── RENDER GRID ───────────────────────────────
function renderGrid(list) {
  setLoading(false);
  eventsGrid.innerHTML = '';

  if (!list.length) {
    emptyState.style.display = 'flex';
    statusText.textContent = 'Aucun résultat.';
    return;
  }

  emptyState.style.display = 'none';
  statusText.textContent = `${list.length} événement${list.length > 1 ? 's' : ''} trouvé${list.length > 1 ? 's' : ''} — rayon ${state.radius} km, ${state.days} jour${state.days > 1 ? 's' : ''}`;

  list.forEach((ev, i) => {
    const card = buildCard(ev, i);
    eventsGrid.appendChild(card);
  });
}

function buildCard(ev, idx) {
  const card = document.createElement('article');
  card.className = 'event-card';
  card.style.animationDelay = `${idx * 40}ms`;
  card.dataset.id = ev.id;

  const tariffBadge = ev.tariff === 'free'
    ? `<span class="card-tariff tariff-free">Gratuit</span>`
    : ev.tariff === 'paid'
      ? `<span class="card-tariff tariff-paid">${ev.priceStr ? truncate(ev.priceStr, 18) : 'Payant'}</span>`
      : `<span class="card-tariff" style="color:var(--text2);font-size:.72rem">Tarif N/A</span>`;

  card.innerHTML = `
    <div class="card-color-strip" style="background:${ev.color}"></div>
    <div class="card-body">
      <div class="card-category">${escHtml(ev.cat)}</div>
      <div class="card-meta">
        <span class="card-date">${ev.dateStr || '—'}</span>
        ${tariffBadge}
      </div>
      <h2 class="card-title">${escHtml(ev.title)}</h2>
      ${ev.city ? `<div class="card-location">${escHtml(ev.city)}</div>` : ''}
      <div class="card-distance">${ev.dist < 1 ? '<1 km' : ev.dist.toFixed(1) + ' km'}</div>
      ${ev.desc ? `<p class="card-desc">${escHtml(ev.desc)}</p>` : ''}
    </div>`;

  card.addEventListener('click', () => openModal(ev));
  return card;
}

// ── MODAL ─────────────────────────────────────
function bindModal() {
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(ev) {
  const tariffLabel = ev.tariff === 'free'
    ? '<span style="color:var(--accent3)">✓ Gratuit</span>'
    : ev.tariff === 'paid'
      ? `<span style="color:var(--accent2)">💶 ${escHtml(ev.priceStr || 'Payant')}</span>`
      : '<span style="color:var(--text2)">Tarif non précisé</span>';

  modalContent.innerHTML = `
    <div class="modal-strip" style="background:${ev.color}"></div>
    <div class="modal-category">${escHtml(ev.cat)}</div>
    <h2 class="modal-title">${escHtml(ev.title)}</h2>
    <div class="modal-info-row">
      ${ev.dateStr ? `<div class="modal-badge">📅 <strong>${ev.dateStr}</strong></div>` : ''}
      <div class="modal-badge">📍 <strong>${ev.city || 'Lieu non précisé'}</strong></div>
      <div class="modal-badge">◎ <strong>${ev.dist < 1 ? '<1 km' : ev.dist.toFixed(1) + ' km'}</strong></div>
      <div class="modal-badge">🎟 ${tariffLabel}</div>
    </div>
    ${ev.desc ? `<p class="modal-desc">${escHtml(ev.desc)}</p>` : ''}
    ${ev.link ? `<a class="modal-link" href="${ev.link}" target="_blank" rel="noopener">Voir l'événement ↗</a>` : ''}
  `;

  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

// ── LOADING STATE ─────────────────────────────
function setLoading(on) {
  loadingState.style.display  = on ? 'flex' : 'none';
  emptyState.style.display    = 'none';
  searchBtn.disabled          = on;
  if (on) {
    searchBtn.classList.add('loading');
    eventsGrid.innerHTML = '';
    statusText.textContent = 'Recherche en cours…';
  } else {
    searchBtn.classList.remove('loading');
  }
}

// ── NETWORK MONITORING ────────────────────────
function monitorNetwork() {
  const update = () => {
    offlineBanner.style.display = navigator.onLine ? 'none' : 'block';
    if (!navigator.onLine) {
      // Charger depuis localStorage si dispo
      try {
        const saved = JSON.parse(localStorage.getItem('oa_cache') || 'null');
        if (saved?.events?.length) {
          state.events = saved.events;
          applyFilters();
          statusText.textContent = `📦 Mode hors-ligne — ${saved.events.length} événement(s) en cache`;
        }
      } catch(_) {}
    }
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ── PWA INSTALL PROMPT ────────────────────────
let deferredInstall = null;
function bindInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    installPrompt.style.display = 'flex';
  });
  $('installYes').addEventListener('click', async () => {
    installPrompt.style.display = 'none';
    if (deferredInstall) {
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      console.log('[PWA] install:', outcome);
      deferredInstall = null;
    }
  });
  $('installNo').addEventListener('click', () => {
    installPrompt.style.display = 'none';
  });
  window.addEventListener('appinstalled', () => {
    installPrompt.style.display = 'none';
    console.log('[PWA] installée');
  });
}

// ── UTILITAIRES ───────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
          + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  } catch { return iso?.slice(0,10) || ''; }
}

function pickColor(cat) {
  if (!cat) return CATEGORY_COLORS.default;
  const key = cat.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_COLORS.default;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function truncate(str, n) {
  return str.length <= n ? str : str.slice(0, n) + '…';
}
