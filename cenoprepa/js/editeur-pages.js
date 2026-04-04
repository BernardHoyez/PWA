/* editeur-pages.js — Éditeur des pages d'information */

'use strict';

const EditPages = (() => {

  let data = [];
  let selected = null;

  function init(pagesData) {
    data = pagesData || [];
    _renderList();
    _showEmpty();
  }

  function _renderList() {
    const container = document.getElementById('pages-list-items');
    if (!container) return;
    container.innerHTML = '';
    data.forEach(page => {
      const div = document.createElement('div');
      div.className = 'list-item' + (selected?.id === page.id ? ' selected' : '');
      div.dataset.id = page.id;
      div.innerHTML = `
        <div class="list-item-title">${page.titre}</div>
        <div class="list-item-sub">${page.resume || ''}</div>`;
      div.addEventListener('click', () => selectionner(page.id));
      container.appendChild(div);
    });
    document.getElementById('pages-count').textContent =
      `${data.length} page${data.length > 1 ? 's' : ''}`;
  }

  function selectionner(id) {
    selected = data.find(p => p.id === id) || null;
    _renderList();
    if (selected) _remplirFormulaire(selected);
    else _showEmpty();
  }

  function _remplirFormulaire(page) {
    document.getElementById('pages-form-wrap').classList.remove('hidden');
    document.getElementById('pages-empty-state').classList.add('hidden');

    document.getElementById('pages-form-id').value     = page.id;
    document.getElementById('pages-form-titre').value  = page.titre || '';
    document.getElementById('pages-form-resume').value = page.resume || '';

    // Contenu : convertir les blocs en texte éditable simplifié
    const contenuEl = document.getElementById('pages-form-contenu');
    if (contenuEl) {
      contenuEl.value = _blocsToText(page.contenu || []);
    }

    // Bannière
    const photoPath = document.getElementById('pages-form-photo-path');
    const preview   = document.getElementById('pages-form-preview');
    if (photoPath) photoPath.textContent = page.image_banniere || 'Aucune image';
    if (preview && page.image_banniere) {
      preview.src = '../cenoutil_v2/' + page.image_banniere;
      preview.classList.add('visible');
    } else if (preview) { preview.classList.remove('visible'); }
  }

  function _showEmpty() {
    document.getElementById('pages-form-wrap')?.classList.add('hidden');
    document.getElementById('pages-empty-state')?.classList.remove('hidden');
  }

  /* Conversion blocs → texte éditable avec marqueurs simples */
  function _blocsToText(blocs) {
    return blocs.map(b => {
      if (b.type === 'paragraphe') return b.texte;
      if (b.type === 'figure')     return `[FIGURE: ${b.src} | ${b.legende || ''}]`;
      if (b.type === 'tableau_acces') return '[TABLEAU_ACCES]';
      return '';
    }).join('\n\n');
  }

  /* Conversion texte → blocs */
  function _textToBlocs(txt) {
    const lignes = txt.split(/\n\n+/);
    return lignes.map(l => {
      l = l.trim();
      if (!l) return null;
      const figMatch = l.match(/^\[FIGURE:\s*(.+?)\s*\|\s*(.*?)\]$/);
      if (figMatch) return { type: 'figure', src: figMatch[1], legende: figMatch[2] };
      if (l === '[TABLEAU_ACCES]') return { type: 'tableau_acces', sites: [] };
      return { type: 'paragraphe', texte: l };
    }).filter(Boolean);
  }

  function _bindFormEvents() {
    document.getElementById('btn-pages-new')?.addEventListener('click', _nouvelle);
    document.getElementById('btn-pages-save')?.addEventListener('click', _sauvegarder);
    document.getElementById('btn-pages-delete')?.addEventListener('click', _supprimer);

    const photoInput = document.getElementById('pages-form-photo');
    const preview    = document.getElementById('pages-form-preview');
    if (photoInput && preview) {
      photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        preview.src = URL.createObjectURL(file);
        preview.classList.add('visible');
        document.getElementById('pages-form-photo-path').textContent =
          'photos/pages/' + file.name;
      });
    }
  }

  function _nouvelle() {
    const id = 'page_' + String(Date.now()).slice(-5);
    const page = {
      id, titre: 'Nouvelle page', resume: '',
      image_banniere: '', contenu: [],
    };
    data.push(page);
    selectionner(id);
    App.toast('Nouvelle page créée', 'warning');
  }

  function _sauvegarder() {
    if (!selected) return;
    const titre = document.getElementById('pages-form-titre').value.trim();
    if (!titre) { App.toast('Le titre est obligatoire', 'error'); return; }

    selected.titre  = titre;
    selected.resume = document.getElementById('pages-form-resume').value.trim();
    selected.contenu = _textToBlocs(document.getElementById('pages-form-contenu').value);

    const photoPath = document.getElementById('pages-form-photo-path').textContent;
    if (photoPath && photoPath !== 'Aucune image') selected.image_banniere = photoPath;

    _renderList();
    App.markDirty();
    App.toast(`"${titre}" sauvegardé`, 'success');
  }

  function _supprimer() {
    if (!selected) return;
    App.confirm(`Supprimer la page "${selected.titre}" ?`, 'Action irréversible.', () => {
      data = data.filter(p => p.id !== selected.id);
      selected = null;
      _renderList();
      _showEmpty();
      App.markDirty();
      App.toast('Page supprimée', 'warning');
    });
  }

  function getData() { return data; }

  document.addEventListener('DOMContentLoaded', _bindFormEvents);

  return { init, getData };

})();

window.EditPages = EditPages;
