let map;
let userMarker;
let pois = [];

function initMap() {
  map = L.map('map').setView([48.8566, 2.3522], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Localisation utilisateur en temps réel
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!userMarker) {
          userMarker = L.circleMarker([lat, lon], {
            radius: 10,
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.6,
            className: 'user-location-marker'
          }).addTo(map);
          map.setView([lat, lon], 15);
        } else {
          userMarker.setLatLng([lat, lon]);
        }
      },
      (err) => console.warn("Erreur GPS :", err),
      { enableHighAccuracy: true }
    );
  }
}

// Ajout des POI sur la carte
function addPOIs(poisData) {
  pois = poisData;

  // Grouper les POI par coordonnées (pour détecter les complexes)
  const grouped = {};
  pois.forEach(p => {
    const key = `${p.lat},${p.lon}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    const lat = group[0].lat;
    const lon = group[0].lon;

    const isComplex = group.length > 1;
    const color = isComplex ? 'red' : 'blue';

    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'poi-marker',
        html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;"></div>`,
        iconSize: [20, 20]
      })
    }).addTo(map);

    if (isComplex) {
      marker.on('click', () => {
        let html = `<b>POI multiples (${group.length})</b><br><ul>`;
        group.forEach(p => {
          html += `<li><a href="#" class="poi-link" data-id="${p.id}">${p.title}</a></li>`;
        });
        html += `</ul>`;
        marker.bindPopup(html, { maxWidth: "95%" }).openPopup();
      });
    } else {
      marker.on('click', () => {
        const poi = group[0];
        marker.bindPopup(getPOIPopupContent(poi), { maxWidth: "95%" }).openPopup();
      });
    }
  });

  // Gérer clics dans popups complexes
  map.on('popupopen', (e) => {
    const popup = e.popup;
    const links = popup.getElement().querySelectorAll('.poi-link');
    links.forEach(link => {
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        const poiId = ev.target.dataset.id;
        const poi = pois.find(p => p.id === poiId);
        if (poi) {
          popup.setContent(getPOIPopupContent(poi));
        }
      });
    });

    // Réattacher la logique lightbox aux images dans les popups
    const imgs = popup.getElement().querySelectorAll('img.popup-image');
    imgs.forEach(img => {
      img.addEventListener('click', () => {
        const lightbox = document.getElementById('lightbox');
        const lbImg = lightbox.querySelector('img');
        lbImg.src = img.src;
        lightbox.classList.add('show');

        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoom.disable();
      });
    });
  });
}

// Génère le contenu HTML d’un POI simple
function getPOIPopupContent(poi) {
  let html = `<div class="popup-content">`;
  html += `<h3>${poi.title}</h3>`;
  html += `<p><b>Lat:</b> ${poi.lat.toFixed(6)}, <b>Lon:</b> ${poi.lon.toFixed(6)}</p>`;
  if (poi.comment) html += `<p>${poi.comment}</p>`;
  if (poi.image) html += `<img src="data/${poi.image.name}" class="popup-image" style="max-width:100%;height:auto;cursor:zoom-in;" />`;
  if (poi.audio) html += `<audio controls src="data/${poi.audio.name}" style="width:100%"></audio>`;
  if (poi.video) html += `<video controls src="data/${poi.video.name}" style="width:100%;max-height:300px"></video>`;
  html += `</div>`;
  return html;
}
