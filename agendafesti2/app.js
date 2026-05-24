if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW V2 Enregistré'))
            .catch(err => console.error('Erreur SW V2', err));
    });
}

// Brignoles par défaut
let currentLat = 43.4057;
let currentLon = 6.0612;

const distanceInput = document.getElementById('range-distance');
const distanceVal = document.getElementById('val-distance');
const delaiInput = document.getElementById('range-delai');
const delaiVal = document.getElementById('val-delai');

// Écouteurs pour recalculer instantanément l'affichage
distanceInput.addEventListener('input', (e) => { distanceVal.textContent = e.target.value; filtrerEtRendre(); });
delaiInput.addEventListener('input', (e) => { delaiVal.textContent = e.target.value; filtrerEtRendre(); });

// Variable globale pour stocker le flux massif une fois téléchargé
let rawEventsData = [];

// Décollage automatique
window.addEventListener('DOMContentLoaded', () => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            recupererDonneesOpenData();
        },
        () => {
            document.getElementById('status').textContent = "Position refusée. Recherche standard sur le Var (Brignoles).";
            recupererDonneesOpenData();
        }
    );
});

document.getElementById('geo-btn').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((p) => {
        currentLat = p.coords.latitude;
        currentLon = p.coords.longitude;
        recupererDonneesOpenData();
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

// --- APPEL DE L'API OPEN DATA RÉGIONALE ---
async function recupererDonneesOpenData() {
    const status = document.getElementById('status');
    status.textContent = "Téléchargement du catalogue des mairies du Var...";

    try {
        // URL du jeu de données officiel "Événements touristiques de la Région SUD"
        // Nous ciblons le Var (83) pour optimiser la vitesse de téléchargement.
        const openDataUrl = 'https://data.regionpaca.fr/api/v2/catalog/datasets/syndication-tourisme-region-paca/exports/json?where=commune_adresse%20LIKE%20%2783%25%27&limit=100';
        
        // Sécurité Proxy anti-CORS
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(openDataUrl)}`);
        
        if (response.ok) {
            const wrapper = await response.json();
            const jsonEvents = JSON.parse(wrapper.contents);
            
            // Formatage des données hétérogènes de l'API en notre modèle standardisé
            rawEventsData = jsonEvents.map(item => {
                // Gestion du prix (Gratuit si non spécifié ou si mention explicite)
                let tarif = 0;
                if (item.tarifs_infomations) {
                    const prixMatch = item.tarifs_infomations.match(/([0-9]+)\s*€/);
                    if (prixMatch) tarif = parseInt(prixMatch[1]);
                }

                // Récupération de la date de début de l'événement
                let dateEvenement = item.date_debut || new Date().toISOString();

                return {
                    title: item.nom_communaute || item.nom_produit || "Animation locale",
                    location: item.commune_adresse || "Var",
                    lat: item.latitude ? parseFloat(item.latitude) : 43.4057,
                    lon: item.longitude ? parseFloat(item.longitude) : 6.0612,
                    price: tarif,
                    date: new Date(dateEvenement).toISOString()
                };
            });

            filtrerEtRendre();
        } else {
            throw new Error("Erreur serveur Open Data");
        }
    } catch (error) {
        console.error(error);
        status.textContent = "Serveur régional saturé. Affichage des données locales de secours.";
         chargerSecoursV2();
    }
}

function filtrerEtRendre() {
    const container = document.getElementById('events-container');
    const status = document.getElementById('status');
    container.innerHTML = "";

    const maxDist = parseInt(distanceInput.value);
    const maxJours = parseInt(delaiInput.value);
    
    const maintenant = new Date();
    const horizon = new Date(maintenant.getTime() + maxJours * 24 * 60 * 60 * 1000);

    const filtres = rawEventsData.filter(e => {
        const dEvt = new Date(e.date);
        const dist = getDistance(currentLat, currentLon, e.lat, e.lon);
        return dist <= maxDist && dEvt >= maintenant && dEvt <= horizon;
    });

    if (filtres.length === 0) {
        container.innerHTML = `<p class='event-card'>Aucune festivité trouvée dans un rayon de ${maxDist} km pour les ${maxJours} prochains jours.</p>`;
        status.textContent = "Aucun résultat.";
        return;
    }

    filtres.sort((a,b) => new Date(a.date) - new Date(b.date));

    filtres.forEach(event => {
        const distStr = getDistance(currentLat, currentLon, event.lat, event.lon).toFixed(1);
        const dateStr = new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const priceText = event.price === 0 ? "Gratuit" : `${event.price} €`;
        const priceClass = event.price === 0 ? "free" : "paid";

        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.borderLeft = "5px solid #2196F3"; // Thème bleu pour la V2
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

    status.textContent = `${filtres.length} festivités chargées via l'Open Data des communes !`;
}

// Fallback augmenté si panne réseau API globale
function chargerSecoursV2() {
    rawEventsData = [
        { title: "[Secours] Marché des Producteurs", location: "Cotignac", lat: 43.5282, lon: 6.1494, price: 0, date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        { title: "[Secours] Concert de Cuivres en plein air", location: "Barjols", lat: 43.5578, lon: 6.0072, price: 10, date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
        { title: "[Secours] Vide-Grenier du Comité des fêtes", location: "Brignoles", lat: 43.4057, lon: 6.0612, price: 0, date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() }
    ];
    filtrerEtRendre();
}