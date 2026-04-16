/* ============================================================
   litto2mbtiles — app.js
   Extraction MBTiles pour tout tronçon littoral via OSM/Overpass
   ============================================================ */
'use strict';

// ── APIs ──────────────────────────────────────────────────────
const API = {
  NOMINATIM:  'https://nominatim.openstreetmap.org/search',
  OVERPASS:   'https://overpass-api.de/api/interpreter',
  IGN_TMS:    'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
  OSM_TMS:    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  WMTS_PLAN:  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0'
            + '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png'
            + '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}',
};

// ── État ──────────────────────────────────────────────────────
const S = {
  ptStart:    null,   // {lng, lat, name}
  ptEnd:      null,
  coastline:  null,   // GeoJSON Feature LineString (assemblé + clippé)
  buffer:     null,
  tiles:      [],
  tileMap:    new Map(),
  waypoints:  [],
  currentWP:  0,
  downloading:false,
  abortCtrl:  null,
  SQL:        null,
  previewMap: null,
  viewerMap:  null,
  orthoSrc:   'ign',  // 'ign' | 'osm'
  bufferKm:   0.2,
  zoomMin:    15,
  zoomMax:    17,
  protocolOk: false,
};

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// LOG & BADGE
// ══════════════════════════════════════════════════════════════
function log(msg, type = 'info') {
  const el = $('log');
  if (!el) return;
  const row = document.createElement('div');
  row.className = `le ${type}`;
  row.innerHTML = `<span class="lt">${new Date().toTimeString().slice(0,8)}</span>`
                + `<span class="lm">${msg}</span>`;
  el.appendChild(row);
  el.scrollTop = el.scrollHeight;
}
function badge(cls, msg) {
  const dot = $('sdot'), txt = $('stxt');
  if (dot) dot.className = `sdot ${cls}`;
  if (txt) txt.textContent = msg;
}

// ══════════════════════════════════════════════════════════════
// GÉOCODAGE — Nominatim
// ══════════════════════════════════════════════════════════════
async function geocode(query) {
  const url = `${API.NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&coastal=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'litto2mbtiles/1.0' } });
  if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
  const data = await r.json();
  if (!data.length) throw new Error(`"${query}" non trouvé`);
  return { lng: parseFloat(data[0].lon), lat: parseFloat(data[0].lat), name: data[0].display_name.split(',')[0] };
}

// ══════════════════════════════════════════════════════════════
// OVERPASS — trait de côte vectoriel
// ══════════════════════════════════════════════════════════════
async function fetchCoastline(ptA, ptB) {
  // BBox élargie de 20% autour des deux points
  const margin = 0.15;
  const minLng = Math.min(ptA.lng, ptB.lng) - margin;
  const maxLng = Math.max(ptA.lng, ptB.lng) + margin;
  const minLat = Math.min(ptA.lat, ptB.lat) - margin;
  const maxLat = Math.max(ptA.lat, ptB.lat) + margin;

  const query = `[out:json][timeout:60][bbox:${minLat},${minLng},${maxLat},${maxLng}];
way["natural"="coastline"];
out geom;`;

  log('Requête Overpass en cours…');
  const r = await fetch(API.OVERPASS, {
    method: 'POST',
    body:   'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  const data = await r.json();
  if (!data.elements?.length) throw new Error('Aucun trait de côte trouvé dans la zone');
  log(`${data.elements.length} segments OSM récupérés`, 'success');
  return data.elements;
}

// ══════════════════════════════════════════════════════════════
// ASSEMBLAGE DU TRAIT DE CÔTE
// ══════════════════════════════════════════════════════════════
function dist(a, b) {
  const R = 6371000;
  const dLat = (b[1]-a[1]) * Math.PI/180;
  const dLng = (b[0]-a[0]) * Math.PI/180;
  const lat1 = a[1] * Math.PI/180, lat2 = b[1] * Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function buildChain(elements) {
  // Convertir chaque way en tableau de [lng, lat]
  const segs = elements.map(el =>
    el.geometry.map(n => [n.lon, n.lat])
  );

  // Algorithme glouton de chaînage par extrémités (tolérance 5 m)
  const TOLE = 5;
  const chain = [segs.shift()];

  while (segs.length > 0) {
    const tail  = chain[chain.length-1];
    const tailEnd = tail[tail.length-1];
    let best = -1, bestDist = Infinity, bestRev = false;

    for (let i = 0; i < segs.length; i++) {
      const dStart = dist(tailEnd, segs[i][0]);
      const dEnd   = dist(tailEnd, segs[i][segs[i].length-1]);
      if (dStart < bestDist) { bestDist = dStart; best = i; bestRev = false; }
      if (dEnd   < bestDist) { bestDist = dEnd;   best = i; bestRev = true;  }
    }

    if (bestDist > 5000) break; // gap trop grand — on arrête

    const seg = segs.splice(best, 1)[0];
    const next = bestRev ? [...seg].reverse() : seg;
    // Éviter doublon de jonction
    if (dist(tail[tail.length-1], next[0]) < TOLE) next.shift();
    tail.push(...next);
    // Fusionner dans la chaîne
    chain[chain.length-1] = tail;
  }

  // Retourner le segment le plus long
  return chain.sort((a,b) => b.length - a.length)[0];
}

// Douglas-Peucker
function dpSimplify(pts, eps) {
  if (pts.length <= 2) return pts;
  const [s, e] = [pts[0], pts[pts.length-1]];
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length-1; i++) {
    const d = distPtSeg(pts[i], s, e);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    return [...dpSimplify(pts.slice(0, maxI+1), eps).slice(0,-1),
            ...dpSimplify(pts.slice(maxI), eps)];
  }
  return [s, e];
}

function distPtSeg(p, a, b) {
  const R = 6371000;
  const lat0 = Math.radians ? Math.radians((p[1]+a[1]+b[1])/3)
             : ((p[1]+a[1]+b[1])/3) * Math.PI/180;
  const cos = Math.cos(lat0);
  const [px,py] = [p[0]*R*cos, p[1]*R];
  const [ax,ay] = [a[0]*R*cos, a[1]*R];
  const [bx,by] = [b[0]*R*cos, b[1]*R];
  const [dx,dy] = [bx-ax, by-ay];
  if (!dx && !dy) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

function clipToEndpoints(coords, ptA, ptB) {
  const pA = [ptA.lng, ptA.lat], pB = [ptB.lng, ptB.lat];
  const iA = coords.reduce((bi,c,i) => dist(c,pA)<dist(coords[bi],pA)?i:bi, 0);
  const iB = coords.reduce((bi,c,i) => dist(c,pB)<dist(coords[bi],pB)?i:bi, 0);
  const [lo,hi] = [Math.min(iA,iB), Math.max(iA,iB)];
  const clipped = coords.slice(lo, hi+1);
  // S'assurer que l'ordre est ptA → ptB
  if (dist(clipped[0], pA) > dist(clipped[clipped.length-1], pA))
    clipped.reverse();
  return clipped;
}

async function processCoastline(elements, ptA, ptB) {
  log('Assemblage des segments…');
  const raw = buildChain(elements);
  log(`Chaîne brute : ${raw.length} points`);

  log('Simplification (80 m)…');
  const simplified = dpSimplify(raw, 80);
  log(`Après simplification : ${simplified.length} points`);

  log('Clip aux extrémités…');
  const clipped = clipToEndpoints(simplified, ptA, ptB);
  const lenKm = (clipped.reduce((s,c,i) => i ? s+dist(clipped[i-1],c) : 0, 0)/1000).toFixed(1);
  log(`Trait de côte final : ${clipped.length} points — ${lenKm} km`, 'success');

  return {
    type: 'Feature',
    properties: { name: `${ptA.name} → ${ptB.name}`, longueur_km: parseFloat(lenKm) },
    geometry: { type: 'LineString', coordinates: clipped }
  };
}

// ══════════════════════════════════════════════════════════════
// GÉOMÉTRIE TUILES (XYZ standard — IGN data.geopf.fr = XYZ)
// ══════════════════════════════════════════════════════════════
function lngLatToXY(lng, lat, z) {
  const n = 1 << z;
  const x = Math.floor((lng + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1/Math.cos(latR)) / Math.PI) / 2 * n);
  return { x, y };
}

function tileBBox(x, y, z) {
  const n = 1 << z;
  return [
    x/n*360-180,
    Math.atan(Math.sinh(Math.PI*(1-2*(y+1)/n)))*180/Math.PI,
    (x+1)/n*360-180,
    Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI,
  ];
}

function bboxOverlap(a, b) {
  return a[0]<b[2] && a[2]>b[0] && a[1]<b[3] && a[3]>b[1];
}

function tilesForPolygon(polygon, zMin, zMax) {
  const result = [];
  const pb = turf.bbox(polygon);

  // Pré-calcul : liste des anneaux du polygone buffer pour le test ray-casting
  // On extrait les coordonnées une seule fois (évite les appels Turf répétés)
  const rings = polygon.geometry.type === 'Polygon'
    ? polygon.geometry.coordinates
    : polygon.geometry.coordinates.flat(1); // MultiPolygon → on prend tous les anneaux

  for (let z = zMin; z <= zMax; z++) {
    const nw = lngLatToXY(pb[0], pb[3], z);
    const se = lngLatToXY(pb[2], pb[1], z);
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        const tb = tileBBox(x, y, z); // [w, s, e, n]
        // 1. Rejet rapide : bbox de la tuile hors bbox du polygone
        if (!bboxOverlap(pb, tb)) continue;
        // 2. Test précis : intersection tuile ↔ polygone buffer
        if (tileIntersectsPolygon(tb, rings)) result.push([z, x, y]);
      }
    }
  }
  return result;
}

/**
 * Test d'intersection entre une tuile [w,s,e,n] et un polygone défini
 * par ses anneaux de coordonnées [lng,lat].
 * Trois cas couverts :
 *   A) Au moins un sommet de la tuile est dans le polygone
 *   B) Au moins un sommet du polygone est dans la tuile
 *   C) Une arête du polygone croise un bord de la tuile
 */
function tileIntersectsPolygon(tb, rings) {
  const [w, s, e, n] = tb;

  // Corners de la tuile
  const corners = [[w,s],[e,s],[e,n],[w,n]];

  for (const ring of rings) {
    // Cas A : un coin de la tuile dans le polygone
    for (const [cx, cy] of corners) {
      if (pointInRing(cx, cy, ring)) return true;
    }
    // Cas B : un sommet du polygone dans la tuile
    for (const [px, py] of ring) {
      if (px >= w && px <= e && py >= s && py <= n) return true;
    }
    // Cas C : une arête du polygone coupe un bord de la tuile
    const tileEdges = [
      [w,s,e,s], [e,s,e,n], [e,n,w,n], [w,n,w,s]
    ];
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax,ay] = ring[i], [bx,by] = ring[i+1];
      for (const [x1,y1,x2,y2] of tileEdges) {
        if (segmentsIntersect(ax,ay,bx,by,x1,y1,x2,y2)) return true;
      }
    }
  }
  return false;
}

/** Ray-casting : point (px,py) dans un anneau de coordonnées */
function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi,yi] = ring[i], [xj,yj] = ring[j];
    if (((yi>py) !== (yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi))
      inside = !inside;
  }
  return inside;
}

/** Intersection de deux segments (a1→a2) et (b1→b2) */
function segmentsIntersect(ax,ay,bx,by,cx,cy,dx,dy) {
  const d1x=bx-ax, d1y=by-ay, d2x=dx-cx, d2y=dy-cy;
  const cross = d1x*d2y - d1y*d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((cx-ax)*d2y-(cy-ay)*d2x) / cross;
  const u = ((cx-ax)*d1y-(cy-ay)*d1x) / cross;
  return t>=0 && t<=1 && u>=0 && u<=1;
}

// ══════════════════════════════════════════════════════════════
// WAYPOINTS
// ══════════════════════════════════════════════════════════════
function computeWaypoints() {
  if (!S.coastline) return;
  const len = turf.length(S.coastline, { units: 'kilometers' });
  S.waypoints = [];
  for (let km = 0; km <= len+0.001; km += 1.0) {
    const c  = Math.min(km, len);
    const pt = turf.along(S.coastline, c, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    const name = c < 0.5 ? S.ptStart?.name || 'Départ'
               : c >= len-0.5 ? S.ptEnd?.name || 'Arrivée'
               : `km ${c.toFixed(1)}`;
    S.waypoints.push({ lng, lat, km: c, name });
  }
  const sl = $('cslider');
  if (sl) { sl.max = S.waypoints.length-1; sl.value = 0; }
  $('lbl-start').textContent = S.ptStart?.name || 'Départ';
  $('lbl-end').textContent   = S.ptEnd?.name   || 'Arrivée';
}

// ══════════════════════════════════════════════════════════════
// TÉLÉCHARGEMENT
// ══════════════════════════════════════════════════════════════
function tileUrl(z, x, y) {
  // IGN data.geopf.fr/tms = XYZ standard (Y non inversé)
  if (S.orthoSrc === 'ign') return API.IGN_TMS.replace('{z}',z).replace('{x}',x).replace('{y}',y);
  return API.OSM_TMS.replace('{z}',z).replace('{x}',x).replace('{y}',y);
}

async function fetchTile(z, x, y, signal) {
  const url = tileUrl(z, x, y);
  for (let attempt = 0; attempt < 5; attempt++) {
    if (signal.aborted) return { status: 'abort' };
    try {
      const r = await fetch(url, { signal, cache: 'no-store', mode: 'cors' });
      if (r.status === 404) return { status: 'notfound' };
      if (r.status === 429 || r.status === 503) {
        await new Promise(res => setTimeout(res, 1200 * Math.pow(2, attempt)));
        continue;
      }
      if (!r.ok) return { status: 'error', msg: `HTTP ${r.status}` };
      return { status: 'ok', data: new Uint8Array(await r.arrayBuffer()) };
    } catch(e) {
      if (e.name === 'AbortError') return { status: 'abort' };
      if (attempt === 0) log(`Erreur fetch ${z}/${x}/${y} : ${e.message}`, 'error');
      if (attempt < 4) await new Promise(res => setTimeout(res, 1200 * Math.pow(2, attempt)));
      else return { status: 'error', msg: e.message };
    }
  }
  return { status: 'error', msg: 'max retries' };
}

async function downloadTiles() {
  if (S.downloading || !S.tiles.length) return;

  // Sonde
  const [tz,tx,ty] = S.tiles[Math.floor(S.tiles.length/2)];
  log(`Sonde : ${tileUrl(tz,tx,ty)}`);
  try {
    const probe = await fetch(tileUrl(tz,tx,ty), { cache:'no-store', mode:'cors' });
    log(`Sonde IGN : HTTP ${probe.status}`, probe.ok||probe.status===404?'success':'warn');
  } catch(e) {
    log(`CORS bloqué : ${e.message}`, 'error');
    badge('error','CORS bloqué'); return;
  }

  S.downloading = true;
  S.abortCtrl   = new AbortController();
  S.tileMap.clear();
  $('btn-download').disabled = true;
  $('btn-abort').disabled    = false;
  $('btn-export').disabled   = true;

  const total = S.tiles.length;
  let done=0, errors=0, notfound=0;
  badge('busy', `0/${total}`);
  log(`Démarrage : ${total} tuiles — source ${S.orthoSrc.toUpperCase()}`);

  const queue = [...S.tiles];
  const CONC  = 3;

  async function worker() {
    while (queue.length && !S.abortCtrl.signal.aborted) {
      const tile = queue.shift();
      if (!tile) break;
      const [z,x,y] = tile;
      const res = await fetchTile(z,x,y, S.abortCtrl.signal);
      if (res.status==='abort'||S.abortCtrl.signal.aborted) return;
      if      (res.status==='ok')       S.tileMap.set(`${z}/${x}/${y}`, res.data);
      else if (res.status==='notfound') notfound++;
      else { errors++; if(errors<=3) log(`Erreur ${z}/${x}/${y} : ${res.msg}`,'error'); }
      done++;
      const pct = Math.round(done/total*100);
      $('prog-bar').style.width    = `${pct}%`;
      $('prog-pct').textContent    = `${pct}%`;
      $('prog-done').textContent   = `${done.toLocaleString()} / ${total.toLocaleString()}`;
      $('prog-detail').textContent = `${S.tileMap.size} reçues · ${notfound} absentes · ${errors} erreurs`;
      if (done%100===0||done===total) badge('busy',`${pct}% — ${S.tileMap.size}`);
    }
  }

  await Promise.all(Array.from({length:CONC}, worker));
  S.downloading = false;
  $('btn-abort').disabled    = true;
  $('btn-download').disabled = false;

  if (S.abortCtrl.signal.aborted) { log('Interrompu','warn'); return; }

  const n = S.tileMap.size;
  log(`Terminé : ${n} reçues · ${notfound} absentes · ${errors} erreurs`, n>0?'success':'error');
  badge(n>0?'ready':'error', `${n} tuiles`);
  $('btn-export').disabled   = n===0;
  if (n>0) setupViewerProtocol();
}

// ══════════════════════════════════════════════════════════════
// EXPORT MBTILES
// ══════════════════════════════════════════════════════════════
async function exportMBTiles() {
  if (!S.tileMap.size) { log('Aucune tuile','warn'); return; }
  $('btn-export').disabled = true;
  log('Génération MBTiles…');
  try {
    if (!S.SQL) {
      const fn = window.initSqlJs;
      if (!fn) throw new Error('sql.js non disponible (CDN ?)');
      S.SQL = await fn({ locateFile: f=>`https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
      log('sql.js prêt','success');
    }

    log(`Création DB SQLite — ${S.tileMap.size} tuiles…`);
    const db = new S.SQL.Database();

    db.run('CREATE TABLE metadata (name TEXT NOT NULL, value TEXT)');
    db.run(`CREATE TABLE tiles (
      zoom_level  INTEGER NOT NULL,
      tile_column INTEGER NOT NULL,
      tile_row    INTEGER NOT NULL,
      tile_data   BLOB    NOT NULL,
      UNIQUE (zoom_level, tile_column, tile_row)
    )`);
    db.run('CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row)');

    // Métadonnées
    const bb = turf.bbox(S.buffer);
    const ct = turf.center(S.buffer).geometry.coordinates;
    const metaRows = [
      ['name',        `litto2mbtiles ${S.ptStart?.name||'?'} to ${S.ptEnd?.name||'?'}`],
      ['description', `Ortho ${S.orthoSrc.toUpperCase()} buffer ${Math.round(S.bufferKm*1000)}m Z${S.zoomMin}-${S.zoomMax}`],
      ['format',      S.orthoSrc==='ign' ? 'jpeg' : 'png'],
      ['bounds',      bb.map(v=>v.toFixed(6)).join(',')],
      ['center',      `${ct[0].toFixed(6)},${ct[1].toFixed(6)},${Math.round((S.zoomMin+S.zoomMax)/2)}`],
      ['minzoom',     String(S.zoomMin)],
      ['maxzoom',     String(S.zoomMax)],
    ];
    for (const [k,v] of metaRows) {
      db.run('INSERT INTO metadata (name, value) VALUES (?, ?)', [k, v]);
    }
    log(`Métadonnées insérées (${metaRows.length} entrées)`);

    // Insertion des tuiles par lots
    const entries = [...S.tileMap.entries()];
    const BATCH = 100;
    let inserted = 0;

    for (let i = 0; i < entries.length; i += BATCH) {
      db.run('BEGIN TRANSACTION');
      const batch = entries.slice(i, i + BATCH);
      for (const [key, u8] of batch) {
        const parts = key.split('/');
        const z = parseInt(parts[0]);
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const yTMS = (1 << z) - 1 - y;  // inversion Y : XYZ → TMS pour MBTiles
        // sql.js accepte Uint8Array directement — copie propre pour éviter les problèmes d'offset
        const tileData = new Uint8Array(u8);
        db.run(
          'INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)',
          [z, x, yTMS, tileData]
        );
        inserted++;
      }
      db.run('COMMIT');

      const pct = Math.min(100, Math.round((i + BATCH) / entries.length * 100));
      $('prog-bar').style.width    = `${pct}%`;
      $('prog-pct').textContent    = `${pct}%`;
      $('prog-detail').textContent = `Écriture SQL : ${inserted} / ${entries.length}`;
      await new Promise(r => setTimeout(r, 0)); // libérer le thread UI
    }

    log(`${inserted} tuiles écrites en base`);

    // Export du fichier SQLite
    const raw = db.export();
    db.close();
    log(`Base SQLite générée : ${(raw.byteLength/1048576).toFixed(1)} Mo`);

    // Téléchargement
    const cleanName = s => (s || 'X').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const fname = `litto2mbtiles_${cleanName(S.ptStart?.name)}_${cleanName(S.ptEnd?.name)}_z${S.zoomMin}-${S.zoomMax}.mbtiles`;
    const blobUrl = URL.createObjectURL(new Blob([raw], { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = blobUrl; a.download = fname; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 3000);
    log(`Exporté : ${fname} (${(raw.byteLength/1048576).toFixed(1)} Mo)`, 'success');

  } catch(e) {
    // Logguer l'erreur complète pour diagnostic
    const msg = e instanceof Error ? `${e.message}` : String(e);
    log(`Erreur export : ${msg}`, 'error');
    console.error('exportMBTiles error:', e);
  }
  $('btn-export').disabled = false;
}

// ══════════════════════════════════════════════════════════════
// VISUALISEUR — protocole litto2:// (MapLibre 4.x)
// ══════════════════════════════════════════════════════════════
function setupViewerProtocol() {
  if (S.protocolOk) { if (S.viewerMap?.isStyleLoaded()) loadViewerTiles(); return; }
  S.protocolOk = true;
  maplibregl.addProtocol('litto2', params =>
    new Promise((resolve, reject) => {
      const parts = params.url.replace('litto2://t/','').split('/');
      const [z,x,y] = parts.map(Number);
      const data = S.tileMap.get(`${z}/${x}/${y}`);
      if (!data) reject(new Error(`absent ${z}/${x}/${y}`));
      else resolve({ data: data.buffer.slice(0) });
    })
  );
  log('Protocole visualiseur prêt','success');
  if (S.viewerMap?.isStyleLoaded()) loadViewerTiles();
}

// ══════════════════════════════════════════════════════════════
// CARTES
// ══════════════════════════════════════════════════════════════
function initPreviewMap() {
  if (S.previewMap) return;
  S.previewMap = new maplibregl.Map({
    container: 'preview-map',
    style: {
      version: 8,
      sources: { plan: { type:'raster', tiles:[API.WMTS_PLAN], tileSize:256 }},
      layers:  [{ id:'base', type:'raster', source:'plan' }]
    },
    center: [0.13, 49.6], zoom: 9, attributionControl: false,
  });
  S.previewMap.on('load', drawPreviewLayers);
}

function drawPreviewLayers() {
  const map = S.previewMap;
  if (!map?.isStyleLoaded()) return;
  ['bf','bl','cl','ms','me'].forEach(id => map.getLayer(id)&&map.removeLayer(id));
  ['bs','cs','ps'].forEach(id => map.getSource(id)&&map.removeSource(id));

  if (S.buffer) {
    map.addSource('bs',{type:'geojson',data:S.buffer});
    map.addLayer({id:'bf',type:'fill',  source:'bs',paint:{'fill-color':'#00c8b4','fill-opacity':.12}});
    map.addLayer({id:'bl',type:'line',  source:'bs',paint:{'line-color':'#00c8b4','line-width':1.5}});
  }
  if (S.coastline) {
    map.addSource('cs',{type:'geojson',data:S.coastline});
    map.addLayer({id:'cl',type:'line',source:'cs',paint:{'line-color':'#f0a500','line-width':2}});
    const bb = turf.bbox(S.coastline);
    map.fitBounds([[bb[0],bb[1]],[bb[2],bb[3]]],{padding:60});
  }
  // Marqueurs extrémités
  if (S.ptStart || S.ptEnd) {
    const pts = [];
    if (S.ptStart) pts.push({type:'Feature',geometry:{type:'Point',coordinates:[S.ptStart.lng,S.ptStart.lat]},properties:{t:'start'}});
    if (S.ptEnd)   pts.push({type:'Feature',geometry:{type:'Point',coordinates:[S.ptEnd.lng,  S.ptEnd.lat  ]},properties:{t:'end'  }});
    map.addSource('ps',{type:'geojson',data:{type:'FeatureCollection',features:pts}});
    map.addLayer({id:'ms',type:'circle',source:'ps',filter:['==','t','start'],
      paint:{'circle-radius':7,'circle-color':'#29d17a','circle-stroke-width':2,'circle-stroke-color':'#fff'}});
    map.addLayer({id:'me',type:'circle',source:'ps',filter:['==','t','end'],
      paint:{'circle-radius':7,'circle-color':'#ff5252','circle-stroke-width':2,'circle-stroke-color':'#fff'}});
  }
}

function initViewerMap() {
  if (S.viewerMap) return;
  S.viewerMap = new maplibregl.Map({
    container: 'viewer-map',
    style: {version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#07111f'}}]},
    center: [0.13, 49.6], zoom: 12, attributionControl: false,
  });
  S.viewerMap.on('load', () => { if (S.protocolOk && S.tileMap.size) loadViewerTiles(); });
}

function loadViewerTiles() {
  const map = S.viewerMap;
  if (!map?.isStyleLoaded()) return;
  if (map.getLayer('ortho')) map.removeLayer('ortho');
  if (map.getSource('ort'))  map.removeSource('ort');
  map.addSource('ort',{
    type:'raster', tiles:['litto2://t/{z}/{x}/{y}'],
    tileSize:256, minzoom:S.zoomMin, maxzoom:S.zoomMax,
  });
  map.addLayer({id:'ortho',type:'raster',source:'ort'});
  $('vph')?.classList.add('hidden');
  log(`Visualiseur : ${S.tileMap.size} tuiles`, 'success');
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function goTo(idx) {
  if (!S.waypoints.length) return;
  idx = Math.max(0, Math.min(idx, S.waypoints.length-1));
  S.currentWP = idx;
  const wp = S.waypoints[idx];
  S.viewerMap?.flyTo({ center:[wp.lng,wp.lat], zoom:S.zoomMax-1, speed:.8 });
  $('cslider').value  = idx;
  $('wp-name').textContent = wp.name;
  $('wp-km').textContent   = `${wp.km.toFixed(1)} km`;
}

// ══════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${tab}`));
  if (tab==='extract' && !S.previewMap) setTimeout(initPreviewMap,50);
  if (tab==='viewer') {
    if (!S.viewerMap) setTimeout(()=>{initViewerMap();if(S.protocolOk&&S.tileMap.size)loadViewerTiles();},50);
    else if (S.protocolOk&&S.tileMap.size&&!S.viewerMap.getSource('ort')) loadViewerTiles();
  }
}

// ══════════════════════════════════════════════════════════════
// WORKFLOW PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function resolvePoint(which) {
  const nameEl  = $(`name-${which}`);
  const coordEl = $(`coord-${which}`);
  const query   = nameEl.value.trim();
  if (!query) return;
  badge('busy','Géocodage…');
  try {
    const pt = await geocode(query);
    S[which==='start'?'ptStart':'ptEnd'] = pt;
    coordEl.textContent = `${pt.lat.toFixed(5)}°N  ${pt.lng.toFixed(5)}°E — ${pt.name}`;
    log(`${which==='start'?'Départ':'Arrivée'} : ${pt.name} (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`, 'success');
    badge('ready','Prêt');
    updateFetchBtn();
    // Centrer la carte sur le point
    if (S.previewMap) {
      S.previewMap.flyTo({ center:[pt.lng,pt.lat], zoom:11 });
      drawPreviewLayers();
    }
  } catch(e) {
    log(`Géocodage échoué : ${e.message}`, 'error');
    badge('error', e.message);
  }
}

function applyCoordInputs() {
  const lngS = parseFloat($('coord-lng-start').value);
  const latS = parseFloat($('coord-lat-start').value);
  const lngE = parseFloat($('coord-lng-end').value);
  const latE = parseFloat($('coord-lat-end').value);
  if (!isNaN(lngS)&&!isNaN(latS)) {
    S.ptStart = { lng:lngS, lat:latS, name:`${latS.toFixed(4)},${lngS.toFixed(4)}` };
    log(`Départ coordonnées : ${latS}, ${lngS}`, 'success');
  }
  if (!isNaN(lngE)&&!isNaN(latE)) {
    S.ptEnd = { lng:lngE, lat:latE, name:`${latE.toFixed(4)},${lngE.toFixed(4)}` };
    log(`Arrivée coordonnées : ${latE}, ${lngE}`, 'success');
  }
  updateFetchBtn();
}

function updateFetchBtn() {
  $('btn-fetch-coast').disabled = !(S.ptStart && S.ptEnd);
}

async function fetchAndBuildCoast() {
  if (!S.ptStart || !S.ptEnd) return;
  badge('busy','Chargement OSM…');
  $('btn-fetch-coast').disabled = true;
  $('btn-compute').disabled     = true;
  try {
    const elements = await fetchCoastline(S.ptStart, S.ptEnd);
    S.coastline = await processCoastline(elements, S.ptStart, S.ptEnd);
    drawPreviewLayers();
    $('btn-compute').disabled = false;
    badge('ready','Trait de côte prêt');
    const len = S.coastline.properties.longueur_km;
    $('stat-len').textContent = `${len} km`;
  } catch(e) {
    log(`Erreur : ${e.message}`, 'error');
    badge('error', e.message);
  }
  $('btn-fetch-coast').disabled = false;
}

function computeTilesAndBuffer() {
  if (!S.coastline) return;

  // Lire les paramètres
  const bufSel = $('param-buffer').value;
  S.bufferKm = bufSel === 'custom'
    ? (parseFloat($('buffer-custom-val').value)||200) / 1000
    : parseFloat(bufSel);
  S.zoomMin = parseInt($('param-zmin').value);
  S.zoomMax = parseInt($('param-zmax').value);
  if (S.zoomMin > S.zoomMax) S.zoomMax = S.zoomMin;

  try {
    S.buffer = turf.buffer(S.coastline, S.bufferKm, { units:'kilometers', steps:8 });
  } catch(e) { log(`Buffer : ${e.message}`, 'error'); return; }

  S.tiles = tilesForPolygon(S.buffer, S.zoomMin, S.zoomMax);

  // Stats par zoom
  const bz = {};
  for (const [z] of S.tiles) bz[z] = (bz[z]||0)+1;
  const zooms = Array.from({length:S.zoomMax-S.zoomMin+1},(_,i)=>S.zoomMin+i);
  zooms.forEach((z,i) => {
    $(`stat-z${i+1}`).textContent = (bz[z]||0).toLocaleString();
    $(`lbl-z${i+1}`).textContent  = `Zoom ${z}`;
  });
  // Vider les slots inutilisés
  for (let i=zooms.length+1; i<=3; i++) {
    $(`stat-z${i}`).textContent = '—';
    $(`lbl-z${i}`).textContent  = '—';
  }
  $('stat-total').textContent = S.tiles.length.toLocaleString();
  $('stat-size').textContent  = `~${Math.round(S.tiles.length*25/1024)} Mo`;

  $('btn-download').disabled = S.tiles.length === 0;
  computeWaypoints();
  drawPreviewLayers();

  log(`${S.tiles.length} tuiles — Z${S.zoomMin} à Z${S.zoomMax} — buffer ${S.bufferKm*1000}m`,
      S.tiles.length > 0 ? 'success' : 'warn');
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  badge('','Initialisation…');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope:'/PWA/litto2mbtiles/' })
      .then(()=>log('Service Worker enregistré','success'))
      .catch(e=>log(`SW : ${e.message}`,'warn'));
  }

  initPreviewMap();
  badge('ready','Prêt');

  // ── Tabs ──
  document.querySelectorAll('.tab-btn').forEach(b=>
    b.addEventListener('click',()=>switchTab(b.dataset.tab)));

  // ── Mode saisie ──
  document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const mode = b.dataset.mode;
    $('input-name').style.display   = mode==='name'  ?'':'none';
    $('input-coords').style.display = mode==='coords'?'':'none';
    if (mode==='coords') {
      // Écouter les changements de coordonnées
      ['coord-lng-start','coord-lat-start','coord-lng-end','coord-lat-end']
        .forEach(id => $(`${id}`) && $(`${id}`).addEventListener('change', applyCoordInputs));
    }
  }));

  // ── Géocodage ──
  $('resolve-start').addEventListener('click', ()=>resolvePoint('start'));
  $('resolve-end').addEventListener('click',   ()=>resolvePoint('end'));
  $('name-start').addEventListener('keydown', e=>e.key==='Enter'&&resolvePoint('start'));
  $('name-end').addEventListener('keydown',   e=>e.key==='Enter'&&resolvePoint('end'));

  // ── Source ortho ──
  document.querySelectorAll('.src-btn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.src-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    S.orthoSrc = b.dataset.src;
    log(`Source ortho : ${S.orthoSrc.toUpperCase()}`);
  }));

  // ── Buffer custom ──
  $('param-buffer').addEventListener('change', e=>{
    $('buffer-custom-row').style.display = e.target.value==='custom'?'':'none';
  });

  // ── Workflow ──
  $('btn-fetch-coast').addEventListener('click', fetchAndBuildCoast);
  $('btn-compute').addEventListener('click',     computeTilesAndBuffer);
  $('btn-download').addEventListener('click',    downloadTiles);
  $('btn-abort').addEventListener('click',       ()=>S.abortCtrl?.abort());
  $('btn-export').addEventListener('click',      exportMBTiles);

  $('btn-open-viewer').addEventListener('click', ()=>{
    if (!S.tileMap.size) { log('Téléchargez d\'abord les tuiles','warn'); return; }
    switchTab('viewer');
    setTimeout(()=>{ if(!S.viewerMap) initViewerMap(); setTimeout(()=>{ loadViewerTiles(); goTo(0); },200); },50);
  });

  // ── Navigation ──
  $('nav-start').addEventListener('click', ()=>goTo(0));
  $('nav-end').addEventListener('click',   ()=>goTo(S.waypoints.length-1));
  $('nav-prev').addEventListener('click',  ()=>goTo(S.currentWP-1));
  $('nav-next').addEventListener('click',  ()=>goTo(S.currentWP+1));
  $('cslider').addEventListener('input',   e=>goTo(+e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
