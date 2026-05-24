const SOURCE_URL = 'https://www.la-provence-verte.net/actualites/actualites.php';
const GEO_LIMIT_KM = 25;
const DAYS_AHEAD = 15;

const knownCoords = {
  Brignoles: [43.4077, 6.0619],
  Cotignac: [43.5280, 6.1500],
  Barjols: [43.5570, 6.0080],
  Carcès: [43.4750, 6.1850],
  Varages: [43.6020, 5.8530],
  Tourves: [43.4000, 5.9240],
  Nans: [43.3640, 5.7710],
  'Nans-les-Pins': [43.3640, 5.7710],
  Entrecasteaux: [43.5030, 6.1130],
  Châteauvert: [43.5740, 6.0250],
  'Saint-Maximin': [43.4530, 5.8620],
  'Saint-Maximin-la-Sainte-Baume': [43.4530, 5.8620],
  'Rocbaron': [43.3570, 6.0020],
  'Sainte-Anastasie': [43.3390, 6.0910]
};

const $ = (id) => document.getElementById(id);
const state = {
  position: null,
  events: []
};

function setStatus(message, isError = false) {
  const el = $('status');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'error' : '';
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizeText(s) {
  return (s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDateRange(text) {
  const months = {
    janv: 0,
    janvier: 0,
    fév: 1,
    fev: 1,
    février: 1,
    fevrier: 1,
    mars: 2,
    avr: 3,
    avril: 3,
    mai: 4,
    juin: 5,
    juil: 6,
    juillet: 6,
    août: 7,
    aout: 7,
    sept: 8,
    septembre: 8,
    oct: 9,
    octobre: 9,
    nov: 10,
    novembre: 10,
    déc: 11,
    dec: 11,
    décembre: 11,
    decembre: 11
  };

  const t = text.toLowerCase();
  const patterns = [
    /(\d{1,2})\s*(?:er)?\s*(?:au|à|-)\s*(\d{1,2})\s+([a-zéûîôàç\.]{3,12})/i,
    /(\d{1,2})\s+([a-zéûîôàç\.]{3,12})\s*(?:au|à|-)\s*(\d{1,2})\s+([a-zéûîôàç\.]{3,12})/i,
    /du\s+(\d{1,2})\s+([a-zéûîôàç\.]{3,12})\s+au\s+(\d{1,2})\s+([a-zéûîôàç\.]{3,12})/i
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;

    let d1, m1, d2, m2;
    if (m.length === 4) {
      d1 = +m[1];
      d2 = +m[2];
      m1 = m2 = months[(m[3] || '').replace('.', '')] ?? null;
    } else {
      d1 = +m[1];
      m1 = months[(m[2] || '').replace('.', '')] ?? null;
      d2 = +m[3];
      m2 = months[(m[4] || '').replace('.', '')] ?? null;
    }

    if (m1 === null || m2 === null) continue;

    const year = new Date().getFullYear();
    const start = new Date(year, m1, d1);
    const end = new Date(year, m2, d2);
    if (end < start) end.setFullYear(start.getFullYear() + 1);
    return { start, end };
  }

  return null;
}

function parsePrice(text) {
  const t = text.toLowerCase();
  if (/gratuite|gratuit|0\s?€|0€|libre/i.test(text)) return 'Gratuit';
  const euroMatch = text.match(/(\d+(?:[.,]\d+)?)\s?€/);
  if (euroMatch) return `${euroMatch[1].replace(',', '.')} €`;
  if (/tarif/i.test(t)) return 'Tarif indiqué';
  return 'Non indiqué';
}

function detectPlace(text) {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’ -]{2,}$/.test(line) && line.length < 60) {
      if (!/^(agenda|festivités|manifestations|actualités|provence verte|verdon)$/i.test(line)) {
        return line;
      }
    }
  }
  return '';
}

function extractEventsFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const bodyText = normalizeText(doc.body ? doc.body.innerText : '');
  const lines = bodyText.split('\n').map(s => s.trim()).filter(Boolean);

  const events = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!/\b(2026|2025|2027)\b/.test(line)) continue;
    if (!/(gratuit|tarif|€|festival|fête|concert|bal|brocante|vide-grenier|rando|manifestation|animation)/i.test(line)) {
      continue;
    }

    const window = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 8)).join('\n');
    const dateRange = parseDateRange(window);
    if (!dateRange) continue;

    const title = lines[i - 1] || lines[i + 1] || 'Événement';
    const place = detectPlace(window);
    const price = parsePrice(window);

    const key = `${title}__${place}__${dateRange.start.toISOString().slice(0, 10)}__${dateRange.end.toISOString().slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      title,
      place,
      start: dateRange.start,
      end: dateRange.end,
      price,
      raw: window
    });
  }

  return events;
}

function renderEvents(events) {
  const list = $('results');
  if (!list) return;

  if (!events.length) {
    list.innerHTML = `<li class="card empty">Aucun événement trouvé dans les critères demandés.</li>`;
    return;
  }

  const fmt = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  list.innerHTML = events.map(ev => {
    const place = ev.place || 'Lieu non précisé';
    const dist = Number.isFinite(ev.distanceKm) ? `${ev.distanceKm.toFixed(1)} km` : 'Distance inconnue';
    const priceClass = ev.price === 'Gratuit' ? 'free' : 'paid';
    return `
      <li class="card">
        <div class="title">${escapeHtml(ev.title)}</div>
        <div class="meta">
          <span class="tag">${escapeHtml(place)}</span>
          <span class="tag">${fmt.format(ev.start)} → ${fmt.format(ev.end)}</span>
          <span class="tag ${priceClass}">${escapeHtml(ev.price)}</span>
          <span class="tag">${dist}</span>
        </div>
        <div class="source">
          Source : <a href="${SOURCE_URL}" target="_blank" rel="noreferrer">Provence Verte</a>
        </div>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function geolocationToCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation indisponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve([pos.coords.latitude, pos.coords.longitude]),
      err => reject(new Error(err.message || 'Position refusée')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function inferCoordsForPlace(place) {
  if (!place) return null;
  const normalized = place.trim();
  if (knownCoords[normalized]) return knownCoords[normalized];

  for (const key of Object.keys(knownCoords)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) {
      return knownCoords[key];
    }
  }
  return null;
}

async function loadEvents() {
  try {
    setStatus('Chargement de la source…');

    const latVal = parseFloat($('lat')?.value);
    const lonVal = parseFloat($('lon')?.value);
    const position =
      Number.isFinite(latVal) && Number.isFinite(lonVal)
        ? [latVal, lonVal]
        : state.position;

    if (!position) {
      throw new Error('Position requise : saisis tes coordonnées ou clique sur “Utiliser ma position”.');
    }

    state.position = position;

    const res = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Source indisponible (${res.status})`);

    const html = await res.text();
    const allEvents = extractEventsFromHtml(html);

    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + DAYS_AHEAD);

    const filtered = allEvents
      .map(ev => {
        const coords = inferCoordsForPlace(ev.place);
        const distanceKm = coords ? distanceKm(position[0], position[1], coords[0], coords[1]) : NaN;
        return { ...ev, distanceKm };
      })
      .filter(ev => ev.start <= limit && ev.end >= now)
      .filter(ev => !Number.isFinite(ev.distanceKm) || ev.distanceKm <= GEO_LIMIT_KM)
      .sort((a, b) => {
        const da = Number.isFinite(a.distanceKm) ? a.distanceKm : 9999;
        const db = Number.isFinite(b.distanceKm) ? b.distanceKm : 9999;
        return da - db || a.start - b.start;
      });

    state.events = filtered;
    renderEvents(filtered);

    setStatus(`${filtered.length} événement(s) trouvé(s).`);
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Erreur de chargement', true);
    renderEvents([]);
  }
}

async function init() {
  const locateBtn = $('locate');
  const refreshBtn = $('refresh');

  if (locateBtn) {
    locateBtn.addEventListener('click', async () => {
      try {
        setStatus('Recherche de ta position…');
        const [lat, lon] = await geolocationToCoords();
        if ($('lat')) $('lat').value = lat.toFixed(5);
        if ($('lon')) $('lon').value = lon.toFixed(5);
        await loadEvents();
      } catch (e) {
        setStatus(e.message || 'Géolocalisation refusée', true);
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadEvents);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  await loadEvents();
}

document.addEventListener('DOMContentLoaded', init);
