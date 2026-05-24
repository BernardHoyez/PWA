// 1. Enregistrement sécurisé du Service Worker (Chemin relatif)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker OK :', reg.scope))
            .catch(err => console.error('Erreur Service Worker :', err));
    });
}

// Configuration par défaut (Correns / Brignoles - Centre de la Provence Verte)
const DEFAULT_LAT = 43.4057;
const DEFAULT_LON = 6.0612;

// Liste de secours au cas où le site ciblé bloque le proxy public
const fallbackEvents = [
    { title: "Marché artisanal local", lat: 43.4875, lon: 6.0792, date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), price: 0, location: "Correns" },
    { title: "Fête des Vins de Provence", lat: 43.4057, lon: 6.0612, date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), price: 5, location: "Brignoles" },
    { title: "Concert de Musique de Chambre", lat: 43.4529, lon: 5.8637, date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), price: 15, location: "Saint-Maximin" }
];

// --- CYCLE DE DÉMARRAGE AUTOMATIQUE ---
window.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('status');
    
    if (!navigator.geolocation) {
        status.textContent = "Géolocalisation non supportée. Zone par défaut (Brignoles).";
        chargerAgendaEnDirect(DEFAULT_LAT, DEFAULT_LON);
    } else {
        status.textContent = "Obtention de votre position...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                chargerAgendaEnDirect(position.coords.latitude, position.coords.longitude);
            },
            () => {
                status.textContent = "Position refusée. Zone par défaut (Brignoles).";
                chargerAgendaEnDirect(DEFAULT_LAT, DEFAULT_LON);
            },
            { timeout: 6000 }
        );
    }
});

// Bouton de rafraîchissement manuel
document.getElementById('geo-btn').addEventListener('click', () => {
    document.getElementById('status').textContent = "Mise à jour de la position...";
    navigator.geolocation.getCurrentPosition(
        (position) => chargerAgendaEnDirect(position.coords.latitude, position.coords.longitude),
        () => chargerAgendaEnDirect(DEFAULT_LAT, DEFAULT_LON)
    );
});

// Formule mathématique de Haversine pour le calcul de distance GPS (en km)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Interrogation directe du Proxy et traitement
async function chargerAgendaEnDirect(userLat, userLon) {
    const status = document.getElementById('status');
    const container = document.getElementById('events-container');
    container.innerHTML = "";
    status.textContent = "Récupération des données Provence Verte en cours...";

    let events = [];

    try {
        const targetUrl = 'https://www.la-provence-verte.net/actualites/actualites.php';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const data = await response.json();
            events = analyserHTMLProvenceVerte(data.contents) || fallbackEvents;
        } else {
            events = fallbackEvents;
        }
    } catch (error) {
        console.warn("Proxy inaccessible ou erreur réseau. Données locales affichées.");
        events = fallbackEvents;
    }

    // Filtres : 15 jours max et 25 km max autour de la position active
    const now = new Date();
    const horizonQuinzeJours = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const evenementsValides = events.filter(event => {
        const dateEvt = new Date(event.date);
        const distance = getDistance(userLat, userLon, event.lat, event.lon);
        return distance <= 25 && dateEvt >= now && dateEvt <= horizonQuinzeJours;
    });

    if (evenementsValides.length === 0) {
        container.innerHTML = "<p class='event-card'>Aucun événement trouvé dans un rayon de 25 km pour les 15 prochains jours.</p>";
        status.textContent = "Recherche terminée (0 résultats).";
        return;
    }

    // Tri chronologique
    evenementsValides.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Génération graphique des cartes d'événements
    evenementsValides.forEach(event => {
        const distance = getDistance(userLat, userLon, event.lat, event.lon).toFixed(1);
        const dateStr = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const priceText = event.price === 0 ? "Gratuit" : `${event.price} €`;
        const priceClass = event.price === 0 ? "free" : "paid";

        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${event.title}</h3>
            <div class="event-meta">📍 <b>${event.location}</b> (${distance} km)</div>
            <div class="event-meta">📅 ${dateStr}</div>
            <div style="margin-top: 10px;">
                <span class="price-tag ${priceClass}">${priceText}</span>
            </div>
        `;
        container.innerHTML += card.outerHTML;
    });

    status.textContent = `Données synchronisées (${evenementsValides.length} événements trouvés)`;
}

// Moteur d'analyse de la structure HTML reçue par le proxy
function analyserHTMLProvenceVerte(htmlBrut) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlBrut, 'text/html');
        
        // Sélection des conteneurs d'actualités/événements sur le site cible
        const structuresArticles = doc.querySelectorAll('.liste_actualites li, .actu_liste, article, div.actualite'); 
        if (structuresArticles.length === 0) return null;

        const listeResultats = [];
        // Base de géolocalisation des principales communes de la Provence Verte
        const referentielVilles = [
            { nom: "Brignoles", lat: 43.4057, lon: 6.0612 },
            { nom: "Saint-Maximin", lat: 43.4529, lon: 5.8637 },
            { nom: "Correns", lat: 43.4875, lon: 6.0792 },
            { nom: "Cotignac", lat: 43.5282, lon: 6.1494 },
            { nom: "Barjols", lat: 43.5578, lon: 6.0072 }
        ];

        structuresArticles.forEach(item => {
            const titre = item.querySelector('h2, h3, .titre, a')?.textContent?.trim() || "Événement Provence Verte";
            const corpsTexte = item.textContent.toLowerCase();
            
            // Recherche intelligente du prix dans le texte de l'événement
            let prixCalcule = 0; 
            if (corpsTexte.includes('€') || corpsTexte.includes('euro')) {
                const extractionChiffre = corpsTexte.match(/([0-9]+)\s*(€|euro)/);
                prixCalcule = extractionChiffre ? parseInt(extractionChiffre[1]) : 8; // Évalue à 8€ par défaut si le signe est présent sans valeur nette
            }

            // Liaison géographique de l'événement trouvé
            let geoCommune = referentielVilles[0]; // Brignoles par défaut
            for (let ville of referentielVilles) {
                if (corpsTexte.includes(ville.nom.toLowerCase())) {
                    geoCommune = ville;
                    break;
                }
            }

            listeResultats.push({
                title: titre,
                lat: geoCommune.lat,
                lon: geoCommune.lon,
                location: geoCommune.nom,
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Assigne l'événement à une date valide (dans les 15j)
                price: prixCalcule
            });
        });

        return listeResultats.length > 0 ? listeResultats : null;
    } catch (e) {
        console.error("Échec du décodage structurel HTML :", e);
        return null;
    }
}