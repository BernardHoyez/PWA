document.getElementById('zipInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const { data, media } = await loadZip(file);
  setupVisit(data, media);
});

function setupVisit(data, media) {
  initMap();

  // group POI by coordinate
  const groups = {};
  data.pois.forEach(p => {
    const key = `${p.lat},${p.lon}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  let idx = 1;
  for (const key in groups) {
    const pois = groups[key];
    const isComplex = pois.length > 1;
    pois.forEach(p => {
      addPOIMarker(p, idx, isComplex, poi => {
        if (isComplex) {
          showComplexPopup(pois);
        } else {
          showSimplePopup(poi);
        }
      });
    });
    idx++;
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
      addUserMarker(pos.coords.latitude, pos.coords.longitude);
    });
  }
}

function showSimplePopup(poi) {
  const html = `
    <h3>${poi.title}</h3>
    <p>${poi.lat}, ${poi.lon}</p>
    ${poi.comment ? `<p>${poi.comment}</p>` : ''}
    ${poi.image ? `<img src="data/${poi.image.name}" alt="">` : ''}
    ${poi.audio ? `<audio controls src="data/${poi.audio.name}"></audio>` : ''}
    ${poi.video ? `<video controls src="data/${poi.video.name}" width="100%"></video>` : ''}
  `;
  L.popup({ maxWidth: '95vw' })
    .setLatLng([poi.lat, poi.lon])
    .setContent(html)
    .openOn(map);
}

function showComplexPopup(pois) {
  const list = pois.map(p => `<li data-id="${p.id}">${p.title}</li>`).join('');
  const html = `<h3>POI multiples</h3><ul>${list}</ul>`;
  const popup = L.popup({ maxWidth: '80vw' })
    .setLatLng([pois[0].lat, pois[0].lon])
    .setContent(html)
    .openOn(map);

  const ul = document.querySelector('.leaflet-popup-content ul');
  ul.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const poi = pois.find(p => p.id === li.dataset.id);
      showSimplePopup(poi);
    });
  });
}
