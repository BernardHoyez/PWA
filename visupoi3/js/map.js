// js/map.js - visupoi3

let map;
let userMarker = null;

function initMap(visitData, mediaMap) {
  console.log("initMap appelé avec :", visitData);

  // Initialisation de la carte
  map = L.map("map").setView([48.85, 2.35], 13); // défaut : Paris
  console.log("Carte initialisée");

  // Tuiles OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // Création des marqueurs POI
  const grouped = groupPOIs(visitData.pois);
  Object.keys(grouped).forEach((coord, idx) => {
    const pois = grouped[coord];
    const lat = pois[0].lat;
    const lon = pois[0].lon;

    const isComplex = pois.length > 1;
    const color = isComplex ? "red" : "blue";

    const marker = L.circleMarker([lat, lon], {
      color,
      radius: 8,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup("", { maxWidth: "95%" });

    marker.on("click", () => {
      if (isComplex) {
        // Liste des POI de la même coordonnée
        let html = `<b>POI multiples (${pois.length})</b><br><ul>`;
        pois.forEach(p => {
          html += `<li><a href="#" class="poi-link" data-id="${p.id}">${p.title}</a></li>`;
        });
        html += "</ul>";

        marker.setPopupContent(html);
        marker.openPopup();

        // Gestion du clic sur les liens de la liste
        setTimeout(() => {
          document.querySelectorAll(".poi-link").forEach(link => {
            link.addEventListener("click", e => {
              e.preventDefault();
              const poiId = e.target.dataset.id;
              const poi = pois.find(p => p.id === poiId);
              if (poi) {
                marker.setPopupContent(buildPopup(poi, mediaMap));
                marker.openPopup();
              }
            });
          });
        }, 100);
      } else {
        marker.setPopupContent(buildPopup(pois[0], mediaMap));
        marker.openPopup();
      }
    });
  });

  // Centrer la carte sur les POI
  if (visitData.pois.length > 0) {
    const bounds = L.latLngBounds(
      visitData.pois.map(p => [p.lat, p.lon])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  // Position GPS du smartphone
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      if (userMarker) {
        userMarker.setLatLng([lat, lon]);
      } else {
        userMarker = L.circleMarker([lat, lon], {
          color: "red",
          radius: 12,
          fillOpacity: 0.9
        }).addTo(map);
      }
    }, err => {
      console.warn("Géolocalisation refusée ou indisponible :", err);
    });
  } else {
    console.warn("La géolocalisation n'est pas supportée par ce navigateur");
  }
}

// Groupe les POI par coordonnées
function groupPOIs(pois) {
  const grouped = {};
  pois.forEach(poi => {
    const key = `${poi.lat},${poi.lon}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(poi);
  });
  return grouped;
}

// Construit le contenu HTML d'une popup pour un POI simple
function buildPopup(poi, mediaMap) {
  let html = `<b>${poi.title}</b><br>`;
  html += `Lat: ${poi.lat.toFixed(6)}, Lon: ${poi.lon.toFixed(6)}<br>`;
  if (poi.comment) html += `<p>${poi.comment}</p>`;

  if (poi.image) {
    const path = "data/" + poi.image.name;
    if (mediaMap[path]) {
      html += `<img src="${mediaMap[path]}" 
                   class="popup-image" 
                   data-full="${mediaMap[path]}" 
                   style="max-width:100%;height:auto;cursor:pointer;"><br>`;
    }
  }
  if (poi.audio) {
    const path = "data/" + poi.audio.name;
    if (mediaMap[path]) {
      html += `<audio controls src="${mediaMap[path]}"></audio><br>`;
    }
  }
  if (poi.video) {
    const path = "data/" + poi.video.name;
    if (mediaMap[path]) {
      html += `<video controls style="max-width:100%" src="${mediaMap[path]}"></video><br>`;
    }
  }

  return html;
}
