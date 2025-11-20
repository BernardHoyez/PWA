// randoMB - gestion trace + MBTiles local
let map = L.map('map').setView([45.0, 6.0], 13);
let track = [];
let watchId = null;
let startTime = null;
let distance = 0;
let lastPos = null;

// Couche vide initiale
let tileLayer = L.tileLayer('', {minZoom: 5, maxZoom: 18});
tileLayer.addTo(map);

// Lecture MBTiles local
document.getElementById("mbtilesInput").addEventListener("change", async (ev)=>{
    const file = ev.target.files[0];
    if(!file) return;

    const u8 = new Uint8Array(await file.arrayBuffer());
    const SQL = await initSqlJs({ locateFile: f => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/sql-wasm.wasm" });
    const db = new SQL.Database(u8);

    // détection PNG ou JPG
    const row = db.exec("SELECT tile_data FROM tiles LIMIT 1;");
    let bytes = row[0].values[0][0];
    let sig = bytes.slice(0,2);
    let format = "jpg";
    if(sig[0]==0x89 && sig[1]==0x50) format="png";

    console.log("Format détecté :", format);

    // Charger metadata
    let meta = db.exec("SELECT name, value FROM metadata;");
    let md = {};
    meta[0].values.forEach(v => md[v[0]] = v[1]);

    // Création couche MBTiles Leaflet
    let mbLayer = L.tileLayer(async function(coords, cb){
        let sql = `SELECT tile_data FROM tiles WHERE zoom_level=${coords.z} AND tile_column=${coords.x} AND tile_row=${(1<<coords.z)-coords.y-1}`;
        let r = db.exec(sql);
        if(r.length==0){ cb(null,null); return; }
        let data = r[0].values[0][0];
        let blob = new Blob([data], {type: format==="png"?"image/png":"image/jpeg"});
        let url = URL.createObjectURL(blob);
        cb(url);
    },{
        minZoom: md.minzoom?parseInt(md.minzoom):5,
        maxZoom: md.maxzoom?parseInt(md.maxzoom):18,
        tileSize: 256,
        attribution: md.attribution || ""
    });

    map.removeLayer(tileLayer);
    tileLayer = mbLayer;
    tileLayer.addTo(map);

    alert("MBTiles chargé : " + file.name);
});

// Gestion trace
document.getElementById("startBtn").onclick = ()=>{
    if(watchId) return;
    track = [];
    distance = 0;
    lastPos = null;
    startTime = Date.now();
    watchId = navigator.geolocation.watchPosition(pos=>{
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;

        document.getElementById("pos").textContent = lat.toFixed(6) + ", " + lon.toFixed(6);

        track.push([lat, lon]);
        if(lastPos){
            distance += haversine(lastPos, [lat, lon]);
            document.getElementById("dist").textContent = Math.round(distance) + " m";
        }
        lastPos = [lat, lon];
    });
    updateTime();
};

document.getElementById("stopBtn").onclick = ()=>{
    if(!watchId) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    saveGPX();
    saveKML();
};

// timer
function updateTime(){
    if(!watchId) return;
    let s = Math.floor((Date.now()-startTime)/1000);
    document.getElementById("time").textContent = s+"s";
    requestAnimationFrame(updateTime);
}

// distance Haversine
function haversine(a,b){
    let R=6371000;
    let dLat=(b[0]-a[0])*(Math.PI/180);
    let dLon=(b[1]-a[1])*(Math.PI/180);
    let lat1=a[0]*(Math.PI/180);
    let lat2=b[0]*(Math.PI/180);
    let x=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
}

// export GPX
function saveGPX(){
    let xml = '<?xml version="1.0"?><gpx version="1.1" creator="randoMB"><trk><trkseg>';
    track.forEach(p => xml += `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`);
    xml += '</trkseg></trk></gpx>';

    let blob = new Blob([xml], {type:"application/gpx+xml"});
    download(blob, "trace.gpx");
}

// export KML
function saveKML(){
    let xml = '<?xml version="1.0"?><kml><Document><Placemark><LineString><coordinates>';
    track.forEach(p => xml += `${p[1]},${p[0]},0 `);
    xml += '</coordinates></LineString></Placemark></Document></kml>';

    let blob = new Blob([xml], {type:"application/vnd.google-earth.kml+xml"});
    download(blob, "trace.kml");
}

function download(blob, name){
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
}
