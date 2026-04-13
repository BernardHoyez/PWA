/* editeur-descentes.js — Éditeur des 13 points d'accès falaise */

'use strict';

const EditDescentes = (() => {

  let data = [];
  let selected = null;
  let gpsBinding = null;

  const ETATS = ['Très bon', 'Bon', 'Entretenu', 'Moyen', 'Délicat', 'Difficile', 'Très difficile'];

  function init(descentesData) {
    data = descentesData || [];
    _renderList();
    _bindFormEvents();
    _showEmpty();
  }

  function _renderList(filter = '') {
    const container = document.getElementById('desc-list-items');
    if (!container) return;
    const q = filter.toLowerCase();
    const filtered = data.filter(d =>
      !q || d.nom.toLowerCase().includes(q) || (d.etat || '').toLowerCase().includes(q)
    );
    document.getElementById('desc-count').textContent =
      `${filtered.length} / ${data.length}`;

    container.innerHTML = '';
    filtered.forEach(site => {
      const div = document.createElement('div');
      div.className = 'list-item' + (selected?.id === site.id ? ' selected' : '');
      div.dataset.id = site.id;
      div.innerHTML = `
        <div class="list-item-title">${site.id}. ${site.nom}</div>
        <div class="list-item-sub">${site.etat || '—'}</div>`;
      div.addEventListener('click', () => selectionner(site.id));
      container.appendChild(div);
    });
  }

  function selectionner(id) {
    selected = data.find(d => d.id === id) || null;
    _renderList(document.getElementById('desc-search')?.value || '');
    if (selected) _remplirFormulaire(selected);
    else _showEmpty();
  }

  function _remplirFormulaire(site) {
    document.getElementById('desc-form-wrap').classList.remove('hidden');
    document.getElementById('desc-empty-state').classList.add('hidden');

    document.getElementById('desc-form-id').value   = site.id;
    document.getElementById('desc-form-nom').value  = site.nom || '';
    document.getElementById('desc-form-gps').value  =
      site.lat && site.lng ? GPS.toDM(site.lat, site.lng) : '';
    document.getElementById('desc-form-acces').value= site.acces || '';
    document.getElementById('desc-form-desc').value = site.description || '';
    document.getElementById('desc-form-etat').value = site.etat || 'Bon';

    const preview = document.getElementById('desc-form-preview');
    const photoPath = document.getElementById('desc-form-photo-path');
    if (preview && site.photo) {
      preview.src = '../cenoutil_v2/' + site.photo;
      preview.classList.add('visible');
    } else if (preview) { preview.classList.remove('visible'); }
    if (photoPath) photoPath.textContent = site.photo || 'Aucune photo';

    if (gpsBinding) gpsBinding.validate();
  }

  function _showEmpty() {
    document.getElementById('desc-form-wrap')?.classList.add('hidden');
    document.getElementById('desc-empty-state')?.classList.remove('hidden');
  }

  function _bindFormEvents() {
    document.getElementById('desc-search')?.addEventListener('input', e =>
      _renderList(e.target.value));

    document.getElementById('btn-desc-save')?.addEventListener('click', _sauvegarder);

    const sel = document.getElementById('desc-form-etat');
    if (sel) sel.innerHTML = ETATS.map(e => `<option>${e}</option>`).join('');

    const gpsInput  = document.getElementById('desc-form-gps');
    const gpsStatus = document.getElementById('desc-gps-status');
    if (gpsInput && gpsStatus) gpsBinding = GPS.bindInput(gpsInput, gpsStatus);

    const photoInput = document.getElementById('desc-form-photo');
    const preview    = document.getElementById('desc-form-preview');
    if (photoInput && preview) {
      photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        preview.src = URL.createObjectURL(file);
        preview.classList.add('visible');
        document.getElementById('desc-form-photo-path').textContent =
          'photos/' + file.name;
      });
    }
  }

  function _sauvegarder() {
    if (!selected) return;
    const nom = document.getElementById('desc-form-nom').value.trim();
    if (!nom) { App.toast('Le nom est obligatoire', 'error'); return; }

    const gpsCoords = gpsBinding?.getCoords();
    const gpsStr    = document.getElementById('desc-form-gps').value.trim();
    if (gpsStr && !gpsCoords) {
      App.toast('Coordonnées GPS invalides', 'error'); return;
    }

    selected.nom         = nom;
    selected.lat         = gpsCoords?.lat ?? selected.lat;
    selected.lng         = gpsCoords?.lng ?? selected.lng;
    selected.acces       = document.getElementById('desc-form-acces').value.trim();
    selected.description = document.getElementById('desc-form-desc').value.trim();
    selected.etat        = document.getElementById('desc-form-etat').value;

    const photoPath = document.getElementById('desc-form-photo-path').textContent;
    if (photoPath && photoPath !== 'Aucune photo') selected.photo = photoPath;

    _renderList(document.getElementById('desc-search')?.value || '');
    App.markDirty();
    App.toast(`"${nom}" mis à jour`, 'success');
  }

  function getData() { return data; }

  return { init, getData };

})();

window.EditDescentes = EditDescentes;
