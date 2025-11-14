let selectedLat = null;
let selectedLng = null;
let selectedFile = null;

document.getElementById("fileInput").addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
});

function updateCoordDisplay() {
    const d = document.getElementById("coordsDisplay");
    if (selectedLat !== null && selectedLng !== null)
        d.textContent = "Position : " + selectedLat.toFixed(6) + ", " + selectedLng.toFixed(6);
    else d.textContent = "";
}

const map = L.map("map").setView([46.5, 2.5], 6);

L.tileLayer(
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
  "&STYLE=normal" +
  "&FORMAT=image/png" +
  "&TILEMATRIXSET=PM" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  {
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    attribution: "© IGN – Plan IGN V2"
  }
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
    const lat = parseFloat(prompt("Latitude :"));
    const lng = parseFloat(prompt("Longitude :"));
    if (!isNaN(lat) && !isNaN(lng)) {
        selectedLat = lat;
        selectedLng = lng;
        if (marker) marker.remove();
        marker = L.marker([lat, lng]).addTo(map);
        map.setView([lat, lng], 15);
        updateCoordDisplay();
    }
};

document.getElementById("saveBtn").onclick = async () => {
    if (!selectedFile) { alert("Choisir un fichier MP3"); return; }
    if (selectedLat === null || selectedLng === null) { alert("Choisir une position GPS"); return; }

    const arrayBuffer = await selectedFile.arrayBuffer();
    const writer = new ID3Writer(arrayBuffer);

    writer.setFrame("TXXX", { description: "GPS_LAT", value: selectedLat.toString() });
    writer.setFrame("TXXX", { description: "GPS_LON", value: selectedLng.toString() });

    writer.addTag();

    const taggedBlob = writer.getBlob();
    const url = URL.createObjectURL(taggedBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tagged_" + selectedFile.name;
    a.click();
};
