
let selectedLat=null, selectedLng=null, selectedFile=null;
let marker=null;

const map=L.map("map").setView([46.5,2.5],6);

const ign=L.tileLayer(
 "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0"+
 "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png"+
 "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
 {maxZoom:19,tileSize:256,attribution:"IGN"}
);
const osm=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
 {maxZoom:19,attribution:"OSM"}
);
ign.addTo(map);

document.getElementById("layerSelect").onchange=e=>{
 map.eachLayer(l=>map.removeLayer(l));
 (e.target.value==="ign"?ign:osm).addTo(map);
};

document.getElementById("fileInput").onchange=e=>selectedFile=e.target.files[0];

map.on("click",e=>{
 selectedLat=e.latlng.lat;
 selectedLng=e.latlng.lng;
 if(marker)marker.remove();
 marker=L.marker([selectedLat,selectedLng]).addTo(map);
 updateCoords();
});

function updateCoords(){
 document.getElementById("coordsDisplay").textContent =
   (selectedLat!=null)?`${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`:"";
}

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

// EXPORT KMZ
document.getElementById("exportKMZ").onclick=async()=>{
 if(selectedLat==null || !selectedFile){
   alert("Coordonnées ou MP3 manquant");
   return;
 }

 const kml=
`<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Placemark>
<name>Point audio</name>
<Point><coordinates>${selectedLng},${selectedLat},0</coordinates></Point>
<description><![CDATA[
<a href="audio.mp3">Télécharger / Écouter l'audio</a>
]]></description>
</Placemark>
</Document>
</kml>`;

 const zip=new JSZip();
 zip.file("doc.kml", kml);
 const mp3buf=await selectedFile.arrayBuffer();
 zip.file("audio.mp3", mp3buf);

 const blob=await zip.generateAsync({type:"blob"});
 download("point.kmz", blob, "application/vnd.google-earth.kmz");
};

function download(name,content,type){
 const blob = content instanceof Blob ? content : new Blob([content],{type});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download=name;
 a.click();
}
