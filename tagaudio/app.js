let selectedLat = null;
let selectedLng = null;
let selectedFile = null;

let map = L.map("map").setView([46.5, 2.5], 6);

const ign = L.tileLayer(
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png" +
  "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  { maxZoom: 19, attribution: "© IGN" }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { maxZoom: 19, attribution: "© OpenStreetMap" }
);

ign.addTo(map);

document.getElementById("layerSelect").onchange = (e) => {
    map.eachLayer(l => map.removeLayer(l));
    if (e.target.value === "ign") ign.addTo(map);
    else osm.addTo(map);
};

document.getElementById("fileInput").addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
});

function updateCoordDisplay() {
    const d = document.getElementById("coordsDisplay");
    if (selectedLat !== null && selectedLng !== null)
        d.textContent = "Position : " + selectedLat.toFixed(6) + ", " + selectedLng.toFixed(6);
    else d.textContent = "";
}

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

document.getElementById("readTagsBtn").onclick = async () => {
    if (!selectedFile) { alert("Choisir un MP3"); return; }
    const buffer = await selectedFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = "";
    try {
        for (let i = 0; i < bytes.length - 3; i++) {
            if (bytes[i] === 0x54 && bytes[i+1] === 0x58 && bytes[i+2] === 0x58 && bytes[i+3] === 0x58) {
                text += "[TXXX Tag trouvé]
";
            }
        }
    } catch { text = "Erreur lecture tags"; }
    document.getElementById("tagEditor").value = text;
};

document.getElementById("saveBtn").onclick = async () => {
    if (!selectedFile) { alert("Choisir un MP3"); return; }

    const arrayBuffer = await selectedFile.arrayBuffer();
    const writer = new ID3Writer(arrayBuffer);

    // Write GPS
    if (selectedLat !== null && selectedLng !== null) {
        writer.setFrame("TXXX", { description: "GPS_LAT", value: selectedLat.toString() });
        writer.setFrame("TXXX", { description: "GPS_LON", value: selectedLng.toString() });
    }

    writer.addTag();

    const taggedBlob = writer.getBlob();
    const url = URL.createObjectURL(taggedBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tagged_" + selectedFile.name;
    a.click();
};
