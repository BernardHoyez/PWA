let selectedLat=null, selectedLng=null, selectedFile=null;

const map=L.map("map");

const ign=L.tileLayer(
 "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
 "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png" +
 "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
 {maxZoom:19, attribution:"IGN"}
);

const osm=L.tileLayer(
 "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
 {maxZoom:19, attribution:"OSM"}
);

ign.addTo(map);
map.setView([46.5,2.5],6);

document.getElementById("layerSelect").onchange=e=>{
 map.eachLayer(l=>map.removeLayer(l));
 (e.target.value==="ign"?ign:osm).addTo(map);
};

document.getElementById("fileInput").onchange=e=>selectedFile=e.target.files[0];

let marker=null;
map.on("click",e=>{
 selectedLat=e.latlng.lat;
 selectedLng=e.latlng.lng;
 if(marker)marker.remove();
 marker=L.marker([selectedLat,selectedLng]).addTo(map);
 updateCoords();
});

function updateCoords(){
 const d=document.getElementById("coordsDisplay");
 d.textContent=(selectedLat&&selectedLng)?"Position : "+selectedLat.toFixed(6)+", "+selectedLng.toFixed(6):"";
}

document.getElementById("gpsBtn").onclick=()=>{
 navigator.geolocation.getCurrentPosition(pos=>{
  selectedLat=pos.coords.latitude;
  selectedLng=pos.coords.longitude;
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

document.getElementById("readTagsBtn").onclick=async()=>{
 if(!selectedFile){alert("Choisir un MP3");return;}
 const buf=await selectedFile.arrayBuffer();
 const bytes=new Uint8Array(buf);
 let res="";
 for(let i=0;i<bytes.length-3;i++){
  if(bytes[i]==0x54&&bytes[i+1]==0x58&&bytes[i+2]==0x58&&bytes[i+3]==0x58)
    res+="Tag TXXX détecté
";
 }
 document.getElementById("tagEditor").value=res||"Aucun tag TXXX trouvé.";
};

document.getElementById("saveBtn").onclick=async()=>{
 if(!selectedFile){alert("Choisir un MP3");return;}
 const buf=await selectedFile.arrayBuffer();
 const w=new ID3Writer(buf);
 if(selectedLat&&selectedLng){
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
