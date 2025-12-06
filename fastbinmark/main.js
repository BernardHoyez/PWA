// URL Fastbin
const FASTBIN_URL = "https://fastbin.fr/raw/XXXXXX"; // remplacer

// Init map OSM first
const map = L.map('map').setView([46.5, 2.5], 6);

// Layers
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
osm.addTo(map);

const ign = L.tileLayer(
  'https://wxs.ign.fr/YOUR_API_KEY/geoportail/wmts?' +
  'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&' +
  'TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&' +
  'TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
);

// Layer control
L.control.layers(
  {"OSM": osm, "IGN Plan V2": ign},
  {}
).addTo(map);

// Parsing Fastbin
function parseLine(line) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) return null;

    const fb = parts[parts.length - 1];

    let coordIndex = -1;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes(",")) {
            coordIndex = i;
            break;
        }
    }
    if (coordIndex === -1) return null;

    const coord = parts[coordIndex].split(",");
    if (coord.length !== 2) return null;

    const lat = parseFloat(coord[0]);
    const lon = parseFloat(coord[1]);

    const nom = parts.slice(0, coordIndex).join(" ");

    return { nom, lat, lon, fb };
}

async function loadPoints() {
    const text = await fetch(FASTBIN_URL).then(r => r.text());
    const lines = text.split("\n").filter(l => l.trim() !== "");
    const points = lines.map(parseLine).filter(p => p);

    points.forEach(p => {
        const marker = L.marker([p.lat, p.lon]).addTo(map);
        marker.bindPopup(`<b>${p.nom}</b><br><a href="${p.fb}" target="_blank">Voir le post Facebook</a>`);
        marker.on("click", () => window.open(p.fb, "_blank"));
    });
}
loadPoints();
