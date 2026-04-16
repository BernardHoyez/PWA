/* mbtiles.js v2 — Lecteur MBTiles pour cenoutil
   Stratégie de chargement :
   1. OPFS (déjà en cache local)     → immédiat
   2. map.mbtiles bundlé (GitHub)    → fetch + sauvegarde OPFS
   3. Fichier utilisateur (📁)        → import manuel
   Affichage alternatif : fond OSM (réseau requis)
*/

'use strict';

const MBTiles = (() => {

  let db          = null;
  let SQL         = null;
  let tileScheme  = 'xyz';   /* litto2mbtiles génère en XYZ */
  let activeMode  = null;    /* 'mbtiles' | 'osm' */

  /* URL du MBTiles bundlé dans le dépôt */
  const BUNDLE_URL      = '/PWA/cenoutil/map.mbtiles';
  const OPFS_FILENAME   = 'cenoutil.mbtiles';

  /* ── Initialisation sql.js ── */
  async function initSQL() {
    if (SQL) return SQL;
    SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });
    return SQL;
  }

  /* ── Chargement principal : OPFS → bundle → OSM ── */
  async function autoLoad(onProgress) {
    _progress(onProgress, 'Recherche du fond de carte…', 0);

    /* 1. Tenter OPFS (déjà en cache) */
    const fromOPFS = await _openFromOPFS();
    if (fromOPFS) {
      _progress(onProgress, 'Fond IGN chargé (cache local)', 100);
      activeMode = 'mbtiles';
      return { mode: 'mbtiles', source: 'opfs' };
    }

    /* 2. Tenter le bundle GitHub */
    _progress(onProgress, 'Téléchargement du fond IGN…', 5);
    try {
      const ok = await _fetchBundle(onProgress);
      if (ok) {
        activeMode = 'mbtiles';
        return { mode: 'mbtiles', source: 'bundle' };
      }
    } catch (e) {
      console.warn('[MBTiles] bundle non disponible :', e.message);
    }

    /* 3. Fallback OSM */
    _progress(onProgress, 'Fond OSM (réseau requis)', 100);
    activeMode = 'osm';
    return { mode: 'osm', source: 'fallback' };
  }

  /* ── Télécharger le bundle GitHub ── */
  async function _fetchBundle(onProgress) {
    const resp = await fetch(BUNDLE_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const total  = parseInt(resp.headers.get('Content-Length') || '0');
    const reader = resp.body.getReader();
    const chunks = [];
    let   loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        const pct = Math.round(5 + (loaded / total) * 80);
        _progress(onProgress, `Téléchargement… ${Math.round(loaded/1024)} Ko`, pct);
      }
    }

    /* Assembler le buffer */
    const buffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }

    _progress(onProgress, 'Chargement en mémoire…', 88);
    await _loadBuffer(buffer.buffer);

    /* Sauvegarder en OPFS pour les prochaines sessions */
    _progress(onProgress, 'Sauvegarde locale…', 94);
    await _saveToOPFS(buffer.buffer);

    _progress(onProgress, 'Fond IGN prêt', 100);
    return true;
  }

  /* ── Ouvrir depuis OPFS ── */
  async function _openFromOPFS() {
    try {
      const root = await navigator.storage.getDirectory();
      const fh   = await root.getFileHandle(OPFS_FILENAME);
      const file = await fh.getFile();
      const buf  = await file.arrayBuffer();
      await _loadBuffer(buf);
      return true;
    } catch { return false; }
  }

  /* ── Importer un fichier utilisateur (bouton "Autre MBTiles") ── */
  async function openFromFile(file, onProgress) {
    _progress(onProgress, `Lecture de ${file.name}…`, 10);
    const buf = await file.arrayBuffer();
    _progress(onProgress, 'Chargement…', 60);
    await _loadBuffer(buf);
    _progress(onProgress, 'Sauvegarde locale…', 85);
    await _saveToOPFS(buf);
    _progress(onProgress, `${file.name} chargé`, 100);
    activeMode = 'mbtiles';
  }

  /* ── Sauvegarder en OPFS ── */
  async function _saveToOPFS(buffer) {
    try {
      const root     = await navigator.storage.getDirectory();
      const fh       = await root.getFileHandle(OPFS_FILENAME, { create: true });
      const writable = await fh.createWritable();
      await writable.write(buffer);
      await writable.close();
    } catch (e) { console.warn('[MBTiles] OPFS write:', e); }
  }

  /* ── Charger un ArrayBuffer en SQLite ── */
  async function _loadBuffer(buffer) {
    await initSQL();
    if (db) db.close();
    db = new SQL.Database(new Uint8Array(buffer));
    /* Détecter le schéma depuis metadata */
    try {
      const rows = db.exec("SELECT value FROM metadata WHERE name='scheme'");
      if (rows.length && rows[0].values.length) {
        tileScheme = rows[0].values[0][0];
      } else {
        tileScheme = 'xyz';   /* litto2mbtiles = XYZ par défaut */
      }
    } catch { tileScheme = 'xyz'; }
  }

  /* ── Récupérer une tuile ── */
  function getTile(z, x, y) {
    if (!db) return null;
    /* XYZ → TMS si nécessaire */
    const yDb = tileScheme === 'tms' ? (1 << z) - 1 - y : y;
    try {
      const res = db.exec(
        'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
        [z, x, yDb]
      );
      return (res.length && res[0].values.length) ? res[0].values[0][0] : null;
    } catch { return null; }
  }

  /* ── Créer un layer Leaflet pour le MBTiles ── */
  function createLeafletLayer() {
    if (!window.L) throw new Error('Leaflet non chargé');
    return L.GridLayer.extend({
      createTile(coords, done) {
        const img  = document.createElement('img');
        img.alt    = '';
        const data = getTile(coords.z, coords.x, coords.y);
        if (data) {
          const blob = new Blob([data], { type: 'image/jpeg' });
          const url  = URL.createObjectURL(blob);
          img.onload = () => { URL.revokeObjectURL(url); done(null, img); };
          img.onerror= () => done(null, img);
          img.src    = url;
        } else {
          done(null, img);
        }
        return img;
      },
      options: { tileSize: 256, minZoom: 15, maxZoom: 17 }
    });
  }

  /* ── Emprise géographique ── */
  function getBounds() {
    if (!db) return null;
    try {
      const res = db.exec("SELECT value FROM metadata WHERE name='bounds'");
      if (!res.length || !res[0].values.length) return null;
      const [w, s, e, n] = res[0].values[0][0].split(',').map(Number);
      return [[s, w], [n, e]];
    } catch { return null; }
  }

  /* ── Métadonnées ── */
  function getMetadata() {
    if (!db) return {};
    try {
      const res = db.exec('SELECT name, value FROM metadata');
      if (!res.length) return {};
      const meta = {};
      res[0].values.forEach(([k, v]) => { meta[k] = v; });
      return meta;
    } catch { return {}; }
  }

  function isReady()      { return db !== null; }
  function getMode()      { return activeMode; }
  function clearOPFS()    {
    return navigator.storage.getDirectory()
      .then(root => root.removeEntry(OPFS_FILENAME).catch(() => {}));
  }

  function _progress(cb, msg, pct) {
    if (typeof cb === 'function') cb(msg, pct);
  }

  return {
    autoLoad, openFromFile, isReady, getMode,
    createLeafletLayer, getBounds, getMetadata, clearOPFS,
  };

})();

window.MBTiles = MBTiles;
