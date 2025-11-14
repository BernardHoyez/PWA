let selectedLat = null;
let selectedLng = null;
let selectedFile = null;

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
});

function updateCoordDisplay() {
    const d = document.getElementById("coordsDisplay");
    if (selectedLat && selectedLng)
        d.textContent = "Position : " + selectedLat.toFixed(6) + ", " + selectedLng.toFixed(6);
    else d.textContent = "";
}

// Leaflet
const map = L.map("map").setView([46.5, 2.5], 6);

L.tileLayer(
  "https://wxs.ign.fr/essentiels/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  { maxZoom: 19, attribution: "© IGN", tileSize: 256 }
).addTo(map);

let marker = null;

map.on("click", (e) => {
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;
    if (marker) marker.remove();
    marker = L.marker([selectedLat, selectedLng]).addTo(map);
    updateCoordDisplay();
});

document.getElementById("gpsBtn").onclick = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
        selectedLat = pos.coords.latitude;
        selectedLng = pos.coords.longitude;
        if (marker) marker.remove();
        marker = L.marker([selectedLat, selectedLng]).addTo(map);
        map.setView([selectedLat, selectedLng], 15);
        updateCoordDisplay();
    });
};

document.getElementById("manualBtn").onclick = () => {
    const lat = parseFloat(prompt("Latitude en degrés décimaux :"));
    const lng = parseFloat(prompt("Longitude en degrés décimaux :"));
    if (!isNaN(lat) && !isNaN(lng)) {
        selectedLat = lat;
        selectedLng = lng;
        if (marker) marker.remove();
        marker = L.marker([lat, lng]).addTo(map);
        map.setView([lat, lng], 15);
        updateCoordDisplay();
    }
};

// Save MP3 with ID3 tags
document.getElementById("saveBtn").onclick = async () => {
    if (!selectedFile) { alert("Choisir un fichier MP3"); return; }
    if (selectedLat === null || selectedLng === null) { alert("Choisir une position GPS"); return; }

    const arrayBuffer = await selectedFile.arrayBuffer();
    const writer = new ID3Writer(arrayBuffer);

    writer.setFrame("TXXX", {
        description: "GPS_LAT",
        value: selectedLat.toString()
    });
    writer.setFrame("TXXX", {
        description: "GPS_LON",
        value: selectedLng.toString()
    });
    writer.addTag();

    const taggedBlob = writer.getBlob();
    const url = URL.createObjectURL(taggedBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tagged_" + selectedFile.name;
    a.click();
};
