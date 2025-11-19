let map = L.map('map').setView([45.0, 6.0], 14);
let mbtilesDB = null;
let tileLayer = null;

document.getElementById('mbtilesInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: f => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm" });
    mbtilesDB = new SQL.Database(new Uint8Array(arrayBuffer));

    if (tileLayer) tileLayer.remove();

    tileLayer = L.tileLayer.canvas({ tileSize: 256 });
    tileLayer.drawTile = function (canvas, tilePoint, zoom) {
        if (!mbtilesDB) return;
        let z = zoom;
        let x = tilePoint.x;
        let y = tilePoint.y;

        let stmt = mbtilesDB.prepare("SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?");
        stmt.bind([z, x, (1 << z) - 1 - y]);
        if (stmt.step()) {
            let tileData = stmt.getAsObject().tile_data;
            let blob = new Blob([tileData], { type: 'image/png' });
            let img = new Image();
            img.onload = () => { canvas.getContext('2d').drawImage(img, 0, 0); };
            img.src = URL.createObjectURL(blob);
        }
    };
    tileLayer.addTo(map);
});

// Tracking + stats
let watchId, startTime, timerInterval, positions = [];

function updateStats() {
    const elapsed = Date.now() - startTime;
    const h = Math.floor(elapsed/3600000);
    const m = Math.floor((elapsed%3600000)/60000);
    const s = Math.floor((elapsed%60000)/1000);
    document.getElementById('time').textContent = `${h}:${m}:${s}`;
    if (positions.length<2) return;
    let dist=0;
    for (let i=1;i<positions.length;i++) dist+=haversine(positions[i-1],positions[i]);
    document.getElementById('distance').textContent = Math.round(dist);
}
const haversine = (a,b)=>{
    const R=6371000,toRad=x=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);
    const v=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
};

document.getElementById('startBtn').onclick=()=>{
    positions=[];
    startTime=Date.now();
    timerInterval=setInterval(updateStats,1000);
    watchId=navigator.geolocation.watchPosition(pos=>{
        const {latitude,longitude}=pos.coords;
        positions.push({lat:latitude,lon:longitude});
        document.getElementById('position').textContent = latitude.toFixed(6)+','+longitude.toFixed(6);
    });
    startBtn.disabled=true; stopBtn.disabled=false;
};

document.getElementById('stopBtn').onclick=()=>{
    navigator.geolocation.clearWatch(watchId);
    clearInterval(timerInterval);
    startBtn.disabled=false; stopBtn.disabled=true;

    saveTrace();
};

function saveTrace(){
    const gpx = generateGPX(positions);
    const kml = generateKML(positions);
    download(gpx,"trace.gpx");
    download(kml,"trace.kml");
}

function generateGPX(points){
    let g='<?xml version="1.0"?><gpx version="1.1" creator="randoMB"><trk><trkseg>';
    points.forEach(p=>g+=`<trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`);
    return g+'</trkseg></trk></gpx>';
}
function generateKML(points){
    let k='<?xml version="1.0"?><kml><Document><Placemark><LineString><coordinates>';
    points.forEach(p=>k+=`${p.lon},${p.lat} `);
    return k+'</coordinates></LineString></Placemark></Document></kml>';
}
function download(content,name){
    const blob=new Blob([content],{type:"text/plain"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=name; a.click();
    URL.revokeObjectURL(url);
}
