
let map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [6.0, 44.0],
  zoom: 12
});

let center = null;
let track = [];
let tracking = false;

// ---- CLICK FOR CENTER ----
map.on('click', e => {
  center = e.lngLat;
  alert('Centre défini: ' + center.lng.toFixed(5) + ', ' + center.lat.toFixed(5));
});

// ---- SLIDER ----
document.getElementById('radius').oninput = e=>{
  document.getElementById('rval').textContent = e.target.value;
};

// ---- BBOX ----
function computeBBox(center, km){
  const R = 6371;
  let d = km / R;
  let lat = center.lat * Math.PI/180;
  let lon = center.lng * Math.PI/180;

  let latMin = lat - d;
  let latMax = lat + d;
  let lonMin = lon - d/Math.cos(lat);
  let lonMax = lon + d/Math.cos(lat);

  return {
    minLat: latMin*180/Math.PI,
    maxLat: latMax*180/Math.PI,
    minLon: lonMin*180/Math.PI,
    maxLon: lonMax*180/Math.PI
  };
}

// ---- DOWNLOAD IGN TILE ----
async function fetchIgnTile(z, x, y) {
  const url = `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Erreur tuile ${z}/${x}/${y}`);
  return new Uint8Array(await r.arrayBuffer());
}

// ---- TILE CONVERSION (WGS84 -> TILE INDEX) ----
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2 * Math.pow(2, zoom)
  );
}

function listTiles(minLat, minLon, maxLat, maxLon, zoomLevels) {
  const tiles = [];
  zoomLevels.forEach(z => {
    const xMin = lon2tile(minLon, z);
    const xMax = lon2tile(maxLon, z);
    const yMin = lat2tile(maxLat, z);
    const yMax = lat2tile(minLat, z);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y });
      }
    }
  });
  return tiles;
}

// ---- PMTILES GENERATION (stub) ----
async function generatePMTiles(){
  if(!center){ alert("Choisis un centre."); return; }
  let km = parseInt(document.getElementById('radius').value);
  let bbox = computeBBox(center, km);

  let tiles = listTiles(bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon, [12,13,14,15,16]);
  alert("Tuiles à télécharger: " + tiles.length);

  // NOTE: Insert PMTilesBuilder real logic here.
  alert("Génération PMTiles réelle à compléter (nécessite PMTiles WASM)");
}

document.getElementById('download').onclick = generatePMTiles;

// ---- GPX LOAD ----
document.getElementById('loadgpx').onclick = ()=>{
  const f = document.getElementById('gpxfile').files[0];
  if(!f){ alert("Sélectionne un GPX."); return; }
  const r = new FileReader();
  r.onload = ()=>{
    console.log("GPX:", r.result);
    alert("GPX importé");
    // TODO: parse GPX + afficher sur carte
  };
  r.readAsText(f);
};

// ---- TRACK RECORDING ----
document.getElementById('startTrack').onclick = ()=>{
  track = [];
  tracking = true;
  navigator.geolocation.watchPosition(pos=>{
    if(tracking){
      track.push([pos.coords.longitude, pos.coords.latitude]);
    }
  }, err=>alert(err.message), {enableHighAccuracy:true});
  alert("Enregistrement démarré.");
};

document.getElementById('stopTrack').onclick = ()=>{
  tracking = false;
  if(track.length < 2){ alert("Pas assez de points"); return; }

  let gpx = '<gpx><trk><trkseg>';
  track.forEach(pt=>{
    gpx += `<trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>`;
  });
  gpx += '</trkseg></trk></gpx>';

  const blob = new Blob([gpx], {type:'application/gpx+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "trace.gpx";
  a.click();
  alert("GPX exporté");
};
