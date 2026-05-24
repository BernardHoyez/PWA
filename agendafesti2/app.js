// ==========================================
// 1. GESTION DU SERVICE WORKER (BRISE-CACHE)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW V2 Connecté'))
            .catch(err => console.error('Erreur SW V2', err));
    });
}

// Coordonnées de centrage par défaut (Brignoles)
let currentLat = 43.4057;
let currentLon = 6.0612;

// Stockage global des données brutes de l'API
let rawEventsData = [];

// ==========================================
// 2. INTERACTION AVEC LES CURSEURS DYNAMIQUES
// ==========================================
const distanceInput = document.getElementById('range-distance');
const distanceVal = document.getElementById('val-distance');
const delaiInput = document.getElementById('range-delai');
const delaiVal = document.getElementById('val-delai');

distanceInput.addEventListener('input', (e) => { 
    distanceVal.textContent = e.target.value; 
    filtrerEtRendre(); 
});

delaiInput.addEventListener('input', (e) => { 
    delaiVal.textContent = e.target.value; 
    filtrerEtRendre(); 
});

// ==========================================
// 3. CYCLE DE DÉMARRAGE ET GÉOLOCALISATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    if (!navigator.geolocation) {
        document.getElementById('status').textContent = "GPS indisponible. Mode standard actif.";
        recupererDonneesDATAtourisme();
    } else {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                recupererDonneesDATAtourisme();
            },
            () => {
                document.getElementById('status').textContent = "Position refusée. Recherche centrée sur le Var.";
                recupererDonneesDATAtourisme();
            }
        );
    }
});

document.getElementById('geo-btn').addEventListener('click', () => {
    document.getElementById('status').textContent = "Ajustement GPS en cours...";
    navigator.geolocation.getCurrentPosition(
        (p) => {
            currentLat = p.coords.latitude;
            currentLon = p.coords.longitude;
            recupererDonneesDATAtourisme();
        },
        () => {
            filtrerEtRendre();
        }
    );
});

// Formule de Haversine pour le calcul de distance géodésique
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ==========================================
// 4. MOTEUR D'APPEL OPEN DATA SANS FILTRE
// ==========================================
async function recupererDonneesDATAtourisme() {
    const status = document.getElementById('status');
    const container = document.getElementById('events-container');
    status.textContent = "Interrogation de la base nationale DATAtourisme...";

    try {
        // Flux national officiel (Manifestations et événements du Var 83)
        const fluxNationalUrl = 'https://data.gouv.fr/fr/datasets/r/5950ef31-50da-4a7b-bc83-48b04a8b8321'; 
        
        // Tunnel via le proxy AllOrigins pour contourner le CORS du navigateur
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(fluxNationalUrl)}`);
        
        if (!response.ok) {
            throw new Error("Le proxy AllOrigins est saturé ou rejette la requête.");
        }

        const wrapper = await response.json();
        const jsonEvents = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
        
        if (!jsonEvents || !jsonEvents.features) {
            throw new Error("La structure du fichier JSON a été modifiée à la source (data.gouv.fr).");
        }

        // Extraction et normalisation des propriétés de l'API
        rawEventsData = jsonEvents.features.map(item => {
            const props = item.properties || {};
            
            // Tentative d'extraction de tarif numérique
            let tarifCalcule = 0;
            if (props.tarif_minimum) {
                tarifCalcule = parseInt(props.tarif_minimum);
            } else if (props.tarifs_informations) {
                const match = props.tarifs_informations.match(/([0-9]+)\s*€/);
                if (match) tarifCalcule = parseInt(match[1]);
            }

            return {
                title: props.nom || props.label || "Festivité locale",
                location: props.commune || "Commune du Var",
                lat: item.geometry?.coordinates ? item.geometry.coordinates[1] : 43.4057,
                lon: item.geometry?.coordinates ? item.geometry.coordinates[0] : 6.0612,
                price: tarifCalcule,
                date: props.date_debut || new Date().toISOString()
            };
        });
        
        status.textContent = "Données Open Data synchronisées en temps réel !";
        filtrerEtRendre();

    } catch (error) {
        console.error("Détail technique du blocage :", error);
        
        // Affichage explicite de l'erreur pour comprendre le problème de flux
        status.innerHTML = `⚠️ <b>Échec Open Data :</b> ${error.message}`;
        container.innerHTML = `
            <div class="event-card" style="border-left: 5px solid #ff5252;">
                <h3>Une erreur est survenue lors de la synchronisation</h3>
                <p>L'API ouverte n'a pas pu injecter les données directes. Raison : <i>${error.message}</i></p>
                <p><small>Conseil : Ouvrez les outils de développement (F12) sur votre navigateur pour inspecter l'onglet Console.</small></p>
            </div>
        `;
        rawEventsData = []; 
    }
}

// ==========================================
// 5. TRI, FILTRAGE ET RENDU GRAPHIQUE
// ==========================================
function filtrerEtRendre() {
    // Si une erreur a vidé le tableau au démarrage, on arrête le rendu
    if (rawEventsData.length === 0) return;

    const container = document.getElementById('events-container');
    const status = document.getElementById('status');
    container.innerHTML = "";

    const maxDist = parseInt(distanceInput.value);
    const maxJours = parseInt(delaiInput.value);
    
    const maintenant = new Date();
    const horizonTemporel = new Date(maintenant.getTime() + maxJours * 24 * 60 * 60 * 1000);

    // Filtrage géographique et temporel combiné
    const resultatsFiltres = rawEventsData.filter(e => {
        const dEvt = new Date(e.date);
        const dist = getDistance(currentLat, currentLon, e.lat, e.lon);
        return dist <= maxDist && dEvt >= maintenant && dEvt <= horizonTemporel;
    });

    if (resultatsFiltres.length === 0) {
        container.innerHTML = `<p class='event-card' style='text-align:center;'>Aucune festivité recensée à moins de ${maxDist} km dans les ${maxJours} jours à venir.</p>`;
        status.textContent = "Aucun résultat trouvé dans ce périmètre.";
        return;
    }

    // Tri par ordre chronologique
    resultatsFiltres.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Injection des cartes d'événements
    resultatsFiltres.forEach(event => {
        const distStr = getDistance(currentLat, currentLon, event.lat, event.lon).toFixed(1);
        const dateStr = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const priceText = event.price === 0 ? "Gratuit" : `${event.price} €`;
        const priceClass = event.price === 0 ? "free" : "paid";

        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.borderLeft = "5px solid #2196F3"; // Thème Bleu pour différencier de la V1
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

    status.textContent = `${resultatsFiltres.length} événement(s) officiel(s) trouvé(s) !`;
}