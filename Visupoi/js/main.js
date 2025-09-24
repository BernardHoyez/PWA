import JSZip from "https://unpkg.com/jszip/dist/jszip.min.js";

document.getElementById("zipInput").addEventListener("change", async (evt) => {
  const file = evt.target.files[0];
  const zip = await JSZip.loadAsync(file);
  const visitJson = await zip.file("visit.json").async("string");
  const visitData = JSON.parse(visitJson);

  const map = L.map("map").setView([50, 1.3], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Calculate bounds:
  const bounds = [];
  for (const poi of visitData.pois) {
    // Parse location "50.04525N, 1.32983E"
    const [latStr, lngStr] = poi.location.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    bounds.push([lat, lng]);
  }
  map.fitBounds(bounds);

  // Marker logic:
  for (const poi of visitData.pois) {
    let color = "blue";
    if (poi.video) color = "red";
    if (poi.image && poi.audio) color = "purple";

    const icon = L.divIcon({className: `custom-marker ${color}`});
    const marker = L.marker([parseFloat(poi.location), parseFloat(poi.location.split(",")[1])], { icon });

    let popupHtml = `<strong>${poi.title}</strong><br>Coordonnées : ${poi.location}<br>`;
    if (poi.comment) popupHtml += `<em>${poi.comment}</em><br>`;
    // Dynamically load media
    const poiPath = `data/${poi.id}/`;
    if (poi.image) {
      const imageFile = zip.file(`${poiPath}image.jpg`) || zip.file(`${poiPath}image.png`);
      if (imageFile) {
        const imgUrl = URL.createObjectURL(await imageFile.async("blob"));
        popupHtml += `<img src="${imgUrl}" height="150"><br>`;
      }
    }
    if (poi.audio) {
      const audioFile = zip.file(`${poiPath}audio.mp3`);
      if (audioFile) {
        const audioUrl = URL.createObjectURL(await audioFile.async("blob"));
        popupHtml += `<audio controls src="${audioUrl}"></audio><br>`;
      }
    }
    if (poi.video) {
      const videoFile = zip.file(`${poiPath}video.mp4`);
      if (videoFile) {
        const videoUrl = URL.createObjectURL(await videoFile.async("blob"));
        popupHtml += `<video controls height="200" src="${videoUrl}"></video><br>`;
      }
    }

    marker.bindPopup(popupHtml).addTo(map);
  }
});
