/* ═══════════════════════════════════════════════════════════
   Circuit IGN v11 — Baguette magique + pipeline ZS + greedy
   ═══════════════════════════════════════════════════════════ */
'use strict';

let imgEl=null,imgW=0,imgH=0,imgPixels=null,selMask=null;
let gcps=[],pickState=null,currentTool='wand';
let wandScale=1,wandOX=0,wandOY=0,isPanning=false,panStart=null,panOrigin=null;
let gpxContent='',kmlContent='',extractedPts=[];
let map=null,jpgMap=null,mapInited=false;
let leafletMarkers=[],jpgMarkers=[];
// Couleur de l'overlay de sélection (jaune fluo par défaut)
let overlayR=255,overlayG=230,overlayB=0,overlayA=200;
const GCP_COLORS=['#e03030','#1060c8','#207830','#e87820'];
const GCP_LETTERS=['A','B','C','D'];

function setOverlayColor(btn){
  overlayR=parseInt(btn.dataset.r); overlayG=parseInt(btn.dataset.g); overlayB=parseInt(btn.dataset.b);
  document.querySelectorAll('.ov-swatch').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  redrawWand();
}

/* ── Navigation ── */
function goStep(n){
  document.querySelectorAll('.panel').forEach((p,i)=>p.classList.toggle('active',i===n));
  document.querySelectorAll('.step').forEach((s,i)=>{s.classList.toggle('active',i===n);s.classList.toggle('done',i<n);});
  if(n===1)initMap();
  if(n===2)initWand();
}

/* ── Import image ── */
const dz=document.getElementById('dz');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])loadImg(e.dataTransfer.files[0]);});
document.getElementById('file-inp').addEventListener('change',e=>{if(e.target.files[0])loadImg(e.target.files[0]);});

function loadImg(file){
  const fr=new FileReader();
  fr.onload=ev=>{
    imgEl=new Image();
    imgEl.onload=()=>{
      imgW=imgEl.width;imgH=imgEl.height;
      const tmp=document.createElement('canvas');tmp.width=imgW;tmp.height=imgH;
      tmp.getContext('2d').drawImage(imgEl,0,0);
      imgPixels=tmp.getContext('2d').getImageData(0,0,imgW,imgH);
      selMask=new Uint8Array(imgW*imgH);
      document.getElementById('thumb').src=ev.target.result;
      document.getElementById('thumb-wrap').style.display='block';
      document.getElementById('thumb-meta').textContent=`${file.name} — ${imgW}×${imgH}px — ${(file.size/1024).toFixed(0)}Ko`;
      document.getElementById('btn01').disabled=false;
    };
    imgEl.src=ev.target.result;
  };
  fr.readAsDataURL(file);
}

/* ── Géoréférencement ── */
function initMap(){
  if(mapInited)return;mapInited=true;
  map=L.map('leaflet-map',{center:[49.44,0.25],zoom:13});
  L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',{attribution:'© IGN',maxZoom:18}).addTo(map);
  const ov=document.createElement('div');ov.id='map-pick-overlay';map.getContainer().appendChild(ov);
  jpgMap=L.map('jpg-map',{crs:L.CRS.Simple,minZoom:-3,maxZoom:5,zoomSnap:0.25,attributionControl:false});
  L.imageOverlay(imgEl.src,[[0,0],[imgH,imgW]]).addTo(jpgMap);
  jpgMap.fitBounds([[0,0],[imgH,imgW]]);
  const ovL=document.createElement('div');ovL.id='jpg-pick-overlay';jpgMap.getContainer().appendChild(ovL);
}
function mkIcon(i){return L.divIcon({className:'',html:`<div style="width:22px;height:22px;border-radius:50%;background:${GCP_COLORS[i]};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:bold 10px sans-serif;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${GCP_LETTERS[i]}</div>`,iconSize:[22,22],iconAnchor:[11,11]});}
function addJpgMarker(i){const g=gcps[i];if(g.px===null)return;if(jpgMarkers[i])jpgMap.removeLayer(jpgMarkers[i]);jpgMarkers[i]=L.marker(L.latLng(imgH-g.py,g.px),{icon:mkIcon(i)}).addTo(jpgMap);}
function addMapMarker(i){const g=gcps[i];if(g.lat===null)return;if(leafletMarkers[i])map.removeLayer(leafletMarkers[i]);leafletMarkers[i]=L.marker([g.lat,g.lon],{icon:mkIcon(i)}).addTo(map);}
function enableOv(id,fn){const o=document.getElementById(id);o.removeEventListener('click',fn);o.style.cssText='display:block;position:absolute;inset:0;z-index:9999;cursor:crosshair;background:rgba(0,0,0,0.01);pointer-events:all';o.addEventListener('click',fn,{once:true});}
function disableOv(id,fn){const o=document.getElementById(id);if(o){o.style.cssText='display:none;pointer-events:none';o.removeEventListener('click',fn);}}
function startGCP(){if(gcps.length>=4){alert('4 points max');return;}gcps.push({px:null,py:null,lat:null,lon:null});renderGCPTable();beginPickJpg(gcps.length-1);}
function beginPickJpg(idx){pickState={step:'jpg',idx};document.getElementById('jpg-hint').style.display='block';document.getElementById('hint-ltr').textContent=GCP_LETTERS[idx];enableOv('jpg-pick-overlay',onJpgClick);}
function onJpgClick(e){
  disableOv('jpg-pick-overlay',onJpgClick);if(!pickState||pickState.step!=='jpg')return;
  const r=jpgMap.getContainer().getBoundingClientRect();const ll=jpgMap.containerPointToLatLng(L.point(e.clientX-r.left,e.clientY-r.top));
  const idx=pickState.idx;gcps[idx].px=Math.round(Math.max(0,Math.min(imgW,ll.lng)));gcps[idx].py=Math.round(Math.max(0,Math.min(imgH,imgH-ll.lat)));
  pickState.step='map';document.getElementById('jpg-hint').style.display='none';document.getElementById('map-hint').style.display='block';document.getElementById('hint-ltr2').textContent=GCP_LETTERS[idx];
  addJpgMarker(idx);renderGCPTable();enableOv('map-pick-overlay',onMapClick);
}
function onMapClick(e){
  disableOv('map-pick-overlay',onMapClick);if(!pickState||pickState.step!=='map')return;
  const r=map.getContainer().getBoundingClientRect();const ll=map.containerPointToLatLng(L.point(e.clientX-r.left,e.clientY-r.top));
  const idx=pickState.idx;gcps[idx].lat=ll.lat;gcps[idx].lon=ll.lng;pickState=null;
  document.getElementById('map-hint').style.display='none';addMapMarker(idx);renderGCPTable();checkGCPReady();
}
function renderGCPTable(){
  const tb=document.getElementById('gcp-body');tb.innerHTML='';
  gcps.forEach((g,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><span class="gcp-dot" style="background:${GCP_COLORS[i]}"></span></td><td><strong>${GCP_LETTERS[i]}</strong></td><td style="font-family:monospace;font-size:.78rem">${g.px!==null?g.px+','+g.py:'<em style="color:#aaa">image</em>'}</td><td style="font-family:monospace;font-size:.78rem">${g.lat!==null?g.lat.toFixed(5)+','+g.lon.toFixed(5):'<em style="color:#aaa">carte</em>'}</td><td><button class="gcp-del" onclick="delGCP(${i})">✕</button></td>`;tb.appendChild(tr);});
}
function delGCP(i){gcps.splice(i,1);if(leafletMarkers[i]){map.removeLayer(leafletMarkers[i]);leafletMarkers.splice(i,1);}if(jpgMarkers[i]){jpgMap.removeLayer(jpgMarkers[i]);jpgMarkers.splice(i,1);}if(pickState){if(pickState.step==='map')disableOv('map-pick-overlay',onMapClick);if(pickState.step==='jpg')disableOv('jpg-pick-overlay',onJpgClick);pickState=null;}['jpg-hint','map-hint'].forEach(id=>document.getElementById(id).style.display='none');renderGCPTable();checkGCPReady();}
function checkGCPReady(){document.getElementById('btn12').disabled=gcps.filter(g=>g.px!==null&&g.lat!==null).length<2;}

/* ── Baguette magique ── */
let wandInited=false;

function setTool(t){
  currentTool=t;
  document.getElementById('btn-wand').classList.toggle('active',t==='wand');
  document.getElementById('btn-erase').classList.toggle('active',t==='erase');
  document.getElementById('wand-canvas').style.cursor=t==='erase'?'cell':'crosshair';
}

function initWand(){
  if(wandInited||!imgEl)return;wandInited=true;
  const c=document.getElementById('wand-canvas');
  const wrap=document.getElementById('wand-canvas-wrap');
  const maxW=wrap.clientWidth||800;
  wandScale=Math.min(1,maxW/imgW);
  c.width=Math.round(imgW*wandScale);c.height=Math.round(imgH*wandScale);
  c.style.width=c.width+'px';c.style.height=c.height+'px';
  redrawWand();
  c.addEventListener('mousedown',onWandDown);
  c.addEventListener('mousemove',onWandMove);
  c.addEventListener('mouseup',()=>{isPanning=false;});
  c.addEventListener('mouseleave',()=>{document.getElementById('wand-loupe').style.display='none';});
  c.addEventListener('wheel',onWandWheel,{passive:false});
  c.addEventListener('contextmenu',e=>e.preventDefault());
}

function cxy(e){const r=document.getElementById('wand-canvas').getBoundingClientRect();return{sx:e.clientX-r.left,sy:e.clientY-r.top};}
function s2i(sx,sy){return{ix:Math.round((sx-wandOX)/wandScale),iy:Math.round((sy-wandOY)/wandScale)};}

function onWandWheel(e){
  e.preventDefault();
  const{sx,sy}=cxy(e);const f=e.deltaY<0?1.18:1/1.18;
  const ns=Math.max(0.08,Math.min(30,wandScale*f));
  wandOX=sx-(sx-wandOX)*(ns/wandScale);wandOY=sy-(sy-wandOY)*(ns/wandScale);
  wandScale=ns;redrawWand();
}

function onWandDown(e){
  if(e.button===1||e.button===2){isPanning=true;panStart={x:e.clientX,y:e.clientY};panOrigin={ox:wandOX,oy:wandOY};e.preventDefault();return;}
  const{sx,sy}=cxy(e);const{ix,iy}=s2i(sx,sy);
  if(ix<0||ix>=imgW||iy<0||iy>=imgH)return;
  const tol=parseInt(document.getElementById('wand-tol').value);
  const mode=document.getElementById('wand-mode').value;
  if(currentTool==='erase'){applyRegion(ix,iy,tol,mode,'sub');}
  else{
    const op=e.shiftKey?'add':e.altKey||e.metaKey?'sub':'replace';
    applyRegion(ix,iy,tol,mode,op);
  }
  redrawWand();updateSelStats();
}

function onWandMove(e){
  if(isPanning){wandOX=panOrigin.ox+(e.clientX-panStart.x);wandOY=panOrigin.oy+(e.clientY-panStart.y);redrawWand();return;}
  showLoupe(e);
  if(e.buttons===1&&currentTool==='erase'){const{sx,sy}=cxy(e);const{ix,iy}=s2i(sx,sy);if(ix>=0&&ix<imgW&&iy>=0&&iy<imgH){applyRegion(ix,iy,parseInt(document.getElementById('wand-tol').value),document.getElementById('wand-mode').value,'sub');redrawWand();updateSelStats();}}
}

function showLoupe(e){
  const{sx,sy}=cxy(e);const{ix,iy}=s2i(sx,sy);
  if(ix<0||ix>=imgW||iy<0||iy>=imgH){document.getElementById('wand-loupe').style.display='none';return;}
  const lc=document.getElementById('loupe-canvas');const lctx=lc.getContext('2d');
  const ZR=12*wandScale;
  lctx.imageSmoothingEnabled=false;lctx.clearRect(0,0,80,80);
  lctx.drawImage(document.getElementById('wand-canvas'),sx-ZR,sy-ZR,ZR*2,ZR*2,0,0,80,80);
  lctx.strokeStyle='rgba(255,255,255,.8)';lctx.lineWidth=1;
  lctx.beginPath();lctx.moveTo(40,0);lctx.lineTo(40,80);lctx.stroke();
  lctx.beginPath();lctx.moveTo(0,40);lctx.lineTo(80,40);lctx.stroke();
  const d=imgPixels.data,pi=(iy*imgW+ix)*4;
  document.getElementById('loupe-color').style.background=rgbToHex(d[pi],d[pi+1],d[pi+2]);
  const cr=document.getElementById('wand-canvas').getBoundingClientRect();
  let lx=(e.clientX-cr.left)+18,ly=(e.clientY-cr.top)+18;
  if(lx+100>cr.width)lx=(e.clientX-cr.left)-108;
  if(ly+100>cr.height)ly=(e.clientY-cr.top)-108;
  const loupe=document.getElementById('wand-loupe');loupe.style.left=lx+'px';loupe.style.top=ly+'px';loupe.style.display='block';
}

function applyRegion(ix,iy,tol,mode,op){
  const seed=(iy*imgW+ix)*4,d=imgPixels.data;
  const region=mode==='flood'?floodFill(ix,iy,d[seed],d[seed+1],d[seed+2],tol):globalSelect(d[seed],d[seed+1],d[seed+2],tol);
  if(op==='sub'){for(let i=0;i<selMask.length;i++)if(region[i])selMask[i]=0;}
  else if(op==='add'){for(let i=0;i<selMask.length;i++)if(region[i])selMask[i]=1;}
  else{// replace : effacer puis ajouter
    selMask.fill(0);for(let i=0;i<selMask.length;i++)if(region[i])selMask[i]=1;
  }
}

function floodFill(sx,sy,sr,sg,sb,tol){
  const res=new Uint8Array(imgW*imgH),vis=new Uint8Array(imgW*imgH),d=imgPixels.data,t2=tol*tol;
  const q=[sy*imgW+sx];vis[sy*imgW+sx]=1;
  while(q.length){
    const idx=q.pop(),x=idx%imgW,y=(idx/imgW)|0,pi=idx*4;
    const dr=d[pi]-sr,dg=d[pi+1]-sg,db=d[pi+2]-sb;
    if(dr*dr+dg*dg+db*db>t2)continue;
    res[idx]=1;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=imgW||ny<0||ny>=imgH)continue;const ni=ny*imgW+nx;if(!vis[ni]){vis[ni]=1;q.push(ni);}}
  }
  return res;
}

function globalSelect(sr,sg,sb,tol){
  const res=new Uint8Array(imgW*imgH),d=imgPixels.data,t2=tol*tol;
  for(let i=0;i<imgW*imgH;i++){const pi=i*4,dr=d[pi]-sr,dg=d[pi+1]-sg,db=d[pi+2]-sb;if(dr*dr+dg*dg+db*db<=t2)res[i]=1;}
  return res;
}

function clearSelection(){selMask.fill(0);redrawWand();updateSelStats();}
function updateSelStats(){let c=0;for(let i=0;i<selMask.length;i++)if(selMask[i])c++;document.getElementById('sel-stats').textContent=`${c.toLocaleString()} px sélectionnés`;}

function redrawWand(){
  const c=document.getElementById('wand-canvas'),ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.save();ctx.translate(wandOX,wandOY);ctx.scale(wandScale,wandScale);
  ctx.drawImage(imgEl,0,0);
  // Overlay sélection
  const tmp=document.createElement('canvas');tmp.width=imgW;tmp.height=imgH;
  const id=tmp.getContext('2d').createImageData(imgW,imgH);
  for(let i=0;i<imgW*imgH;i++)if(selMask[i]){id.data[i*4]=overlayR;id.data[i*4+1]=overlayG;id.data[i*4+2]=overlayB;id.data[i*4+3]=overlayA;}
  tmp.getContext('2d').putImageData(id,0,0);
  ctx.drawImage(tmp,0,0);
  ctx.restore();
}

/* ── Extraction ── */
async function runExtraction(){
  goStep(3);
  document.getElementById('result-block').style.display='none';
  document.getElementById('res-nav').style.display='none';
  document.getElementById('log-area').textContent='';
  const W=imgW,H=imgH;
  let cnt=0;for(let i=0;i<selMask.length;i++)if(selMask[i])cnt++;
  logMsg(`Pixels sélectionnés : ${cnt.toLocaleString()}`);
  if(cnt<10){setP(100,'⚠ Sélection vide. Cliquez sur le tracé avec la baguette.');return;}

  setP(10,'Préparation…');await dl(20);
  const morpho=parseInt(document.getElementById('morpho').value);
  let mask=morpho>0?dilate(selMask,W,H,morpho):new Uint8Array(selMask);

  setP(35,'Squelettisation…');await dl(40);
  const sk=thinZS(mask,W,H);
  let skc=0;for(let i=0;i<sk.length;i++)if(sk[i])skc++;
  logMsg(`Squelette : ${skc.toLocaleString()} px`);
  if(skc<2){setP(100,'⚠ Squelette vide.');return;}

  setP(60,'Chaînage…');await dl(20);
  const chain=chainGreedy(sk,W,H);
  logMsg(`Chaîne : ${chain.length} pts`);
  if(chain.length<2){setP(100,'⚠ Chaîne vide. Essayez "Fermeture des gaps".');return;}

  setP(78,'Simplification…');await dl(10);
  const eps=parseInt(document.getElementById('simplify').value);
  let pts=chain;
  if(eps>0&&pts.length>5){pts=rdp(pts,eps);logMsg(`RDP ε=${eps}: ${chain.length}→${pts.length}`);}

  setP(90,'Géoréférencement…');await dl(10);
  extractedPts=pts.map(([x,y])=>pixToLatLon(x,y));
  const name=document.getElementById('track-name').value||'Circuit IGN';
  gpxContent=buildGPX(extractedPts,name);kmlContent=buildKML(extractedPts,name);
  const dist=geoDist(extractedPts);

  setP(97,'Rendu…');await dl(20);
  renderResult(pts,mask,W,H);
  document.getElementById('s-pts').textContent=pts.length.toLocaleString();
  document.getElementById('s-dist').textContent=dist.toFixed(1)+' km';
  document.getElementById('s-px').textContent=cnt.toLocaleString();
  buildDownloadButtons();
  document.getElementById('result-block').style.display='block';
  document.getElementById('res-nav').style.display='flex';
  setP(100,`✓ ${pts.length} points — ${dist.toFixed(1)} km`);
  logMsg('✓ Terminé.');
}

/* ── Algorithmes image ── */
function dilate(m,W,H,r){const o=new Uint8Array(W*H);for(let y=r;y<H-r;y++)for(let x=r;x<W-r;x++){if(!m[y*W+x])continue;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)o[(y+dy)*W+(x+dx)]=1;}return o;}

function thinZS(mask,W,H){
  const out=new Uint8Array(mask),del=new Uint8Array(W*H);let changed=true,iter=0;
  while(changed&&iter<200){changed=false;iter++;
    del.fill(0);
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(!out[i])continue;
      const p2=out[(y-1)*W+x],p3=out[(y-1)*W+x+1],p4=out[y*W+x+1],p5=out[(y+1)*W+x+1],p6=out[(y+1)*W+x],p7=out[(y+1)*W+x-1],p8=out[y*W+x-1],p9=out[(y-1)*W+x-1];
      const B=p2+p3+p4+p5+p6+p7+p8+p9;if(B<2||B>6)continue;
      let A=0;if(!p2&&p3)A++;if(!p3&&p4)A++;if(!p4&&p5)A++;if(!p5&&p6)A++;if(!p6&&p7)A++;if(!p7&&p8)A++;if(!p8&&p9)A++;if(!p9&&p2)A++;
      if(A!==1)continue;if(p2*p4*p6!==0)continue;if(p4*p6*p8!==0)continue;del[i]=1;}
    for(let i=0;i<out.length;i++)if(del[i]){out[i]=0;changed=true;}
    del.fill(0);
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(!out[i])continue;
      const p2=out[(y-1)*W+x],p3=out[(y-1)*W+x+1],p4=out[y*W+x+1],p5=out[(y+1)*W+x+1],p6=out[(y+1)*W+x],p7=out[(y+1)*W+x-1],p8=out[y*W+x-1],p9=out[(y-1)*W+x-1];
      const B=p2+p3+p4+p5+p6+p7+p8+p9;if(B<2||B>6)continue;
      let A=0;if(!p2&&p3)A++;if(!p3&&p4)A++;if(!p4&&p5)A++;if(!p5&&p6)A++;if(!p6&&p7)A++;if(!p7&&p8)A++;if(!p8&&p9)A++;if(!p9&&p2)A++;
      if(A!==1)continue;if(p2*p4*p8!==0)continue;if(p2*p6*p8!==0)continue;del[i]=1;}
    for(let i=0;i<out.length;i++)if(del[i]){out[i]=0;changed=true;}
  }return out;
}

function chainGreedy(sk,W,H){
  const d8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

  function nb(idx){
    const x=idx%W,y=(idx/W)|0,r=[];
    for(const[dy,dx]of d8){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<W&&ny>=0&&ny<H&&sk[ny*W+nx])r.push(ny*W+nx);}
    return r;
  }

  // ── Étape 1 : collecter tous les pixels du squelette ─────────────────────
  // (pas de découpage en segments — on travaille directement sur les pixels)
  const allPx=[];
  for(let i=0;i<sk.length;i++) if(sk[i]) allPx.push(i);
  if(!allPx.length) return[];
  logMsg(`Pixels squelette : ${allPx.length}`);

  // ── Étape 2 : chaînage pixel par pixel avec saut de gap ──────────────────
  // On part d'une extrémité (degré 1), on suit les voisins immédiats 8-connexes
  // en priorité, et quand on est bloqué on cherche le pixel non visité
  // le plus proche dans un rayon croissant (pour franchir les gaps).
  // Cette approche garantit qu'aucun pixel n'est visité deux fois.

  // Trouver le meilleur point de départ : extrémité (degré 1) la plus isolée
  let startIdx=-1;
  for(let i=0;i<sk.length;i++){
    if(sk[i]&&nb(i).length===1){startIdx=i;break;}
  }
  if(startIdx<0) startIdx=allPx[0];

  const visited=new Uint8Array(sk.length);
  const chain=[];
  let cur=startIdx;
  let gapJumps=0;

  // Index spatial pour trouver rapidement le pixel non visité le plus proche
  // Structure : grille de cellules de CELL_SIZE pixels
  const CELL=20;
  const GW=Math.ceil(W/CELL), GH=Math.ceil(H/CELL);
  const grid=new Array(GW*GH).fill(null).map(()=>[]);
  for(const idx of allPx){
    const gx=Math.floor((idx%W)/CELL), gy=Math.floor(((idx/W)|0)/CELL);
    grid[gy*GW+gx].push(idx);
  }
  function removeFromGrid(idx){
    const gx=Math.floor((idx%W)/CELL),gy=Math.floor(((idx/W)|0)/CELL);
    const cell=grid[gy*GW+gx];
    const i=cell.indexOf(idx);if(i>=0)cell.splice(i,1);
  }
  function nearestUnvisited(cx,cy,maxR){
    // Cherche dans des anneaux de cellules de rayon croissant
    const maxCells=Math.ceil(maxR/CELL)+1;
    let best=-1,bestD=Infinity;
    for(let cr=0;cr<=maxCells&&bestD>cr*CELL*cr*CELL;cr++){
      const gcx=Math.floor(cx/CELL),gcy=Math.floor(cy/CELL);
      for(let dgy=-cr;dgy<=cr;dgy++) for(let dgx=-cr;dgx<=cr;dgx++){
        if(Math.abs(dgx)<cr&&Math.abs(dgy)<cr) continue; // anneau seulement
        const nx=gcx+dgx,ny=gcy+dgy;
        if(nx<0||nx>=GW||ny<0||ny>=GH) continue;
        for(const idx of grid[ny*GW+nx]){
          if(visited[idx]) continue;
          const dx=(idx%W)-cx,dy=((idx/W)|0)-cy;
          const d=dx*dx+dy*dy;
          if(d<bestD){bestD=d;best=idx;}
        }
      }
      if(best>=0&&bestD<=(cr*CELL)**2) break;
    }
    return{idx:best,dist:Math.sqrt(bestD)};
  }

  const MAX_GAP=120; // pixels — gap max autorisé entre deux fragments

  while(cur>=0){
    visited[cur]=1;
    removeFromGrid(cur);
    chain.push([cur%W,(cur/W)|0]);

    // 1. Chercher un voisin 8-connexe direct non visité
    const immediate=nb(cur).filter(n=>!visited[n]);

    if(immediate.length>0){
      // Parmi les voisins immédiats, préférer la direction qui prolonge
      if(chain.length>=2){
        const prev=chain[chain.length-2],curr=chain[chain.length-1];
        const ddx=curr[0]-prev[0],ddy=curr[1]-prev[1];
        immediate.sort((a,b)=>{
          const ax=(a%W)-curr[0],ay=((a/W)|0)-curr[1];
          const bx=(b%W)-curr[0],by=((b/W)|0)-curr[1];
          return(bx*ddx+by*ddy)-(ax*ddx+ay*ddy);
        });
      }
      cur=immediate[0];
    } else {
      // 2. Plus de voisin direct → chercher le plus proche dans MAX_GAP
      const cx=cur%W,cy=(cur/W)|0;
      const{idx:next,dist}=nearestUnvisited(cx,cy,MAX_GAP);
      if(next<0||dist>MAX_GAP){break;} // fin du tracé
      gapJumps++;
      cur=next;
    }
  }

  if(gapJumps>0) logMsg(`Gaps franchis : ${gapJumps}`);

  // Vérifier s'il reste des pixels non visités significatifs
  let remaining=0;
  for(const idx of allPx) if(!visited[idx]) remaining++;
  if(remaining>10) logMsg(`⚠ ${remaining} px non reliés — augmentez "Fermeture des gaps"`);

  return chain;
}

function pixToLatLon(px,py){
  const v=gcps.filter(g=>g.px!==null&&g.lat!==null);
  if(!v.length)return{lat:0,lon:0};if(v.length===1)return{lat:v[0].lat,lon:v[0].lon};
  if(v.length===2){const g0=v[0],g1=v[1],dpx=g1.px-g0.px||1e-9,dpy=g1.py-g0.py||1e-9;return{lat:g0.lat+(py-g0.py)*(g1.lat-g0.lat)/dpy,lon:g0.lon+(px-g0.px)*(g1.lon-g0.lon)/dpx};}
  const n=v.length;let sx=0,sy=0,sxx=0,sxy=0,syy=0,sLat=0,sLon=0,sxLat=0,syLat=0,sxLon=0,syLon=0;
  for(const g of v){sx+=g.px;sy+=g.py;sxx+=g.px*g.px;sxy+=g.px*g.py;syy+=g.py*g.py;sLat+=g.lat;sLon+=g.lon;sxLat+=g.px*g.lat;syLat+=g.py*g.lat;sxLon+=g.px*g.lon;syLon+=g.py*g.lon;}
  const A=[[n,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]];
  const cLat=s3(A,[sLat,sxLat,syLat]),cLon=s3(A,[sLon,sxLon,syLon]);
  return{lat:cLat[0]+cLat[1]*px+cLat[2]*py,lon:cLon[0]+cLon[1]*px+cLon[2]*py};
}
function s3(A,b){const d=d3(A);if(Math.abs(d)<1e-12)return[0,0,0];return[0,1,2].map(j=>d3(A.map((row,i)=>row.map((v,k)=>k===j?b[i]:v)))/d);}
function d3(m){return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);}

function rdp(pts,eps){
  if(pts.length<3)return pts;
  const[x1,y1]=pts[0],[x2,y2]=pts[pts.length-1],dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1;
  let maxD=0,idx=0;
  for(let i=1;i<pts.length-1;i++){const d=Math.abs(dy*pts[i][0]-dx*pts[i][1]+x2*y1-y2*x1)/len;if(d>maxD){maxD=d;idx=i;}}
  if(maxD>eps)return[...rdp(pts.slice(0,idx+1),eps),...rdp(pts.slice(idx),eps).slice(1)];
  return[pts[0],pts[pts.length-1]];
}

function geoDist(pts){let d=0;const R=6371;for(let i=1;i<pts.length;i++){const dLat=(pts[i].lat-pts[i-1].lat)*Math.PI/180,dLon=(pts[i].lon-pts[i-1].lon)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(pts[i-1].lat*Math.PI/180)*Math.cos(pts[i].lat*Math.PI/180)*Math.sin(dLon/2)**2;d+=R*2*Math.asin(Math.sqrt(a));}return d;}

function renderResult(chain,mask,W,H){
  const rc=document.getElementById('res-canvas'),maxW=Math.min(W,rc.parentElement.clientWidth||860),sc=maxW/W;
  rc.width=Math.round(W*sc);rc.height=Math.round(H*sc);
  const ctx=rc.getContext('2d');ctx.drawImage(imgEl,0,0,rc.width,rc.height);
  const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;
  const id=tmp.getContext('2d').createImageData(W,H);
  for(let i=0;i<W*H;i++)if(mask[i]){id.data[i*4]=overlayR;id.data[i*4+1]=overlayG;id.data[i*4+2]=overlayB;id.data[i*4+3]=120;}
  tmp.getContext('2d').putImageData(id,0,0);ctx.drawImage(tmp,0,0,rc.width,rc.height);
  if(chain.length>1){
    ctx.beginPath();ctx.strokeStyle='rgba(0,230,100,.95)';ctx.lineWidth=2.5;ctx.lineJoin='round';
    ctx.moveTo(chain[0][0]*sc,chain[0][1]*sc);
    for(let i=1;i<chain.length;i++)ctx.lineTo(chain[i][0]*sc,chain[i][1]*sc);ctx.stroke();
    [[chain[0],'#00e676'],[chain[chain.length-1],'#ff1744']].forEach(([pt,col])=>{ctx.beginPath();ctx.arc(pt[0]*sc,pt[1]*sc,7,0,2*Math.PI);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();});
  }
}

function buildGPX(pts,name){return`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Circuit IGN Extractor" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><n>${esc(name)}</n><time>${new Date().toISOString()}</time></metadata>\n  <trk><n>${esc(name)}</n><trkseg>\n`+pts.map(p=>`    <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"></trkpt>`).join('\n')+`\n  </trkseg></trk>\n</gpx>`;}
function buildKML(pts,name){const c=pts.map(p=>`${p.lon.toFixed(7)},${p.lat.toFixed(7)},0`).join('\n          ');return`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document><n>${esc(name)}</n><Style id="s"><LineStyle><color>ff0000e6</color><width>3</width></LineStyle></Style>\n    <Placemark><n>${esc(name)}</n><styleUrl>#s</styleUrl><LineString><tessellate>1</tessellate><coordinates>\n          ${c}\n      </coordinates></LineString></Placemark></Document></kml>`;}
function buildDownloadButtons(){
  const fmt=document.getElementById('export-fmt').value,name=(document.getElementById('track-name').value||'circuit-ign').replace(/\s+/g,'-');
  const g=document.getElementById('dl-grid');g.innerHTML='';
  if(fmt!=='kml')mkDlBtn(g,'GPX','gpx',gpxContent,name+'.gpx','application/gpx+xml');
  if(fmt!=='gpx')mkDlBtn(g,'KML','kml',kmlContent,name+'.kml','application/vnd.google-earth.kml+xml');
}
function mkDlBtn(g,label,cls,content,fn,mime){const b=document.createElement('button');b.className='dl-btn '+cls;b.innerHTML=`<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 15h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Télécharger ${label}`;b.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=fn;a.click();URL.revokeObjectURL(a.href);};g.appendChild(b);}

function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function setP(v,l){document.getElementById('prog-bar').style.width=v+'%';document.getElementById('prog-label').textContent=l;}
function dl(ms){return new Promise(r=>setTimeout(r,ms));}
function logMsg(m){const el=document.getElementById('log-area');el.textContent+='› '+m+'\n';el.scrollTop=el.scrollHeight;}

function restart(){
  imgEl=null;imgW=0;imgH=0;imgPixels=null;selMask=null;gcps=[];pickState=null;wandInited=false;mapInited=false;wandScale=1;wandOX=0;wandOY=0;
  gpxContent='';kmlContent='';extractedPts=[];
  if(map){map.remove();map=null;}if(jpgMap){jpgMap.remove();jpgMap=null;}
  leafletMarkers=[];jpgMarkers=[];
  document.getElementById('thumb-wrap').style.display='none';
  document.getElementById('btn01').disabled=true;document.getElementById('btn12').disabled=true;
  document.getElementById('gcp-body').innerHTML='';
  goStep(0);
}
