let map;
let userLat;
let userLon;

const eventsDiv = document.getElementById('events');

navigator.geolocation.getCurrentPosition(
  initApp,
  err => {
    alert('Géolocalisation refusée.');
    console.error(err);
  }
);

document.getElementById('reloadBtn')
  .addEventListener('click', () => {
    loadEvents(userLat, userLon);
  });

async function initApp(position) {

  userLat = position.coords.latitude;
  userLon = position.coords.longitude;

  map = L.map('map').setView([userLat, userLon], 11);

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '&copy; OpenStreetMap contributors'
    }
  ).addTo(map);

  L.marker([userLat, userLon])
    .addTo(map)
    .bindPopup('Vous êtes ici');

  loadEvents(userLat, userLon);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
  }
}

async function loadEvents(lat, lon) {

  eventsDiv.innerHTML = '<p>Chargement...</p>';

  const radius = document.getElementById('radius').value;
  const days = document.getElementById('days').value;

  // Démonstration locale
  // Remplacer ensuite par OpenAgenda ou DataTourisme

  const sampleEvents = [
    {
      title: 'Festival Jazz',
      city: 'Marseille',
      date: '2026-05-28',
      price: '12',
      image: 'https://picsum.photos/600/300?1',
      lat: lat + 0.02,
      lon: lon + 0.01,
      desc: 'Concert de jazz en plein air.'
    },
    {
      title: 'Marché Provençal',
      city: 'Aubagne',
      date: '2026-05-30',
      price: 'gratuit',
      image: 'https://picsum.photos/600/300?2',
      lat: lat + 0.08,
      lon: lon - 0.03,
      desc: 'Artisans et producteurs locaux.'
    }
  ];

  displayEvents(sampleEvents, lat, lon);
}

function displayEvents(events, lat, lon) {

  eventsDiv.innerHTML = '';

  events.forEach(ev => {

    const distance = computeDistance(
      lat,
      lon,
      ev.lat,
      ev.lon
    );

    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <img src="${ev.image}">

      <div class="card-content">

        <h3>${ev.title}</h3>

        <p>${ev.date}</p>

        <p>${ev.city}</p>

        <p class="distance">${distance.toFixed(1)} km</p>

        <p class="price">${normalizePrice(ev.price)}</p>

        <p>${ev.desc}</p>

        <p>
          <a target="_blank"
             href="https://www.google.com/maps?q=${ev.lat},${ev.lon}">
             Itinéraire
          </a>
        </p>

      </div>
    `;

    eventsDiv.appendChild(card);

    L.marker([ev.lat, ev.lon])
      .addTo(map)
      .bindPopup(ev.title);
  });
}

function normalizePrice(price) {

  if (!price) {
    return 'Tarif non renseigné';
  }

  const p = String(price).toLowerCase();

  if (
    p.includes('gratuit') ||
    p === '0' ||
    p === 'free'
  ) {
    return 'Gratuit';
  }

  return `${price} €`;
}

function computeDistance(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return R * c;
}

function deg2rad(d) {
  return d * (Math.PI / 180);
}
