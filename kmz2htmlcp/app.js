// --- DOM ---
const kmzInput = document.getElementById("kmz-input");
const dropZone = document.getElementById("drop-zone");
const statusEl = document.getElementById("status");

const btnKml = document.getElementById("btn-kml");
const btnGpx = document.getElementById("btn-gpx");
const btnJson = document.getElementById("btn-json");
const btnPdf = document.getElementById("btn-pdf");
const btnPrint = document.getElementById("btn-print");

const modal = document.getElementById("photo-modal");
const modalImg = document.getElementById("photo-modal-img");

modal.addEventListener("click", () => {
  modal.classList.remove("active");
});

// --- Leaflet ---
const map = L.map("map");
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);
map.setView([46.5, 2.5], 6);

// --- State ---
let originalKmlText = "";
let currentTrack = [];
let currentWaypoints = [];
let geojsonData = null;

// --- Utils ---
function setStatus(msg) {
  statusEl.textContent = msg;
}

function enableExports(on) {
  [btnKml, btnGpx, btnJson, btnPdf, btnPrint].forEach(b =>
    on ? b.removeAttribute("disabled") : b.setAttribute("disabled", "true")
  );
}

enableExports(false);

// --- Drag & Drop ---
["dragenter", "dragover"].forEach(evt =>
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);

["dragleave", "drop"].forEach(evt =>
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  })
);

dropZone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) handleKmz(file);
});

kmzInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleKmz(file);
});

// --- KMZ Import ---
async function handleKmz(file) {
  setStatus("Chargement du KMZ…");
  enableExports(false);

  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // Trouver doc.kml
  let kmlEntry = null;
  zip.forEach((path, entry) => {
    if (path.toLowerCase().endsWith(".kml")) {
      if (!kmlEntry || path.toLowerCase().includes("doc.kml")) {
        kmlEntry = entry;
      }
    }
  });

  if (!kmlEntry) {
    setStatus("Aucun fichier KML trouvé.");
    return;
  }

  originalKmlText = await kmlEntry.async("text");

  // Charger photos
  const photos = {};
  const photoPromises = [];

  zip.forEach((path, entry) => {
    if (/\.(jpg|jpeg|png)$/i.test(path)) {
      photoPromises.push(
        entry.async("blob").then(blob => {
          photos[path] = URL.createObjectURL(blob);
        })
      );
    }
  });

  await Promise.all(photoPromises);

  parseKml(originalKmlText, photos);
  prepareExports();

  setStatus("KMZ chargé.");
  enableExports(true);
}

// --- Parsing KML ---
function parseKml(kmlText, photos) {
  map.eachLayer(l => {
    if (l instanceof L.TileLayer) return;
    map.removeLayer(l);
  });

  const xml = new DOMParser().parseFromString(kmlText, "application/xml");
  const placemarks = [...xml.getElementsByTagName("Placemark")];

  currentTrack = [];
  currentWaypoints = [];

  placemarks.forEach(pm => {
    const name = pm.getElementsByTagName("name")[0]?.textContent || "Waypoint";
    const line = pm.getElementsByTagName("LineString")[0];
    const point = pm.getElementsByTagName("Point")[0];
    const desc = pm.getElementsByTagName("description")[0]?.textContent || "";

    if (line) {
      const coords = line.getElementsByTagName("coordinates")[0].textContent.trim();
      coords.split(/\s+/).forEach(c => {
        const [lon, lat, alt] = c.split(",").map(Number);
        currentTrack.push([lat, lon, alt]);
      });
    }

    if (point) {
      const coords = point.getElementsByTagName("coordinates")[0].textContent.trim();
      const [lon, lat, alt] = coords.split(",").map(Number);

      let photo = null;
      const m = desc.match(/src=["']([^"']+)["']/);
      if (m) {
        const p = m[1].replace(/^\.?\//, "");
        photo = photos[p] || null;
      }

      currentWaypoints.push({ name, lat, lon, alt, desc, photo });
    }
  });

  displayTrack();
  displayWaypoints();
  buildGeoJSON();
}

function displayTrack() {
  if (!currentTrack.length) return;
  const latlngs = currentTrack.map(c => [c[0], c[1]]);
  const poly = L.polyline(latlngs, { color: "#d62828", weight: 4 }).addTo(map);
  map.fitBounds(poly.getBounds(), { padding: [20, 20] });
}

function displayWaypoints() {
  currentWaypoints.forEach(wp => {
    const div = document.createElement("div");
    div.className = "wp-popup";

    div.innerHTML = `
      <h3>${wp.name}</h3>
      ${wp.photo ? `<img src="${wp.photo}" />` : ""}
      <div>${wp.desc}</div>
      <div class="meta">Lat: ${wp.lat.toFixed(6)} / Lon: ${wp.lon.toFixed(6)}</div>
      <button class="zoom-btn">Agrandir</button>
    `;

    const marker = L.marker([wp.lat, wp.lon]).addTo(map);
    marker.bindPopup(div);

    div.querySelector(".zoom-btn").onclick = () => {
      modalImg.src = wp.photo;
      modal.classList.add("active");
    };
  });
}

// --- GeoJSON ---
function buildGeoJSON() {
  const features = [];

  if (currentTrack.length) {
    features.push({
      type: "Feature",
      properties: { type: "track" },
      geometry: {
        type: "LineString",
        coordinates: currentTrack.map(c => [c[1], c[0], c[2]])
      }
    });
  }

  currentWaypoints.forEach(wp => {
    features.push({
      type: "Feature",
      properties: { name: wp.name, desc: wp.desc },
      geometry: {
        type: "Point",
        coordinates: [wp.lon, wp.lat, wp.alt]
      }
    });
  });

  geojsonData = { type: "FeatureCollection", features };
}

// --- Exports ---
function prepareExports() {
  // KML
  const blobKml = new Blob([originalKmlText], { type: "application/vnd.google-earth.kml+xml" });
  btnKml.href = URL.createObjectURL(blobKml);

  // GPX
  if (currentTrack.length) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n<trk><trkseg>\n`;
    currentTrack.forEach(c => {
      gpx += `<trkpt lat="${c[0]}" lon="${c[1]}">${c[2] ? `<ele>${c[2]}</ele>` : ""}</trkpt>\n`;
    });
    gpx += `</trkseg></trk>\n</gpx>`;
    btnGpx.href = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
  }

  // JSON
  btnJson.href = URL.createObjectURL(new Blob([JSON.stringify(geojsonData, null, 2)], { type: "application/json" }));

  // PDF = impression
  btnPdf.onclick = () => window.print();
  btnPrint.onclick = () => window.print();
}
// ------------------------------------------------------------
// MODE ÉDITION COMPLET
// ------------------------------------------------------------

// DOM
const wpList = document.getElementById("wp-list");
const btnGenerateKmz = document.getElementById("btn-generate-kmz");

// Charger EXIF
const exifScript = document.createElement("script");
exifScript.src = "https://cdn.jsdelivr.net/npm/exif-js";
document.body.appendChild(exifScript);

// Afficher la liste des waypoints dans le panneau d’édition
function refreshEditorPanel() {
  wpList.innerHTML = "";

  currentWaypoints.forEach((wp, index) => {
    const div = document.createElement("div");
    div.className = "wp-editor";

    div.innerHTML = `
      <label>Nom :</label>
      <input type="text" id="wp-name-${index}" value="${wp.name}" maxlength="50">

      <label>Commentaire :</label>
      <textarea id="wp-comment-${index}" maxlength="500">${wp.desc}</textarea>

      <label>Photo :</label>
      ${wp.photo ? `<img src="${wp.photo}" id="wp-img-${index}">` : "<em>Aucune photo</em>"}
      <input type="file" id="wp-photo-${index}" accept="image/*">

      <label>Latitude :</label>
      <input type="text" id="wp-lat-${index}" value="${wp.lat}">

      <label>Longitude :</label>
      <input type="text" id="wp-lon-${index}" value="${wp.lon}">

      <label>Altitude :</label>
      <input type="text" id="wp-alt-${index}" value="${wp.alt || ""}">

      <button id="wp-update-${index}">Mettre à jour</button>
      <button id="wp-delete-${index}" style="background:#d62828;color:white;">Supprimer</button>
    `;

    wpList.appendChild(div);

    // Mise à jour
    document.getElementById(`wp-update-${index}`).onclick = () => {
      wp.name = document.getElementById(`wp-name-${index}`).value;
      wp.desc = document.getElementById(`wp-comment-${index}`).value;
      wp.lat = parseFloat(document.getElementById(`wp-lat-${index}`).value);
      wp.lon = parseFloat(document.getElementById(`wp-lon-${index}`).value);
      wp.alt = parseFloat(document.getElementById(`wp-alt-${index}`).value);
      setStatus("Waypoint mis à jour.");
      displayTrack();
      displayWaypoints();
    };

    // Suppression
    document.getElementById(`wp-delete-${index}`).onclick = () => {
      currentWaypoints.splice(index, 1);
      refreshEditorPanel();
      displayTrack();
      displayWaypoints();
    };

    // Changement de photo
    document.getElementById(`wp-photo-${index}`).onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const compressed = await compressImage(file, 0.8);
      wp.photo = URL.createObjectURL(compressed);
      wp.photoBlob = compressed;

      refreshEditorPanel();
      displayTrack();
      displayWaypoints();
    };
  });

  btnGenerateKmz.removeAttribute("disabled");
}

// Compression photo (≈500 ko)
function compressImage(file, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1600;
      let w = img.width;
      let h = img.height;

      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w *= ratio;
        h *= ratio;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

// Génération du KMZ optimisé
btnGenerateKmz.onclick = async () => {
  setStatus("Génération du KMZ optimisé…");

  const zip = new JSZip();
  const photosFolder = zip.folder("photos");

  // Nouveau KML
  let kml = `
  <kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
  `;

  // Tracé
  if (currentTrack.length) {
    kml += `<Placemark><name>Trace</name><LineString><coordinates>`;
    currentTrack.forEach(c => {
      kml += `${c[1]},${c[0]},${c[2] || 0} `;
    });
    kml += `</coordinates></LineString></Placemark>`;
  }

  // Waypoints
  for (let i = 0; i < currentWaypoints.length; i++) {
    const wp = currentWaypoints[i];

    let photoName = null;
    if (wp.photoBlob) {
      photoName = `wp_${i}.jpg`;
      photosFolder.file(photoName, wp.photoBlob);
    }

    kml += `
    <Placemark>
      <name>${wp.name}</name>
      <description><![CDATA[
        ${wp.desc}
        ${photoName ? `<img src="photos/${photoName}">` : ""}
      ]]></description>
      <Point><coordinates>${wp.lon},${wp.lat},${wp.alt || 0}</coordinates></Point>
    </Placemark>
    `;
  }

  kml += `</Document></kml>`;
  zip.file("doc.kml", kml);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "randonnee_optimisee.kmz";
  a.click();

  setStatus("KMZ optimisé généré !");
};

// Rafraîchir panneau après import KMZ
setTimeout(() => {
  refreshEditorPanel();
}, 1000);
