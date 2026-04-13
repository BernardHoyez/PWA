/* export.js — Génération du bundle cenoutil
   Exporte les JSON mis à jour en fichiers téléchargeables
*/

'use strict';

const Export = (() => {

  /* ── Télécharger un fichier JSON ── */
  function downloadJSON(filename, data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );
    _download(blob, filename);
  }

  /* ── Export individuel ── */
  function exportObservations() {
    const data = EditObservations.getData();
    downloadJSON('observations.json', data);
    App.toast(`observations.json exporté (${data.length} entrées)`, 'success');
  }

  function exportDescentes() {
    const data = EditDescentes.getData();
    downloadJSON('markers.json', data);
    App.toast(`markers.json exporté (${data.length} entrées)`, 'success');
  }

  function exportFossiles() {
    const data = EditFossiles.getData();
    downloadJSON('fossiles.json', data);
    const nb = data.reduce((n, g) => n + g.especes.length, 0);
    App.toast(`fossiles.json exporté (${nb} espèces)`, 'success');
  }

  function exportPages() {
    const data = EditPages.getData();
    downloadJSON('pages.json', data);
    App.toast(`pages.json exporté (${data.length} pages)`, 'success');
  }

  /* ── Export groupé (tous les JSON en ZIP) ── */
  async function exportAll() {
    const btn = document.getElementById('btn-export-all');
    if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }

    try {
      // Utilisation de JSZip (chargé via CDN dans index.html)
      const zip = new JSZip();
      const dataFolder = zip.folder('data');

      dataFolder.file('markers.json',      JSON.stringify(EditDescentes.getData(),    null, 2));
      dataFolder.file('observations.json', JSON.stringify(EditObservations.getData(), null, 2));
      dataFolder.file('fossiles.json',     JSON.stringify(EditFossiles.getData(),     null, 2));
      dataFolder.file('pages.json',        JSON.stringify(EditPages.getData(),        null, 2));

      // README instructions
      zip.file('LIRE_MOI.txt', _readmeText());

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const date = new Date().toISOString().slice(0,10);
      _download(blob, `cenoutil_data_${date}.zip`);

      App.markClean();
      App.toast('Export complet téléchargé — placez les fichiers dans cenoutil/data/', 'success');

    } catch(e) {
      App.toast('Erreur export : ' + e.message, 'error');
      console.error(e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '↓ Exporter tout (ZIP)'; }
    }
  }

  function _readmeText() {
    const now = new Date().toLocaleString('fr-FR');
    return `Bundle cenoutil — généré par cenoprepa le ${now}

Contenu de l'archive :
  data/markers.json      → 13 points d'accès falaise
  data/observations.json → Marqueurs d'observation de terrain
  data/fossiles.json     → Catalogue des espèces fossiles
  data/pages.json        → Pages d'information

Installation :
  Copier les fichiers du dossier data/ vers cenoutil/data/
  sur le dépôt GitHub Pages.

URL cenoutil : https://BernardHoyez.github.io/PWA/cenoutil/
`;
  }

  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ── Statistiques pour le tableau de bord ── */
  function updateStats() {
    const obs     = EditObservations.getData();
    const desc    = EditDescentes.getData();
    const fossiles= EditFossiles.getData();
    const pages   = EditPages.getData();
    const nbEsp   = fossiles.reduce((n, g) => n + g.especes.length, 0);

    _setStat('stat-obs',      obs.length);
    _setStat('stat-desc',     desc.length);
    _setStat('stat-fossiles', nbEsp);
    _setStat('stat-pages',    pages.length);
    _setStat('stat-groupes',  fossiles.length);
  }

  function _setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { exportObservations, exportDescentes, exportFossiles, exportPages, exportAll, updateStats };

})();

window.Export = Export;
