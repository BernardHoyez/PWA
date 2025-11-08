// main.js — version complète et cohérente (estimation, calcul exact non bloquant, téléchargement,
// sessions/autosave, File System Access, ZIP fallback, SW cleanup).
// Dépendances dans index.html : Leaflet, JSZip.

// ---------- Utilities ----------
function deg2rad(d){ return d * Math.PI / 180; }
function rad2deg(r){ return r * 180 / Math.PI; }
const EARTH_RADIUS = 6371000;

function formatCoordFilename(lat,lon){ return lat.toFixed(6) + '_' + lon.toFixed(6); }
function nowFolderName(){ const dt=new Date(); const pad=n=>String(n).padStart(2,'0'); return `marche_${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}_${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`; }
function setStatus(text){ const s=document.getElementById('status'); if(s) s.textContent = 'Statut: ' + text; }
function showToast(msg, ms=3500){ const t=document.getElementById('toast'); if(!t) return; t.textContent = msg; t.style.display='block'; clearTimeout(t._timeout); t._timeout=setTimeout(()=>t.style.display='none', ms); }

// ---------- IndexedDB sessions ----------
const IDB_NAME='marche-db', IDB_VERSION=1, IDB_STORE='sessions';
function openIDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db=e.target.result;
      if(!db.objectStoreNames.contains(IDB_STORE)){
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('by_date','createdAt',{unique:false});
      }
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbSaveSession(obj){
  const db=await openIDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,'readwrite');
    const store=tx.objectStore(IDB_STORE);
    obj.updatedAt = Date.now();
    store.put(obj);
    tx.oncomplete = ()=>resolve(obj);
    tx.onerror = ()=>reject(tx.error);
  });
}
async function idbListSessions(){ const db=await openIDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(IDB_STORE,'readonly'); const store=tx.objectStore(IDB_STORE); const req=store.getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); }); }
async function idbGetSession(id){ const db=await openIDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(IDB_STORE,'readonly'); const store=tx.objectStore(IDB_STORE); const req=store.get(id); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
async function idbDeleteSession(id){ const db=await openIDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); const store=tx.objectStore(IDB_STORE); store.delete(id); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); }
async function idbClearAllSessions(){ const db=await openIDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); const store=tx.objectStore(IDB_STORE); store.clear(); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); }

// ---------- WebMercator / tiles helpers ----------
function latLonToTileXY(lat, lon, z){
  const latRad = deg2rad(lat);
  const n = Math.pow(2, z);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * n);
  return {x,y};
}
function tileXYToLonLat(x,y,z){
  const n=Math.pow(2,z);
  const lon = x/n*360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2*y / n)));
  return {lat: rad2deg(latRad), lon};
}
function bboxAround(lat, lon, radiusMeters){
  const latDelta = rad2deg(radiusMeters / EARTH_RADIUS);
  const lonDelta = rad2deg(radiusMeters / (EARTH_RADIUS * Math.cos(deg2rad(lat))));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLon: lon - lonDelta, maxLon: lon + lonDelta };
}
function haversineDistance(lat1,lon1,lat2,lon2){
  const dlat=deg2rad(lat2-lat1), dlon=deg2rad(lon2-lon1);
  const a=Math.sin(dlat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dlon/2)**2;
  const c=2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS * c;
}

// ---------- estimate (fast) and listTilesAsync (exact, non-blocking) ----------
function quickEstimateTiles(lat, lon, radiusMeters=10000, zmin=13, zmax=16){
  if(zmax>16) zmax=16;
  const latRad = deg2rad(lat), cosLat = Math.cos(latRad), worldCirc = 40075016.686;
  let total = 0;
  for(let z=zmin; z<=zmax; z++){
    const tileEq = worldCirc / Math.pow(2,z);
    const tileEW = tileEq * cosLat;
    const area = Math.max(1, tileEq * tileEW);
    const circ = Math.PI * radiusMeters * radiusMeters;
    total += Math.ceil(circ / area);
  }
  return total;
}

async function listTilesAsync(lat, lon, radiusMeters=10000, zmin=13, zmax=16, progressCb=()=>{}){
  if(zmax>16) zmax=16;
  const bbox=bboxAround(lat,lon,radiusMeters);
  const tiles=[];
  let totalEstimate=0;
  for(let z=zmin; z<=zmax; z++){
    const t1=latLonToTileXY(bbox.maxLat,bbox.minLon,z);
    const t2=latLonToTileXY(bbox.minLat,bbox.maxLon,z);
    const xmin=Math.min(t1.x,t2.x), xmax=Math.max(t1.x,t2.x), ymin=Math.min(t1.y,t2.y), ymax=Math.max(t1.y,t2.y);
    totalEstimate += (xmax - xmin + 1) * (ymax - ymin + 1);
  }
  let countSoFar=0, iter=0, yieldEvery=1500;
  for(let z=zmin; z<=zmax; z++){
    const t1=latLonToTileXY(bbox.maxLat,bbox.minLon,z);
    const t2=latLonToTileXY(bbox.minLat,bbox.maxLon,z);
    const xmin=Math.min(t1.x,t2.x), xmax=Math.max(t1.x,t2.x), ymin=Math.min(t1.y,t2.y), ymax=Math.max(t1.y,t2.y);
    for(let x=xmin; x<=xmax; x++){
      for(let y=ymin; y<=ymax; y++){
        const {lat:tileLat, lon:tileLon} = tileXYToLonLat(x+0.5,y+0.5,z);
        const d = haversineDistance(lat,lon,tileLat,tileLon);
        if(d <= radiusMeters + 1000) tiles.push({z,x,y});
        countSoFar++; iter++;
        if((iter & (yieldEvery - 1)) === 0){
          progressCb({countSoFar, totalEstimate, z, x, y, done:false});
          await new Promise(r=>setTimeout(r,0));
        }
      }
    }
    progressCb({countSoFar, totalEstimate, z, x:null, y:null, done:false});
  }
  progressCb({countSoFar: tiles.length, totalEstimate, z:null, x:null, y:null, done:true});
  return tiles;
}

// ---------- download tiles from list with caching and optional FS write ----------
async function downloadTilesAroundFromList(tiles, tileUrlTemplate, progressCb=(p)=>{}){
  const total = tiles.length;
  const cache = await caches.open('marche-tiles-v1');
  let count = 0;
  for(const t of tiles){
    const url = tileUrlTemplate.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
    try {
      const req = new Request(url, {mode:'cors'});
      const resp = await fetch(req);
      if(resp && resp.ok){
        try { await cache.put(req, resp.clone()); } catch(e){ console.warn('cache.put failed', e); }
        if(sessionDirHandle){
          try {
            const blob = await resp.blob();
            const dirZ = await sessionDirHandle.getDirectoryHandle(String(t.z), {create:true});
            const filename = `${t.x}_${t.y}.png`;
            const fh = await dirZ.getFileHandle(filename, {create:true});
            const w = await fh.createWritable();
            await w.write(blob);
            await w.close();
          } catch(e){ console.warn('FS write tile failed', e); }
        }
      }
    } catch(e){
      console.warn('fetch tile err', e, url);
    }
    count++;
    const pct = Math.round((count/total)*100);
    progressCb({count,total,pct});
  }
  return {count,total};
}

// ---------- ZIP helpers ----------
function downloadBlobWithName(blob, filename){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000); }

async function createZipFromCacheAndMemory(options={}){ const includeTiles = options.includeTiles ?? true; const includeTraces = options.includeTraces ?? true; const includeMedia = options.includeMedia ?? true; const zip = new JSZip(); try{ const cache = await caches.open('marche-tiles-v1'); const requests = await cache.keys(); if(requests.length>0 && includeTiles){ const folder = zip.folder('tiles'); for(const req of requests){ try{ const resp = await cache.match(req); if(!resp) continue; let entry=''; try{ const u=new URL(req.url); entry = u.pathname.split('/').slice(-3).join('_'); }catch(e){ entry = encodeURIComponent(req.url); } const blob = await resp.blob(); folder.file(entry, blob); } catch(e){ console.warn('tile read err', e);} } } }catch(e){ console.warn('open cache err', e); } try{ if(includeTraces && typeof trackCoords !== 'undefined' && trackCoords && trackCoords.length>0){ const gpx = generateGPX(trackCoords); const kml = generateKML(trackCoords); const folder = zip.folder('traces'); folder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, gpx); folder.file(`trace_${new Date().toISOString().replace(/[:.]/g,'-')}.kml`, kml); } }catch(e){ console.warn('traces to zip err', e); } try{ if(includeMedia && typeof waypoints !== 'undefined' && waypoints && waypoints.length>0){ const media = zip.folder('media'); for(const wp of waypoints) if(wp.blob && wp.file) media.file(wp.file, wp.blob); } }catch(e){ console.warn('media zip err', e); } return await zip.generateAsync({type:'blob'}); }

// ---------- File System helpers ----------
async function createSessionDir(){ if(!rootDirHandle) return null; sessionDirHandle = await rootDirHandle.getDirectoryHandle(nowFolderName(), {create:true}); await sessionDirHandle.getDirectoryHandle('tiles', {create:true}); await sessionDirHandle.getDirectoryHandle('media', {create:true}); await sessionDirHandle.getDirectoryHandle('traces', {create:true}); return sessionDirHandle; }
async function writeFileToSession(relativePath, blob){ if(!sessionDirHandle){ if(rootDirHandle) await createSessionDir(); else return false; } const parts = relativePath.split('/').filter(Boolean); let dir = sessionDirHandle; for(let i=0;i<parts.length-1;i++){ dir = await dir.getDirectoryHandle(parts[i], {create:true}); } const filename = parts[parts.length-1]; const fh = await dir.getFileHandle(filename, {create:true}); const w = await fh.createWritable(); await w.write(blob); await w.close(); return true; }

async function tryPickDirectoryWithFallback(){ if(!window.showDirectoryPicker) throw new Error('File System Access not supported'); try{ return await window.showDirectoryPicker(); }catch(e){ console.warn('picker failed', e); throw e; } }
async function enhancedChooseFolderHandler(){ const btn=document.getElementById('choose-folder'); if(btn) btn.disabled=true; try{ try{ const dir = await tryPickDirectoryWithFallback(); rootDirHandle = dir; await createSessionDir(); showToast('Dossier choisi: '+(rootDirHandle.name||'selected'),3000); setStatus('Dossier choisi pour sauvegarde'); }catch(pickErr){ console.warn('picker err', pickErr); const fallback = confirm('Sélection annulée ou non supportée. Créer un ZIP fallback ?'); if(!fallback){ setStatus('Choix dossier annulé'); } else { setStatus('Création ZIP fallback...'); const zip = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); const name=`marche_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`; downloadBlobWithName(zip, name); setStatus('ZIP créé'); showToast('ZIP créé et téléchargé',4000); } } } finally{ if(btn) btn.disabled=false; } }

// ---------- Service Worker cleanup request ----------
function requestSWCleanup(opts={maxTiles:12000, olderThanDays:7}){ if(!('serviceWorker' in navigator)) return; navigator.serviceWorker.ready.then(reg=>{ try{ reg.active.postMessage({type:'cleanup-tiles', maxTiles: opts.maxTiles, olderThanDays: opts.olderThanDays}); setStatus('Demande nettoyage envoyée au SW'); }catch(e){ console.warn('postMessage failed', e); } }).catch(e=>console.warn('sw ready err', e)); }

// ---------- Map, UI wiring ----------
let map, planLayer, orthoLayer, startMarker, selectedStartMarker=null, pwaPromptEvent=null, lastTilesCache={lat:null,lon:null,zmin:null,zmax:null,tiles:null,computedAt:null};
let rootDirHandle=null, sessionDirHandle=null;
let currentSession = { id:null, name:null, startedAt:null, autosaveIntervalHandle:null };

// init map
function initMap(){
  map = L.map('map', {preferCanvas:true}).setView([46.5,2.5],13);
  const planUrl='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const orthoUrl='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  planLayer = L.tileLayer(planUrl,{tileSize:256,maxZoom:18,attribution:'&copy; IGN / GéoPlateforme - Plan IGN v2',crossOrigin:true});
  orthoLayer = L.tileLayer(orthoUrl,{tileSize:256,maxZoom:18,attribution:'&copy; IGN / GéoPlateforme - Orthophotos',crossOrigin:true});
  planLayer.addTo(map);
  L.control.layers({"Plan IGN v2":planLayer,"Orthophoto IGN":orthoLayer}, null, {collapsed:false}).addTo(map);
  const tileUrlInput=document.getElementById('tile-url'); if(tileUrlInput) tileUrlInput.value = planUrl;
  map.on('click', e => {
    const lat=e.latlng.lat, lon=e.latlng.lng;
    const li=document.getElementById('lat'), lo=document.getElementById('lon');
    if(li) li.value = lat.toFixed(6); if(lo) lo.value = lon.toFixed(6);
    if(selectedStartMarker) selectedStartMarker.setLatLng([lat,lon]); else selectedStartMarker = L.marker([lat,lon],{opacity:0.9}).addTo(map).bindPopup('Point sélectionné (cliquer "Enregistrer point de départ")').openPopup();
    setStatus('Point sélectionné (cliquer "Enregistrer point de départ")');
  });
}

// ---------- DOMContentLoaded wiring (handlers for the two buttons fixed) ----------
document.addEventListener('DOMContentLoaded', ()=>{
  initMap();
  // controls
  const btnCompute = document.getElementById('compute-tiles');
  const btnDownload = document.getElementById('download-tiles');
  const btnChoose = document.getElementById('choose-folder');
  const btnClean = document.getElementById('clean-tiles-cache');
  const btnSave = document.getElementById('save-start');

  if(btnChoose) btnChoose.addEventListener('click', enhancedChooseFolderHandler);
  if(btnClean) btnClean.addEventListener('click', ()=>{ if(!confirm('Nettoyer le cache des tuiles ?')) return; requestSWCleanup({maxTiles:12000, olderThanDays:7}); setStatus('Demande nettoyage envoyée'); });

  // Compute tiles & estimation (fixed)
  if(btnCompute) btnCompute.addEventListener('click', async ()=>{
    const latEl=document.getElementById('lat'), lonEl=document.getElementById('lon');
    const zminEl=document.getElementById('zmin'), zmaxEl=document.getElementById('zmax');
    const tileEstimateDiv=document.getElementById('tile-estimate');
    const rawLat = (latEl && latEl.value) ? latEl.value.trim().replace(',','.') : '';
    const rawLon = (lonEl && lonEl.value) ? lonEl.value.trim().replace(',','.') : '';
    const lat=parseFloat(rawLat), lon=parseFloat(rawLon);
    if(Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides. Entrez ou sélectionnez un point.');
    let zmin = parseInt(zminEl.value)||13, zmax = parseInt(zmaxEl.value)||16;
    if(zmax>16){ zmax=16; zmaxEl.value=16; showToast('Zoom max limité à 16'); }
    setStatus('Calcul approximation instantanée...');
    const approx = quickEstimateTiles(lat,lon,10000,zmin,zmax);
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const approxMB = Math.round((approx*avgKB)/1024*10)/10;
    tileEstimateDiv.innerHTML = `<strong>≈ ${approx}</strong> tuiles — estimation ≈ <strong>${approxMB} MB</strong>. Calcul exact en cours...`;
    try {
      let lastUpdate = Date.now();
      const tiles = await listTilesAsync(lat,lon,10000,zmin,zmax,(p)=>{
        const now = Date.now();
        if(now - lastUpdate > 200 || p.done){
          if(p.done) tileEstimateDiv.innerHTML = `<strong>Exact:</strong> ${p.countSoFar} tuiles (zoom ${zmin}→${zmax}) — estimation ≈ <strong>${Math.round((p.countSoFar*avgKB)/1024*10)/10} MB</strong>.`;
          else tileEstimateDiv.innerHTML = `<strong>Exact (en cours):</strong> ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z||'-'})`;
          lastUpdate = now;
        }
      });
      lastTilesCache = {lat,lon,zmin,zmax,tiles,computedAt:Date.now()};
      setStatus('Calcul exact terminé');
      showToast(`Calcul exact: ${tiles.length} tuiles`,3000);
    } catch(e){ console.error(e); tileEstimateDiv.innerHTML = 'Erreur calcul exact: ' + (e.message||e); setStatus('Erreur'); }
  });

  // Download tiles (fixed): uses lastTilesCache if available or computes exact list
  if(btnDownload) btnDownload.addEventListener('click', async ()=>{
    const latEl=document.getElementById('lat'), lonEl=document.getElementById('lon');
    const zminEl=document.getElementById('zmin'), zmaxEl=document.getElementById('zmax');
    const tileUrlEl=document.getElementById('tile-url');
    const progressWrap=document.getElementById('download-progress');
    const progressBar=document.getElementById('progress-bar'), progressText=document.getElementById('progress-text');
    const tileEstimateDiv=document.getElementById('tile-estimate');

    const rawLat = (latEl && latEl.value) ? latEl.value.trim().replace(',','.') : '';
    const rawLon = (lonEl && lonEl.value) ? lonEl.value.trim().replace(',','.') : '';
    const lat=parseFloat(rawLat), lon=parseFloat(rawLon);
    if(Number.isNaN(lat) || Number.isNaN(lon)) return alert('Coordonnées invalides.');
    let zmin = parseInt(zminEl.value)||13, zmax = parseInt(zmaxEl.value)||16;
    if(zmax>16){ zmax=16; zmaxEl.value=16; showToast('Zoom max limité à 16'); }

    setStatus('Vérification du nombre de tuiles...');
    let tiles = null;
    if(lastTilesCache && lastTilesCache.lat===lat && lastTilesCache.lon===lon && lastTilesCache.zmin===zmin && lastTilesCache.zmax===zmax && lastTilesCache.tiles){
      tiles = lastTilesCache.tiles;
    } else {
      tileEstimateDiv.innerHTML = 'Calcul exact en cours (préparation)...';
      try {
        tiles = await listTilesAsync(lat,lon,10000,zmin,zmax,(p)=>{ tileEstimateDiv.innerHTML = `Calcul exact: ${p.countSoFar} / ~${p.totalEstimate} (zoom ${p.z||'-'})`; });
        lastTilesCache = {lat,lon,zmin,zmax,tiles,computedAt:Date.now()};
      } catch(e){ console.error(e); alert('Erreur lors du calcul des tuiles: ' + (e.message||e)); setStatus('Erreur'); return; }
    }

    const count = tiles.length;
    const avgKB = map && map.hasLayer && map.hasLayer(orthoLayer) ? 80 : 40;
    const mb = Math.round((count*avgKB)/1024*10)/10;
    const MAX_SAFE = 10000;
    if(count > MAX_SAFE){
      const user = prompt(`ATTENTION: ${count} tuiles (~${mb}MB). Tapez CONFIRM pour lancer`, '');
      if(user !== 'CONFIRM'){ setStatus('Téléchargement annulé'); showToast('Téléchargement annulé'); return; }
    } else {
      if(!confirm(`Télécharger ${count} tuiles (~${mb}MB) ?`)) { setStatus('Téléchargement annulé'); return; }
    }

    // show progress
    if(progressWrap) progressWrap.style.display='flex';
    if(progressBar) progressBar.value=0;
    if(progressText) progressText.textContent='';

    try {
      // ensure session dir if FS chosen
      if(rootDirHandle && !sessionDirHandle) await createSessionDir();
      if(!currentSession.id) startNewSessionForDownloadOnly();
      const tileUrlTemplate = (tileUrlEl && tileUrlEl.value) ? tileUrlEl.value.trim() : '';
      await downloadTilesAroundFromList(tiles, tileUrlTemplate, (p)=>{
        if(progressBar) progressBar.value = p.pct;
        if(progressText) progressText.textContent = `${p.count} / ${p.total} (${p.pct}%)`;
      });
      setStatus('Téléchargement terminé (cache mis à jour)');
      showToast(`Téléchargement terminé: ${count} tuiles`,5000);
      // notify SW to cleanup if desired
      requestSWCleanup({maxTiles:12000, olderThanDays:7});
    } catch(e){
      console.error(e); setStatus('Erreur téléchargement'); alert('Erreur téléchargement: ' + (e.message||e));
    } finally {
      if(progressWrap) progressWrap.style.display='none';
      if(progressBar) progressBar.value=0;
      if(progressText) progressText.textContent='';
    }
  });

  // other controls: choose folder, start/stop etc.
  const btnStart=document.getElementById('btn-start'), btnStop=document.getElementById('btn-stop');
  const btnPhoto=document.getElementById('btn-photo'), btnAudioStart=document.getElementById('btn-audio-start');
  const btnAudioStop=document.getElementById('btn-audio-stop');
  if(document.getElementById('choose-folder')) document.getElementById('choose-folder').addEventListener('click', enhancedChooseFolderHandler);
  if(btnStart) btnStart.addEventListener('click', ()=>startTracking(false));
  if(btnStop) btnStop.addEventListener('click', stopTracking);
  if(btnPhoto) btnPhoto.addEventListener('click', takePhoto);
  if(btnAudioStart) btnAudioStart.addEventListener('click', async ()=>{ try{ await startAudioRecording(); btnAudioStart.disabled=true; btnAudioStop.disabled=false; }catch(e){ alert(e.message||e); }});
  if(btnAudioStop) btnAudioStop.addEventListener('click', ()=>{ if(mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); document.getElementById('btn-audio-start').disabled=false; document.getElementById('btn-audio-stop').disabled=true; }});

  // sessions UI: refresh list
  const refreshBtn=document.getElementById('btn-refresh-sessions'), clearBtn=document.getElementById('btn-clear-sessions');
  if(refreshBtn) refreshBtn.addEventListener('click', async ()=>{ const el=document.getElementById('session-list'); el && (el.innerHTML=''); try{ const sessions = await idbListSessions(); if(!sessions || sessions.length===0){ el.innerHTML='<div style="color:#666">Aucune session</div>'; return; } sessions.sort((a,b)=> (b.createdAt||b.updatedAt||0)-(a.createdAt||a.updatedAt||0)); for(const s of sessions){ const div=document.createElement('div'); div.style.borderBottom='1px solid #f0f0f0'; div.style.padding='6px 2px'; const name=s.name||('session_'+s.id); const created=new Date(s.createdAt).toLocaleString(); div.innerHTML=`<div style="font-weight:600">${name}</div><div style="font-size:0.85rem;color:#444">créée: ${created} — pts: ${s.trackCoords? s.trackCoords.length:0}</div>`; const r=document.createElement('button'); r.textContent='Reprendre'; r.className='btn'; r.style.background='#d6f5d6'; r.onclick=()=>resumeSession(s.id); const del=document.createElement('button'); del.textContent='Supprimer'; del.className='btn'; del.style.background='#ffecec'; del.style.marginLeft='8px'; del.onclick=async ()=>{ if(!confirm('Supprimer ?')) return; await idbDeleteSession(s.id); refreshBtn.click(); }; const zip=document.createElement('button'); zip.textContent='Exporter ZIP'; zip.className='btn'; zip.style.background='#e8f6ff'; zip.style.marginLeft='8px'; zip.onclick=async ()=>{ setStatus('Préparation ZIP...'); const sd = await idbGetSession(s.id); const oldT=trackCoords, oldW=waypoints; trackCoords = sd.trackCoords||[]; waypoints = sd.waypoints||[]; const b = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); downloadBlobWithName(b, `${s.name||s.id}.zip`); trackCoords=oldT; waypoints=oldW; setStatus('ZIP prêt'); }; const btns=document.createElement('div'); btns.style.marginTop='6px'; btns.appendChild(r); btns.appendChild(del); btns.appendChild(zip); div.appendChild(btns); el.appendChild(div); } }catch(e){ console.error(e); el.innerHTML='<div style="color:#900">Erreur</div>'; }});
  if(clearBtn) clearBtn.addEventListener('click', async ()=>{ if(!confirm('Supprimer toutes les sessions ?')) return; await idbClearAllSessions(); refreshBtn && refreshBtn.click(); });

  // initial UI actions
  refreshBtn && refreshBtn.click();
  // ask SW cleanup and maybe auto purge sessions
  requestSWCleanup({maxTiles:12000, olderThanDays:7});
  maybeAutoPurgeSessions();
  window.addEventListener('focus', ()=>{ maybeAutoPurgeSessions(); requestSWCleanup({maxTiles:12000, olderThanDays:7}); });

}); // DOMContentLoaded end

// ---------- recording / autosave / sessions (core) ----------
let tracking=false, watchId=null, trackCoords=[], waypoints=[], mediaRecorder=null, recordedChunks=[];

function startNewSessionForRecording(){ if(!currentSession.id){ currentSession.id=`s_${Date.now()}`; currentSession.name=nowFolderName(); currentSession.startedAt=Date.now(); } idbSaveSession({ id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt||Date.now(), startedAt: currentSession.startedAt, trackCoords: trackCoords||[], waypoints: waypoints||[] }).catch(e=>console.warn('idb save err', e)); }

function startAutosave(){ stopAutosave(); currentSession.autosaveIntervalHandle = setInterval(async ()=>{ try{ if(!currentSession.id) startNewSessionForRecording(); const sObj={ id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt||Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints }; await idbSaveSession(sObj); if(sessionDirHandle){ const gpx = generateGPX(trackCoords); const blob = new Blob([gpx], {type:'application/gpx+xml'}); await writeFileToSession(`traces/autosave_${new Date().toISOString().replace(/[:.]/g,'-')}.gpx`, blob).catch(()=>{}); } showToast(`Autosave ${currentSession.name}: ${trackCoords.length} pts`, 1500); }catch(e){ console.warn('autosave err', e); } }, 60*1000); }
function stopAutosave(){ if(currentSession && currentSession.autosaveIntervalHandle){ clearInterval(currentSession.autosaveIntervalHandle); currentSession.autosaveIntervalHandle=null; } }

async function resumeSession(id){ try{ const s = await idbGetSession(id); if(!s) return alert('Session introuvable'); trackCoords = s.trackCoords || []; waypoints = s.waypoints || []; currentSession.id = s.id; currentSession.name = s.name || (`session_${new Date(s.createdAt).toISOString().replace(/[:.]/g,'-')}`); currentSession.startedAt = s.startedAt || s.createdAt || Date.now(); if(trackCoords.length>0){ const last=trackCoords[trackCoords.length-1]; map.setView([last.lat,last.lon],16); } startTracking(true); showToast(`Session ${currentSession.name} reprise`, 3000); }catch(e){ console.error(e); alert('Impossible de reprendre: '+(e.message||e)); } }

function startTracking(resuming=false){ if(tracking) return; if(!('geolocation' in navigator)) return alert('Géolocalisation non supportée'); if(!resuming){ trackCoords=[]; waypoints=[]; currentSession.id=null; currentSession.name=null; currentSession.startedAt=Date.now(); } if(!currentSession.id){ currentSession.id = `s_${Date.now()}`; currentSession.name = nowFolderName(); currentSession.startedAt = Date.now(); } startNewSessionForRecording(); const options={enableHighAccuracy:true, maximumAge:1000, timeout:5000}; watchId = navigator.geolocation.watchPosition(onPosition, onPosError, options); tracking=true; setStatus('Enregistrement en cours'); startAutosave(); }
function onPosition(pos){ const lat=pos.coords.latitude, lon=pos.coords.longitude, ts=pos.timestamp; trackCoords.push({lat,lon,ts}); if(!window.trackPolyline) window.trackPolyline = L.polyline([], {color:'red'}).addTo(map); window.trackPolyline.addLatLng([lat,lon]); if(!window.currentMarker) window.currentMarker = L.circleMarker([lat,lon], {radius:6, color:'blue'}).addTo(map); else window.currentMarker.setLatLng([lat,lon]); }
function onPosError(err){ console.warn('geoloc err', err); }

async function stopTracking(){ if(!tracking) return; navigator.geolocation.clearWatch(watchId); tracking=false; stopAutosave(); setStatus('Enregistrement stoppé — préparation exports'); if(trackCoords.length===0) return alert('Aucune donnée'); if(!currentSession.id){ currentSession.id=`s_${Date.now()}`; currentSession.name=nowFolderName(); currentSession.startedAt=Date.now(); } const sObj={ id: currentSession.id, name: currentSession.name, createdAt: currentSession.createdAt||Date.now(), startedAt: currentSession.startedAt, trackCoords, waypoints, finalizedAt: Date.now() }; await idbSaveSession(sObj).catch(e=>console.warn('idb save final err', e)); const gpx=generateGPX(trackCoords), kml=generateKML(trackCoords); const ts=new Date().toISOString().replace(/[:.]/g,'-'); const gpxName=`${currentSession.name}_trace_${ts}.gpx`, kmlName=`${currentSession.name}_trace_${ts}.kml`; const gpxBlob=new Blob([gpx],{type:'application/gpx+xml'}), kmlBlob=new Blob([kml],{type:'application/vnd.google-earth.kml+xml'}); if(sessionDirHandle){ await writeFileToSession(`traces/${gpxName}`, gpxBlob).catch(()=>{}); await writeFileToSession(`traces/${kmlName}`, kmlBlob).catch(()=>{}); showToast(`Traces écrites dans ${sessionDirHandle.name}/traces`, 4000); } else { try{ const wantZip = confirm('Dossier local non configuré. Télécharger un ZIP de session ?'); if(wantZip){ setStatus('Création ZIP session...'); const zip = await createZipFromCacheAndMemory({includeTiles:true, includeTraces:true, includeMedia:true}); downloadBlobWithName(zip, `${currentSession.name}.zip`); showToast('ZIP session téléchargé', 4000); } else { downloadBlobWithName(gpxBlob, gpxName); downloadBlobWithName(kmlBlob, kmlName); showToast('Traces téléchargées', 3000); } }catch(e){ console.error('zip err', e); downloadBlobWithName(gpxBlob, gpxName); downloadBlobWithName(kmlBlob, kmlName); showToast('Traces téléchargées', 3000); } } currentSession.id=null; currentSession.name=null; currentSession.startedAt=null; setStatus('Exports prêts'); if(document.getElementById('btn-refresh-sessions')) document.getElementById('btn-refresh-sessions').click(); maybeAutoPurgeSessions(); }

// ---------- end of file ----------