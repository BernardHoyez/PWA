/* app.js — Contrôleur principal cenoprepa */

'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PWA/cenoprepa/sw.js')
      .catch(e => console.warn('SW:', e));
  });
}

const App = (() => {

  let dirty = false;  // données modifiées non exportées
  let currentPanel = 'dashboard';

  /* ── Chargement des données cenoutil ── */
  let _data = {
    descentes: [], observations: [], fossiles: [], pages: [],
  };

  async function _loadData() {
    // Tenter de charger depuis cenoutil_v2 voisin
    const base = '../cenoutil_v2/data/';
    try {
      const [desc, obs, fos, pag] = await Promise.all([
        fetch(base + 'markers.json').then(r => r.json()),
        fetch(base + 'observations.json').then(r => r.json()),
        fetch(base + 'fossiles.json').then(r => r.json()),
        fetch(base + 'pages.json').then(r => r.json()),
      ]);
      _data.descentes    = desc;
      _data.observations = obs;
      _data.fossiles     = fos;
      _data.pages        = pag;
      _showStatus('Données cenoutil chargées', 'ok');
    } catch(e) {
      _showStatus('Données locales non disponibles — import manuel requis', 'warn');
      console.warn('Chargement distant échoué:', e);
    }
  }

  /* ── Initialisation ── */
  async function init() {
    await _loadData();

    EditDescentes.init(_data.descentes);
    EditObservations.init(_data.observations);
    EditFossiles.init(_data.fossiles);
    EditPages.init(_data.pages);

    _initNavigation();
    _initImport();
    _initExportButtons();
    _activerPanel('dashboard');
    Export.updateStats();
  }

  /* ── Navigation sidebar ── */
  function _initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => _activerPanel(btn.dataset.panel));
    });
  }

  function _activerPanel(nom) {
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.panel === nom));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('active', p.id === `panel-${nom}`));
    currentPanel = nom;
    if (nom === 'dashboard') Export.updateStats();
  }

  /* ── Import JSON depuis fichier ── */
  function _initImport() {
    const imports = {
      'import-obs':  f => { _data.observations = JSON.parse(f); EditObservations.init(_data.observations); },
      'import-desc': f => { _data.descentes = JSON.parse(f);    EditDescentes.init(_data.descentes); },
      'import-fos':  f => { _data.fossiles = JSON.parse(f);     EditFossiles.init(_data.fossiles); },
      'import-pages':f => { _data.pages = JSON.parse(f);        EditPages.init(_data.pages); },
    };

    Object.entries(imports).forEach(([id, handler]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          try {
            handler(e.target.result);
            markDirty();
            toast(`${file.name} importé`, 'success');
            Export.updateStats();
          } catch(err) {
            toast('Erreur lecture JSON : ' + err.message, 'error');
          }
          input.value = '';
        };
        reader.readAsText(file);
      });
    });
  }

  /* ── Boutons export ── */
  function _initExportButtons() {
    document.getElementById('btn-export-obs')?.addEventListener('click',  Export.exportObservations);
    document.getElementById('btn-export-desc')?.addEventListener('click', Export.exportDescentes);
    document.getElementById('btn-export-fos')?.addEventListener('click',  Export.exportFossiles);
    document.getElementById('btn-export-pages')?.addEventListener('click',Export.exportPages);
    document.getElementById('btn-export-all')?.addEventListener('click',  Export.exportAll);
  }

  /* ── Indicateur données modifiées ── */
  function markDirty() {
    dirty = true;
    const el = document.getElementById('dirty-indicator');
    if (el) { el.textContent = '● Non exporté'; el.style.color = '#e5a020'; }
  }

  function markClean() {
    dirty = false;
    const el = document.getElementById('dirty-indicator');
    if (el) { el.textContent = '✓ À jour'; el.style.color = '#2d7a4f'; }
  }

  /* ── Toast notifications ── */
  function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : '');
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  /* ── Modal confirmation ── */
  function confirm(title, body, onOk) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl  = document.getElementById('modal-body');
    const btnOk   = document.getElementById('modal-ok');
    const btnCancel = document.getElementById('modal-cancel');

    if (!overlay) { if (window.confirm(title + '\n' + body)) onOk(); return; }

    titleEl.textContent = title;
    bodyEl.textContent  = body;
    overlay.classList.add('active');

    const close = () => overlay.classList.remove('active');
    btnOk.onclick     = () => { close(); onOk(); };
    btnCancel.onclick = close;
    overlay.onclick   = e => { if (e.target === overlay) close(); };
  }

  /* ── Status bar ── */
  function _showStatus(msg, type) {
    const el = document.getElementById('sidebar-status');
    if (el) {
      el.textContent = msg;
      el.style.color = type === 'ok' ? 'rgba(255,255,255,0.5)' : '#e5a020';
    }
  }

  /* Exposition publique */
  window.App = { init, toast, confirm, markDirty, markClean };

  return { init, toast, confirm, markDirty, markClean };

})();

document.addEventListener('DOMContentLoaded', App.init);
