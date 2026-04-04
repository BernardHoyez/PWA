/* mbtiles.js — Lecteur MBTiles pour cenoutil
   Utilise sql.js (SQLite en WebAssembly) et l'Origin Private File System (OPFS)
   Compatible : Chrome/Edge 86+, Firefox 111+, Safari 17+
*/

'use strict';

const MBTiles = (() => {

  let db = null;        // Instance SQLite (sql.js)
  let SQL = null;       // sql.js module
  let tileScheme = 'tms'; // littoextract génère en TMS (y inversé)

  /* ── Initialisation de sql.js ── */
  async function initSQL() {
    if (SQL) return SQL;
    SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    return SQL;
  }

  /* ── Ouverture du fichier MBTiles depuis OPFS ── */
  async function openFromOPFS(filename = 'cenoutil.mbtiles') {
    const root = await navigator.storage.getDirectory();
    let fileHandle;
    try {
      fileHandle = await root.getFileHandle(filename);
    } catch {
      return false; // Fichier non trouvé dans OPFS
    }
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    await _loadBuffer(buffer);
    return true;
  }

  /* ── Chargement depuis un File (input utilisateur) ── */
  async function openFromFile(file) {
    const buffer = await file.arrayBuffer();
    // Copie dans OPFS pour usage futur hors-ligne
    await _saveToOPFS(buffer, file.name);
    await _loadBuffer(buffer);
  }

  /* ── Sauvegarde dans OPFS ── */
  async function _saveToOPFS(buffer, filename = 'cenoutil.mbtiles') {
    try {
      const root = await navigator.storage.getDirectory();
      const fh = await root.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(buffer);
      await writable.close();
    } catch (e) {
      console.warn('OPFS write failed:', e);
    }
  }

  /* ── Chargement du buffer SQLite ── */
  async function _loadBuffer(buffer) {
    await initSQL();
    if (db) db.close();
    db = new SQL.Database(new Uint8Array(buffer));
    // Lire le schéma de tuiles depuis les métadonnées
    try {
      const meta = getMetadata();
      if (meta.scheme) tileScheme = meta.scheme;
    } catch {}
  }

  /* ── Vérification disponibilité ── */
  function isReady() { return db !== null; }

  /* ── Métadonnées du MBTiles ── */
  function getMetadata() {
    if (!db) return {};
    const result = db.exec('SELECT name, value FROM metadata');
    if (!result.length) return {};
    const meta = {};
    result[0].values.forEach(([name, value]) => { meta[name] = value; });
    return meta;
  }

  /* ── Récupération d'une tuile ── */
  function getTile(z, x, y) {
    if (!db) return null;
    // Conversion TMS → XYZ si nécessaire (littoextract utilise TMS)
    const yDb = tileScheme === 'tms' ? (1 << z) - 1 - y : y;
    try {
      const result = db.exec(
        'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
        [z, x, yDb]
      );
      if (!result.length || !result[0].values.length) return null;
      return result[0].values[0][0]; // Uint8Array
    } catch {
      return null;
    }
  }

  /* ── Création d'une URL blob pour une tuile ── */
  function getTileURL(z, x, y) {
    const data = getTile(z, x, y);
    if (!data) return null;
    const blob = new Blob([data], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }

  /* ── Layer Leaflet personnalisé pour MBTiles ── */
  function createLeafletLayer() {
    if (!window.L) throw new Error('Leaflet non chargé');
    return L.GridLayer.extend({
      createTile(coords, done) {
        const img = document.createElement('img');
        img.alt = '';
        const url = getTileURL(coords.z, coords.x, coords.y);
        if (url) {
          img.onload = () => { URL.revokeObjectURL(url); done(null, img); };
          img.onerror = () => done(null, img);
          img.src = url;
        } else {
          done(null, img);
        }
        return img;
      },
      options: { tileSize: 256, minZoom: 15, maxZoom: 17 }
    });
  }

  /* ── Emprise géographique du MBTiles ── */
  function getBounds() {
    const meta = getMetadata();
    if (!meta.bounds) return null;
    const [w, s, e, n] = meta.bounds.split(',').map(Number);
    return [[s, w], [n, e]];
  }

  return { openFromOPFS, openFromFile, isReady, getMetadata, getTile, getTileURL, createLeafletLayer, getBounds };

})();

window.MBTiles = MBTiles;
