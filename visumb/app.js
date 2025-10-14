const BASE = window.location.origin + '/PWA/visumb';
const map = L.map('map', { center: [46.5,2.5], zoom:6 });
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19, attribution:'© OpenStreetMap contributors' });
osm.addTo(map);

let localLayer = null;

document.getElementById('btn-osm').addEventListener('click',()=>{
  if(localLayer) map.removeLayer(localLayer);
  if(!map.hasLayer(osm)) osm.addTo(map);
});

document.getElementById('btn-local').addEventListener('click', async ()=>{
  try {
    const dirHandle = await window.showDirectoryPicker();
    const tiles = await buildLocalTiles(dirHandle);
    if (tiles) {
      if(map.hasLayer(osm)) map.removeLayer(osm);
      if(localLayer) map.removeLayer(localLayer);
      localLayer = tiles;
      localLayer.addTo(map);
    }
  } catch(err) {
    console.error('Erreur ouverture dossier:', err);
    alert('Impossible d’ouvrir le dossier de tuiles.');
  }
});

async function buildLocalTiles(dirHandle) {
  let format = 'png';
  const zDirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if(handle.kind === 'directory') zDirs.push(name);
  }
  if(zDirs.length === 0){ alert('Aucun sous-dossier de zoom trouvé.'); return null; }
  const testPath = `${zDirs[0]}/0/0`;
  try {
    const testFile = await (await (await (await dirHandle.getDirectoryHandle(zDirs[0])).getDirectoryHandle('0')).getFileHandle('0.png')).getFile();
    format = 'png';
  } catch {
    try {
      const testFile = await (await (await (await dirHandle.getDirectoryHandle(zDirs[0])).getDirectoryHandle('0')).getFileHandle('0.jpg')).getFile();
      format = 'jpg';
    } catch {}
  }

  const handler = async (z, x, y) => {
    try {
      const zH = await dirHandle.getDirectoryHandle(z.toString());
      const xH = await zH.getDirectoryHandle(x.toString());
      const fH = await xH.getFileHandle(y.toString()+'.'+format);
      const file = await fH.getFile();
      return URL.createObjectURL(file);
    } catch(e) {
      return null;
    }
  };

  const tileLayer = L.tileLayer('', { maxZoom:19, minZoom:0 });
  tileLayer.getTileUrl = (coords) => handler(coords.z, coords.x, coords.y);
  tileLayer.options.attribution = 'Tuiles locales (File System Access)';
  return tileLayer;
}

// GPS
let follow=false;
document.getElementById('follow').addEventListener('change',e=>follow=e.target.checked);

const pulseIcon=L.divIcon({className:'pulse-wrapper',html:'<div class="marker-pulse"><div class="marker-inner"></div></div>',iconSize:[18,18],iconAnchor:[9,9]});
let positionMarker=null;
function onPosition(pos){
  const lat=pos.coords.latitude, lon=pos.coords.longitude;
  if(!positionMarker) positionMarker=L.marker([lat,lon],{icon:pulseIcon}).addTo(map);
  else positionMarker.setLatLng([lat,lon]);
  if(follow) map.setView([lat,lon],Math.max(map.getZoom(),15));
}
function onError(err){console.warn('Geolocation error:',err);}
if('geolocation' in navigator) navigator.geolocation.watchPosition(onPosition,onError,{enableHighAccuracy:true,maximumAge:1000,timeout:10000});
else alert('Géolocalisation non disponible.');

// SW
if('serviceWorker' in navigator) navigator.serviceWorker.register(BASE+'/sw.js').then(()=>console.log('SW enregistré')).catch(err=>console.error('SW failed',err));