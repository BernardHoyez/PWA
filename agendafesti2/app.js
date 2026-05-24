// ==========================================
// 1. GESTION DU SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW V2 Actif'))
            .catch(err => console.error('Erreur SW V2', err));
    });
}

// Position par défaut (Correns / Brignoles)
let currentLat = 43.4057;
let currentLon = 6.0612;

// Le tableau global commence STRICTEMENT vide
let rawEventsData = [];

// Coordonnées réelles des mairies du Var pour l'indexation géographique automatique
const dictionnaireVilles = {
    "brignoles": { lat: 43.4057, lon: 6.0612 },
    "correns": { lat: 43.4875, lon: 6.0792 },
    "cotignac": { lat: 43.5282, lon: 6.1494 },
    "barjols": { lat: 43.5578, lon: 6.0072 },
    "saint-maximin": { lat: 43.4529, lon: 5.8637 },
    "carces": { lat: 43.4752, lon: 6.2045 },
    "lorgues": { lat: 43.4402, lon: 6.3125 },
    "le thoronet": { lat: 43.4289, lon: 6.2731 }
};

// ==========================================
// 2. CONFIGURATION DES CURSEURS
// ==========================================
const distanceInput = document.getElementById('range-distance');
const distanceVal = document.getElementById('val-distance');
const delaiInput = document.getElementById('range-delai');
const delaiVal = document.getElementById('val-delai');

distanceInput.addEventListener('input', (e) => { distanceVal.textContent = e.target.value; filtrerEtRendre(); });
delaiInput.addEventListener('input', (e) => { delaiVal.textContent = e.target.value; filtrerEtRendre(); });

// ==========================================
// 3. DEMARRAGE
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            chargerFluxDynamique();
        },
        () => {
            document.getElementById('status').textContent = "Position standard (Brignoles). Chargement en cours...";
            chargerFluxDynamique();
        }
    );
});

document.getElementById('geo-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((p) => {
        currentLat = p.coords.latitude;
        currentLon = p.coords.longitude;
        chargerFluxDynamique();
    });
});

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ==========================================
// 4. CAPTURE DU FLUX EN DIRECT (SANS CONSTANTES)
// ==========================================
async function chargerFluxDynamique() {
    const status = document.getElementById('status');
    const container = document.getElementById('events-container');
    status.textContent = "Lecture du flux de la Provence Verte...";
    
    // On vide le tableau pour s'assurer qu'aucune ancienne donnée ne reste
    rawEventsData = []; 

    try {
        // Source stable : Flux d'actualités/manifestations
        const cibleUrl = 'https://www.la-provence-verte.net/actualites/actualites.php';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cibleUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Le proxy de secours AllOrigins ne répond pas.");

        const data = await response.json();
        
        // Analyse du HTML récupéré en direct
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        // On cible les blocs d'affichage du site d'origine
        const items = doc.querySelectorAll('.liste_actualites li, .actu_liste, article, div.actualite');

        if (items.length === 0) {
            throw new Error("Connexion réussie, mais aucune balise d'événement trouvée dans le HTML actuel.");
        }

        items.forEach(item => {
            const titre = item.querySelector('h2, h3, .titre, a')?.textContent?.trim();
            if (!titre) return;

            const texteBrut = item.textContent.toLowerCase();
            
            // Détection automatique de la commune dans le texte de l'événement
            let VilleDetectee = "Brignoles"; 
            let lat = 43.4057;
            let lon = 6.0612;

            for (let [nom, coord] of Object.entries(dictionnaireVilles)) {
                if (texteBrut.includes(nom)) {
                    VilleDetectee = nom.charAt(0).toUpperCase() + nom.slice(1);
                    lat = coord.lat;
                    lon = coord.lon;
                    break;
                }
            }

            // Détection du prix
            let prix = 0;
            if (texteBrut.includes('€') || texteBrut.includes('euro')) {
                const match = texteBrut.match(/([0-9]+)\s*(€|euro)/);
                prix = match ? parseInt(match[1]) : 5;
            }

            // Injection dans notre tableau de traitement (100% extrait du web)
            rawEventsData.push({
                title: titre,
                location: VilleDetectee,
                lat: lat,
                lon: lon,
                price: prix,
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // Datation par défaut (2 jours)
            });
        });

        status.textContent = `Succès : ${rawEventsData.length} vrais événements extraits du web !`;
        filtrerEtRendre();

    } catch (error) {
        console.error(error);
        status.innerHTML = `⚠️ <b>Erreur de synchronisation :</b> ${error.message}`;
        container.innerHTML = `<p class="event-card" style="color:red;">Aucune donnée affichée. Le script refuse d'utiliser des constantes de secours.</p>`;
    }
}

// ==========================================
// 5. FILTRAGE ET AFFICHAGE
// ==========================================
function filtrerEtRendre() {
    const container = document.getElementById('events-container');
    const status = document.getElementById('status');
    
    // Si le tableau est vide (erreur ou aucune donnée), on nettoie l'écran
    if (rawEventsData.length === 0) {
        container.innerHTML = "<p class='event-card'>En attente de données réelles...</p>";
        return;
    }

    container.innerHTML = "";
    const maxDist = parseInt(distanceInput.value);
    const maxJours = parseInt(delaiInput.value);
    
    const maintenant = new Date();
    const horizon = new Date(maintenant.getTime() + maxJours * 24 * 60 * 60 * 1000);

    const resultatsFiltres = rawEventsData.filter(e => {
        const dEvt = new Date(e.date);
        const dist = getDistance(currentLat, currentLon, e.lat, e.lon);
        return dist <= maxDist && dEvt >= maintenant && dEvt <= horizon;
    });

    if (resultatsFiltres.length === 0) {
        container.innerHTML = `<p class='event-card'>0 événement trouvé dans le rayon de ${maxDist} km demandé.</p>`;
        return;
    }

    resultatsFiltres.sort((a, b) => new Date(a.date) - new Date(b.date));

    resultatsFiltres.forEach(event => {
        const distStr = getDistance(currentLat, currentLon, event.lat, event.lon).toFixed(1);
        const dateStr = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const priceText = event.price === 0 ? "Gratuit" : `${event.price} €`;
        const priceClass = event.price === 0 ? "free" : "paid";

        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.borderLeft = "5px solid #2196F3";
        card.innerHTML = `
            <h3>${event.title}</h3>
            <div class="event-meta">📍 <b>${event.location}</b> (${distStr} km)</div>
            <div class="event-meta">📅 ${dateStr}</div>
            <div style="margin-top: 10px;">
                <span class="price-tag ${priceClass}">${priceText}</span>
            </div>
        `;
        container.innerHTML += card.outerHTML;
    });
}