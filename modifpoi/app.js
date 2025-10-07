/*
  app.js - modifpoi PWA
  Fonctionnalités :
  - lecture d'un .zip contenant visit.json + dossier data/...
  - affichage des POI sur carte Leaflet (OSM)
  - détection POI complexes (coordonnées partagées) -> marqueurs rouges, simples -> bleus
  - popup avec titre + vignette image ou vidéo (max width 300px)
  - déplacement draggable des marqueurs
  - bouton Valider position par POI
  - sauvegarde ZIP modifié (utilise JSZip)
  - logs de debug inclus
*/

let map, markers = {}, visit = null, zipFilename = null, mediaBlobs = {}, zipEntries = null;

function initMap(){
  map = L.map('map').setView([46.5, 2.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(map);
  console.log('Leaflet initialisé');
}

function isoCoordKey(lat, lon){ return lat.toFixed(6)+','+lon.toFixed(6); }

function colorForPoi(poi, coordCounts){
  const key = isoCoordKey(poi.lat, poi.lon);
  return (coordCounts[key] && coordCounts[key] > 1) ? 'red' : 'blue';
}

function clearMarkers(){
  Object.values(markers).forEach(m=>map.removeLayer(m.leaflet));
  markers = {};
}

function escapeHtml(s){ return (s||'').replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":\"&#39;\"}[c])); }

function getMediaUrl(name){ return mediaBlobs[name] || null; }

async function renderPOIs(){
  clearMarkers();
  if(!visit) return;
  const counts = {};
  visit.pois.forEach(p => { counts[isoCoordKey(p.lat,p.lon)] = (counts[isoCoordKey(p.lat,p.lon)]||0)+1; });

  visit.pois.forEach(poi => {
    const color = colorForPoi(poi, counts);
    const marker = L.marker([poi.lat, poi.lon], {draggable:true, riseOnHover:true});
    marker.addTo(map);

    let html = `<div class="popup-content"><strong>${escapeHtml(poi.title)}</strong><br>`;
    if(poi.image){
      const url = getMediaUrl(poi.image.name);
      if(url) html += `<img src="${url}" width="300" alt="${escapeHtml(poi.title)}">`;
      else html += `<div>(image manquante: ${escapeHtml(poi.image.name)})</div>`;
    } else if(poi.video){
      const url = getMediaUrl(poi.video.name);
      if(url) html += `<video controls width="300" src="${url}"></video>`;
      else html += `<div>(video manquante: ${escapeHtml(poi.video.name)})</div>`;
    }
    html += `</div>`;
    marker.bindPopup(html);

    marker.on('dragend', ()=>{
      const latlng = marker.getLatLng();
      poi.lat = parseFloat(latlng.lat.toFixed(6));
      poi.lon = parseFloat(latlng.lng.toFixed(6));
      updatePoiPanel(poi.id);
    });

    markers[poi.id] = {leaflet: marker, poi: poi, color: color};
  });

  // color markers using SVG data URLs
  Object.values(markers).forEach(m => {
    const col = m.color === 'red' ? '#d33' : '#33a1ff';
    const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><circle cx='18' cy='12' r='8' fill='${col}' stroke='#000' stroke-width='1'/><rect x='16' y='18' width='4' height='12' fill='${col}'/></svg>`);
    const icon = L.icon({iconUrl: 'data:image/svg+xml;utf8,' + svg, iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-24]});
    m.leaflet.setIcon(icon);
  });

  buildPoiList();
}

function buildPoiList(){
  const list = document.getElementById('poiList'); list.innerHTML='';
  const template = document.getElementById('poi-item-template');
  if(!visit || !visit.pois) return;
  visit.pois.forEach(p => {
    const node = template.content.cloneNode(true);
    node.querySelector('.poi-title').textContent = p.title;
    node.querySelector('.poi-coords').textContent = `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
    node.querySelector('.poi-comment').textContent = p.comment || '';
    node.querySelector('.btn-zoom').addEventListener('click', ()=>{
      map.setView([p.lat,p.lon],17);
      if(markers[p.id]) markers[p.id].leaflet.openPopup();
    });
    node.querySelector('.btn-validate').addEventListener('click', ()=>{
      alert(`Position validée pour ${p.title}: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`);
    });
    list.appendChild(node);
  });
}

function updatePoiPanel(poiId){
  buildPoiList();
}

// --- ZIP handling ---
async function handleZipFile(file){
  try {
    console.log('Chargement du zip :', file.name);
    const jszip = new JSZip();
    const z = await jszip.loadAsync(file);
    zipEntries = z.files;
    console.log('Fichiers dans le zip :', Object.keys(z.files).slice(0,50));
    // recherche flexible du visit.json (racine ou sous-dossier)
    const visitFiles = Object.keys(z.files).filter(n => /visit\\.json$/i.test(n));
    if(visitFiles.length === 0){
      alert('visit.json manquant à la racine du zip (ou dans le zip).');
      return;
    }
    const visitPath = visitFiles[0];
    console.log('visit.json trouvé à :', visitPath);
    const visitStr = await z.files[visitPath].async('string');
    try {
      visit = JSON.parse(visitStr);
    } catch(err){
      console.error('Erreur JSON:', err);
      alert('visit.json invalide (JSON mal formé). Voir la console pour détails.');
      return;
    }
    zipFilename = file.name.replace(/\\.zip$/i, '');
    // extraire les médias référencés
    mediaBlobs = {};
    for(const poi of visit.pois || []){
      for(const k of ['image','audio','video']){
        if(poi[k] && poi[k].name){
          const candidatePaths = [
            'data/' + poi[k].name,
            poi[k].name,
            Object.keys(z.files).find(p => p.endsWith('/' + poi[k].name)),
            Object.keys(z.files).find(p => p === poi[k].name)
          ].filter(Boolean);
          const found = candidatePaths.find(p => z.files[p]);
          if(found){
            const blob = await z.files[found].async('blob');
            mediaBlobs[poi[k].name] = URL.createObjectURL(blob);
          } else {
            console.warn('Media référencé non trouvé dans le zip :', poi[k].name);
          }
        }
      }
    }
    document.getElementById('visitTitle').textContent = visit.title || '—';
    document.getElementById('btnSaveZip').disabled = false;
    await renderPOIs();
    console.log('POI rendus :', visit.pois ? visit.pois.length : 0);
  } catch(err){
    console.error('Erreur lors du traitement du ZIP :', err);
    alert('Erreur lors du traitement du ZIP. Voir console pour plus de détails.');
  }
}

async function saveModifiedZip(){
  if(!visit) return;
  try {
    const outZip = new JSZip();
    outZip.file('visit.json', JSON.stringify(visit, null, 2));
    const dataFolder = outZip.folder('data');
    // ajouter les médias extraits
    for(const name in mediaBlobs){
      // fetch blob from object URL
      const resp = await fetch(mediaBlobs[name]);
      const blob = await resp.blob();
      dataFolder.file(name, blob);
    }
    const content = await outZip.generateAsync({type:'blob'});
    const outName = zipFilename ? `${zipFilename}_modif.zip` : 'visit_modif.zip';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = outName;
    a.click();
  } catch(err){
    console.error('Erreur lors de la création du zip modifié :', err);
    alert('Erreur lors de la création du zip modifié. Voir console.');
  }
}

// UI wiring
window.addEventListener('load', ()=>{
  initMap();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>console.warn('SW registration échouée'));
  }

  document.getElementById('zipInput').addEventListener('change', async (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    await handleZipFile(f);
  });

  document.getElementById('btnSaveZip').addEventListener('click', ()=>saveModifiedZip());

  document.getElementById('btnLoadSample').addEventListener('click', async ()=>{
    const resp = await fetch('sample_visit.json');
    visit = await resp.json();
    mediaBlobs = {};
    document.getElementById('visitTitle').textContent = visit.title||'—';
    document.getElementById('btnSaveZip').disabled = false;
    await renderPOIs();
  });
});