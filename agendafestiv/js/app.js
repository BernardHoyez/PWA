const state = {
    position: null, events: [], filteredEvents: [], isLoading: false, error: null, lastFetch: null
};
const config = { dateRange: 15, distanceRange: 25, priceFilter: 'all' };
const SOURCES = [
    { name: 'Provence Verte', url: 'https://www.la-provence-verte.net/actualites/actualites.php', parser: parseProvenceVerte, enabled: true }
];
const elements = {
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('errorMessage'),
    eventsContainer: document.getElementById('eventsContainer'),
    noEvents: document.getElementById('noEvents'),
    locationStatus: document.getElementById('locationStatus'),
    refreshBtn: document.getElementById('refreshBtn'),
    dateRange: document.getElementById('dateRange'),
    distanceRange: document.getElementById('distanceRange'),
    priceFilter: document.getElementById('priceFilter')
};

async function init() {
    setupEventListeners();
    await loadPosition();
    await fetchEvents();
}

function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', () => fetchEvents(true));
    elements.dateRange.addEventListener('change', (e) => { config.dateRange = parseInt(e.target.value); applyFilters(); });
    elements.distanceRange.addEventListener('change', (e) => { config.distanceRange = parseInt(e.target.value); applyFilters(); });
    elements.priceFilter.addEventListener('change', (e) => { config.priceFilter = e.target.value; applyFilters(); });
    setInterval(() => !state.isLoading && fetchEvents(), 30 * 60 * 1000);
}

async function loadPosition() {
    if (!navigator.geolocation) { showError('Géolocalisation non supportée'); return; }
    try {
        elements.locationStatus.textContent = 'Localisation en cours...';
        const position = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
        );
        state.position = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
        elements.locationStatus.textContent = `📍 ${state.position.lat.toFixed(4)}, ${state.position.lng.toFixed(4)} (±${Math.round(state.position.accuracy)}m)`;
        localStorage.setItem('agendafestiv_position', JSON.stringify(state.position));
    } catch (error) {
        console.error('Géolocalisation:', error);
        const savedPosition = localStorage.getItem('agendafestiv_position');
        if (savedPosition) {
            state.position = JSON.parse(savedPosition);
            elements.locationStatus.textContent = `📍 ${state.position.lat.toFixed(4)}, ${state.position.lng.toFixed(4)} (sauvegardé)`;
        } else {
            state.position = { lat: 43.4067, lng: 5.9931, accuracy: 1000 };
            elements.locationStatus.textContent = '📍 Position par défaut (Provence Verte)';
            showError('Position par défaut utilisée.');
        }
    }
}

async function fetchEvents(force = false) {
    if (state.isLoading && !force) return;
    state.isLoading = true; showLoading(true); hideError();
    try {
        const results = await Promise.all(SOURCES.filter(s => s.enabled).map(async (source) => {
            try { return (await fetchFromSource(source)).map(e => ({...e, source: source.name})); }
            catch (error) { console.error(source.name + ':', error); return []; }
        }));
        state.events = results.flat(); state.lastFetch = new Date();
        applyFilters(); sortEvents(); renderEvents();
    } catch (error) { console.error('Fetch error:', error); showError('Impossible de charger les événements.'); }
    finally { state.isLoading = false; showLoading(false); }
}

async function fetchFromSource(source) {
    if (source.name === 'Provence Verte') return await fetchProvenceVerteEvents();
    return [];
}

async function fetchProvenceVerteEvents() {
    try {
        const response = await fetch('https://www.la-provence-verte.net/actualites/actualites.php');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return parseProvenceVerte(await response.text());
    } catch (error) {
        console.error('Provence Verte fetch:', error);
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? getMockEvents() : [];
    }
}

function parseProvenceVerte(html) {
    const events = []; const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html');
    const selectors = ['.event', '.actualite', '.article', '.item', '.post', '.card', '.event-item', 'article', '.news-item', '.entry', '.actu'];
    let eventElements = [];
    for (const sel of selectors) { eventElements = doc.querySelectorAll(sel); if (eventElements.length) break; }
    if (!eventElements.length) {
        const containers = doc.querySelectorAll('.container, .content, .main, .wrapper, #content');
        for (const c of containers) {
            const links = c.querySelectorAll('a[href*="actualite"]'); const titles = c.querySelectorAll('h2, h3, h4');
            for (let i = 0; i < Math.min(links.length, titles.length, 20); i++) {
                const t = titles[i]?.textContent?.trim(); const l = links[i]?.href;
                if (t && l) events.push({ title: t, url: l, description: extractDesc(c, i), date: extractDate(c, i), location: 'Provence Verte', price: extractPrice(c, i), coordinates: null, source: 'Provence Verte' });
            }
        }
        return events;
    }
    eventElements.forEach((el) => { try { const e = parseEventElement(el, doc); if (e) events.push(e); } catch (err) { console.error('Parse error:', err); } });
    return events;
}

function extractDesc(c, i) { const p = c.querySelectorAll('p'); return p[i]?.textContent?.trim() || ''; }
function extractDate(c, i) { 
    const d = c.querySelectorAll('.date, time, .when, .date-event'); 
    if (d[i]) return d[i].textContent?.trim() || '';
    const m = (c.textContent || '').match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/); return m ? m[1] : '';
}
function extractPrice(c, i) { 
    const p = c.querySelectorAll('.price, .tarif, .prix, .cost'); 
    if (p[i]) { const t = p[i].textContent?.trim().toLowerCase(); return t.includes('gratuit') || t.includes('free') ? 'Gratuit' : t; }
    return 'Gratuit';
}

function parseEventElement(el, doc) {
    const title = el.querySelector('h2, h3, .title, .nom, .event-title')?.textContent?.trim() || '';
    if (!title) return null;
    const url = el.querySelector('a[href]')?.href || '';
    const desc = el.querySelector('.description, .text, .content, .excerpt, p')?.textContent?.trim() || '';
    let date = ''; const dateEl = el.querySelector('.date, time, .when, .date-event, .event-date');
    if (dateEl) date = dateEl.textContent?.trim() || '';
    else { const m = desc.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/); if (m) date = m[1]; }
    let loc = ''; const locEl = el.querySelector('.location, .lieu, .where, .event-location, .place');
    if (locEl) loc = locEl.textContent?.trim() || '';
    else { const m = desc.match(/à\s+([A-Za-z\s\-]+)/i); if (m) loc = m[1].trim(); }
    let price = 'Gratuit'; const priceEl = el.querySelector('.price, .tarif, .prix, .cost, .event-price');
    if (priceEl) { const t = priceEl.textContent?.trim().toLowerCase();
        if (t.includes('gratuit') || t.includes('free') || t.includes('libre')) price = 'Gratuit';
        else if (t.includes('€') || t.includes('euro') || t.includes('payant')) price = t.replace(/\s+/g, ' ');
    } else if (desc.toLowerCase().includes('payant') || desc.match(/\d+\s?€/) || desc.match(/\d+\s?euros?/i)) {
        const m = desc.match(/(\d+\s?(€|euros?))/i); price = m ? m[1] : 'Payant';
    }
    let coords = null; const lat = el.getAttribute('data-lat') || el.querySelector('[data-lat]')?.getAttribute('data-lat');
    const lng = el.getAttribute('data-lng') || el.querySelector('[data-lng]')?.getAttribute('data-lng');
    if (lat && lng) coords = { lat: parseFloat(lat), lng: parseFloat(lng) };
    return { title, url: url || 'https://www.la-provence-verte.net', description: desc, date, normalizedDate: normalizeDate(date), location: loc || 'Provence Verte', price, coordinates: coords, source: 'Provence Verte' };
}

function normalizeDate(ds) {
    if (!ds) return null;
    const formats = [
        { r: /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/, p: (m) => new Date(`${m[3]}-${m[2]}-${m[1]}`) },
        { r: /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, p: (m) => new Date(`20${m[3]}-${m[2]}-${m[1]}`) },
        { r: /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, p: (m) => new Date(`${m[1]}-${m[2]}-${m[3]}`) },
        { r: /^(\d{1,2})\s+([a-zA-Zàâäéèêëïîôùûüÿçœ]+)\s+(\d{4})$/i, p: (m) => { 
            const mo = {janvier:0,février:1,mars:2,avril:3,mai:4,juin:5,juillet:6,août:7,septembre:8,octobre:9,novembre:10,décembre:11}; 
            return new Date(m[3], mo[m[2].toLowerCase()] || 0, parseInt(m[1])); 
        } }
    ];
    for (const f of formats) { const m = ds.match(f.r); if (m) try { return f.p(m); } catch (e) { continue; } }
    return null;
}

function applyFilters() {
    if (!state.events.length) { state.filteredEvents = []; return; }
    const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + config.dateRange);
    state.filteredEvents = state.events.filter(e => {
        if (e.normalizedDate) { const ed = new Date(e.normalizedDate); if (ed < now || ed > end) return false; }
        if (state.position && e.coordinates) { const d = calcDist(state.position.lat, state.position.lng, e.coordinates.lat, e.coordinates.lng); if (d > config.distanceRange) return false; }
        if (config.priceFilter === 'free' && !isFree(e.price)) return false;
        if (config.priceFilter === 'paid' && isFree(e.price)) return false;
        return true;
    });
}

function isFree(p) { return p.toLowerCase().includes('gratuit') || p.toLowerCase().includes('free') || p.toLowerCase().includes('libre'); }

function sortEvents() {
    state.filteredEvents.sort((a, b) => {
        if (a.normalizedDate && b.normalizedDate) return a.normalizedDate - b.normalizedDate;
        if (a.normalizedDate) return -1; if (b.normalizedDate) return 1;
        if (state.position && a.coordinates && b.coordinates) {
            const da = calcDist(state.position.lat, state.position.lng, a.coordinates.lat, a.coordinates.lng);
            const db = calcDist(state.position.lat, state.position.lng, b.coordinates.lat, b.coordinates.lng);
            return da - db;
        }
        return 0;
    });
}

function calcDist(lat1, lon1, lat2, lon2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function renderEvents() {
    if (!state.filteredEvents.length) { elements.eventsContainer.innerHTML = ''; elements.noEvents.style.display = 'block'; return; }
    elements.noEvents.style.display = 'none';
    let html = '';
    state.filteredEvents.forEach((e, i) => {
        let dist = null;
        if (state.position && e.coordinates) dist = calcDist(state.position.lat, state.position.lng, e.coordinates.lat, e.coordinates.lng);
        let badge = '';
        if (e.normalizedDate) {
            const ed = new Date(e.normalizedDate), now = new Date(), diff = Math.ceil((ed - now)/(1000*60*60*24));
            if (diff === 0) badge = '<span class="badge today">Aujourd\'hui</span>';
            else if (diff === 1) badge = '<span class="badge today">Demain</span>';
            else if (diff <= 3) badge = '<span class="badge soon">Bientôt</span>';
        }
        const fd = e.date || (e.normalizedDate ? e.normalizedDate.toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'short',year:'numeric'}) : 'Date inconnue');
        const free = isFree(e.price), pc = free ? 'free' : 'paid', pt = free ? 'Gratuit' : e.price;
        const dt = dist !== null ? `${dist.toFixed(1)} km` : 'Distance inconnue';
        html += `<div class="event-card" data-index="${i}"><div class="event-header"><h3 class="event-title">${badge} ${esc(e.title)}</h3><div class="event-date"><span class="icon">📅</span> ${fd}</div></div><div class="event-body"><div class="event-location"><span class="icon">📍</span> ${esc(e.location)}</div>${e.description ? `<p class="event-description">${esc(e.description.substring(0,200))}${e.description.length>200?'...':''}</p>`:''}<div class="event-meta"><div class="event-distance"><span class="icon">📏</span> ${dt}</div><div class="event-price ${pc}">${pt}</div></div></div>${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" class="event-source">Voir sur ${esc(e.source)} →</a>`:''}</div>`;
    });
    elements.eventsContainer.innerHTML = html;
}

function esc(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showLoading(s) { elements.loading.style.display = s ? 'flex' : 'none'; }
function showError(m) { elements.errorMessage.textContent = m; elements.errorMessage.style.display = 'block'; }
function hideError() { elements.errorMessage.style.display = 'none'; }

function getMockEvents() {
    const now = new Date(), locs = [
        {n:'Brignoles',lat:43.4067,lng:5.9931},{n:'Rougiers',lat:43.4500,lng:6.0333},{n:'La Celle',lat:43.4167,lng:6.0000},
        {n:'Tourves',lat:43.3833,lng:5.9500},{n:'Saint-Maximin',lat:43.4500,lng:5.8667},{n:'Barjols',lat:43.5667,lng:6.0167},
        {n:'Cotignac',lat:43.5667,lng:6.1333}
    ];
    return Array.from({length:15}, (_,i) => {
        const d = new Date(now); d.setDate(d.getDate() + Math.floor(Math.random()*15));
        const l = locs[i%locs.length];
        return {
            title:`Fête ${['des Vendanges','de la Musique','Médiévale','des Arts','Gastronomique','du Village','de la Saint-Jean'][i%7]} ${i+1}`,
            url:`https://www.la-provence-verte.net/actualite-${i+1}`,
            description:`Découvrez la ${i+1}ème édition de cette fête traditionnelle avec animations, concerts et dégustations. Ouvert à tous !`,
            date:d.toLocaleDateString('fr-FR'),
            normalizedDate:d,
            location:l.n,
            price:Math.random()>0.5?'Gratuit':`${Math.floor(Math.random()*20)+5}€`,
            coordinates:l,
            source:'Provence Verte'
        };
    });
}

document.addEventListener('DOMContentLoaded', init);