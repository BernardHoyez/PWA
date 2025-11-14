let selectedLat=null, selectedLng=null, selectedFile=null;
let marker=null;

// Init map
const map=L.map("map").setView([46.5,2.5],6);

const ign=L.tileLayer(
 "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0"+
 "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png"+
 "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
 {maxZoom:19,tileSize:256,attribution:"© IGN"}
);

const osm=L.tileLayer(
 "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
 {maxZoom:19,attribution:"© OSM"}
);

ign.addTo(map);

// Layer switcher
document.getElementById("layerSelect").onchange=e=>{
 map.eachLayer(l=>map.removeLayer(l));
 (e.target.value==="ign"?ign:osm).addTo(map);
};

// File input
document.getElementById("fileInput").onchange=e=>selectedFile=e.target.files[0];

// Map click
map.on("click",e=>{
 selectedLat=e.latlng.lat;
 selectedLng=e.latlng.lng;
 if(marker)marker.remove();
 marker=L.marker([selectedLat,selectedLng]).addTo(map);
 updateCoords();
});

// Update coords display
function updateCoords(){
 const d=document.getElementById("coordsDisplay");
 d.textContent=(selectedLat!==null)
   ?`Position : ${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
   :"";
}

// GPS button
document.getElementById("gpsBtn").onclick=()=>{
 navigator.geolocation.getCurrentPosition(p=>{
  selectedLat=p.coords.latitude;
  selectedLng=p.coords.longitude;
  if(marker)marker.remove();
  marker=L.marker([selectedLat,selectedLng]).addTo(map);
  map.setView([selectedLat,selectedLng],15);
  updateCoords();
 });
};

// Manual coords
document.getElementById("manualBtn").onclick=()=>{
 const lat=parseFloat(prompt("Latitude :"));
 const lng=parseFloat(prompt("Longitude :"));
 if(!isNaN(lat)&&!isNaN(lng)){
  selectedLat=lat; selectedLng=lng;
  if(marker)marker.remove();
  marker=L.marker([lat,lng]).addTo(map);
  map.setView([lat,lng],15);
  updateCoords();
 }
};

// Read tags
document.getElementById("readTagsBtn").onclick=async()=>{
 if(!selectedFile){alert("Choisir un MP3");return;}
 const buf=await selectedFile.arrayBuffer();
 const bytes=new Uint8Array(buf);
 let res="";
 for(let i=0;i<bytes.length-3;i++){
  if(bytes[i]==0x54&&bytes[i+1]==0x58&&bytes[i+2]==0x58&&bytes[i+3]==0x58)
    res+="Tag TXXX détecté\n";
 }
 document.getElementById("tagEditor").value=res||"Aucun tag TXXX trouvé.";
};

// EXPORT GPX
document.getElementById("exportGPX").onclick=()=>{
 if(selectedLat==null){alert("Pas de coordonnées");return;}
 const gpx=`<?xml version="1.0"?>
<gpx version="1.1" creator="Tagaudio">
<wpt lat="${selectedLat}" lon="${selectedLng}"><name>Point</name></wpt>
</gpx>`;
 download("point.gpx",gpx,"application/gpx+xml");
};

// EXPORT KML
document.getElementById("exportKML").onclick=()=>{
 if(selectedLat==null){alert("Pas de coordonnées");return;}
 const kml=`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><Placemark><Point><coordinates>${selectedLng},${selectedLat},0</coordinates></Point></Placemark></Document>
</kml>`;
 download("point.kml",kml,"application/vnd.google-earth.kml+xml");
};

// Downloader
function download(name,content,type){
 const blob=new Blob([content],{type});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download=name;
 a.click();
}

// IMPORT GPX/KML
document.getElementById("importGPX").onclick=()=>document.getElementById("gpxInput").click();

document.getElementById("gpxInput").onchange=async(e)=>{
 const file=e.target.files[0];
 const t=await file.text();
 let lat,lng;

 if(t.includes("<gpx")){
   lat=parseFloat(/lat="([^"]+)"/.exec(t)[1]);
   lng=parseFloat(/lon="([^"]+)"/.exec(t)[1]);
 } 
 else if(t.includes("<kml")){
   const c=/<coordinates>([^<]+)<\/coordinates>/.exec(t)[1].split(",");
   lng=parseFloat(c[0]);
   lat=parseFloat(c[1]);
 }

 selectedLat=lat; selectedLng=lng;
 if(marker)marker.remove();
 marker=L.marker([lat,lng]).addTo(map);
 map.setView([lat,lng],15);
 updateCoords();
};

// SAVE MP3
document.getElementById("saveBtn").onclick=async()=>{
 if(!selectedFile){alert("Choisir un MP3");return;}
 const buf=await selectedFile.arrayBuffer();
 const w=new ID3Writer(buf);
 if(selectedLat!=null){
  w.setFrame("TXXX",{description:"GPS_LAT",value:selectedLat.toString()});
  w.setFrame("TXXX",{description:"GPS_LON",value:selectedLng.toString()});
 }
 w.addTag();
 const out=w.getBlob();
 const a=document.createElement("a");
 a.href=URL.createObjectURL(out);
 a.download="tagged_"+selectedFile.name;
 a.click();
};
