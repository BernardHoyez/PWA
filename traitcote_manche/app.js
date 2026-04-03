let map = L.map('map').setView([49.5, 0], 6);

L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', {
    attribution: "IGN"
}).addTo(map);

let points = [];
let markers = [];
let coastline = null;

fetch("data/trait_cote.geojson")
  .then(res => res.json())
  .then(data => {
    coastline = data;
    L.geoJSON(coastline).addTo(map);
  });

map.on("click", function(e) {
    if (points.length >= 2) return;

    points.push([e.latlng.lng, e.latlng.lat]);
    let marker = L.marker(e.latlng).addTo(map);
    markers.push(marker);
});

function exportSegment() {
    if (points.length < 2) {
        alert("Sélectionner 2 points");
        return;
    }

    let coords = coastline.features[0].geometry.coordinates;

    let i1 = findClosestIndex(points[0], coords);
    let i2 = findClosestIndex(points[1], coords);

    let segment = (i1 < i2) ? coords.slice(i1, i2) : coords.slice(i2, i1);

    let result = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: segment
        }
    };

    downloadJSON(result);
}

function findClosestIndex(pt, coords) {
    let minDist = Infinity;
    let index = 0;

    coords.forEach((c, i) => {
        let d = Math.hypot(pt[0]-c[0], pt[1]-c[1]);
        if (d < minDist) {
            minDist = d;
            index = i;
        }
    });

    return index;
}

function downloadJSON(data) {
    let blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "trait_cote.json";
    a.click();
}
