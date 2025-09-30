let map;
let userMarker;
let poiLayer;

function initMap() {
  map = L.map('map').setView([48.85, 2.35], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  poiLayer = L.layerGroup().addTo(map);
}

function trackUser() {
  if (!navigator.geolocation) {
    alert("La géolocalisation n'est pas supportée");
    return;
  }

  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    if (!userMarker) {
      userMarker = L.circleMarker([lat, lon], {
        radius: 10,
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5
      }).addTo(map);
      map.setView([lat, lon], 14);
    } else {
      userMarker.setLatLng([lat, lon]);
    }
  }, err => {
    console.error(err);
  }, { enableHighAccuracy: true });
}

function addPOIs(pois, mediaMap) {
  poiLayer.clearLayers();

  // Groupement par coordonnées
  const grouped = {};
  pois.forEach(p => {
    const key = `${p.lat},${p.lon}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  Object.entries(grouped).forEach(([key, list]) => {
    const [lat, lon] = key.split(',').map(Number);
    const color = list.length > 1 ? 'red' : 'blue';

    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.8
    }).addTo(poiLayer);

    if (list.length === 1) {
      // POI simple
      marker.bindPopup(buildPopup(list[0], mediaMap));
    } else {
      // POI complexes → liste initiale
      let listContent = "<b>POI multiples :</b><br><ul>";
      list.forEach(p => {
        listContent += `<li><a href="#" class="poi-link" data-id="${p.id}">${p.title}</a></li>`;
      });
      listContent += "</ul>";

      marker.bindPopup(listContent);

      // Sauvegarde du contenu initial (liste)
      marker._listContent = listContent;

      marker.on("popupopen", () => {
        document.querySelectorAll(".poi-link").forEach(el => {
          el.addEventListener("click", e => {
            e.preventDefault();
            const poi = list.find(p => p.id === el.dataset.id);
            marker.setPopupContent(buildPopup(poi, mediaMap));
            marker.openPopup();
          });
        });
      });

      // Restauration de la liste quand la popup se ferme
      marker.on("popupclose", () => {
        marker.setPopupContent(marker._listContent);
      });
    }
  });
}

function buildPopup(poi, mediaMap) {
  let html = `<b>${poi.title}</b><br>`;
  html += `(${poi.lat.toFixed(5)}, ${poi.lon.toFixed(5)})<br>`;
  if (poi.comment) html += `<p>${poi.comment}</p>`;
  if (poi.image) {
    const path = "data/" + poi.image.name;
    if (mediaMap[path]) html += `<img src="${mediaMap[path]}"><br>`;
  }
  if (poi.audio) {
    const path = "data/" + poi.audio.name;
    if (mediaMap[path]) html += `<audio controls src="${mediaMap[path]}"></audio><br>`;
  }
  if (poi.video) {
    const path = "data/" + poi.video.name;
    if (mediaMap[path]) html += `<video controls width="250" src="${mediaMap[path]}"></video><br>`;
  }
  return html;
}
