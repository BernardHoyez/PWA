/* editeur-fossiles.js — Éditeur du catalogue de fossiles */

'use strict';

const EditFossiles = (() => {

  let data = [];           // groupes[]
  let selectedGroupe = null;
  let selectedEspece = null;

  function init(fossilesData) {
    data = fossilesData || [];
    _renderGroupes();
    _showEmpty();
  }

  /* ── Groupes ── */
  function _renderGroupes(filter = '') {
    const container = document.getElementById('fos-list-items');
    if (!container) return;
    const q = filter.toLowerCase();

    let total = 0;
    container.innerHTML = '';

    data.forEach(groupe => {
      const especes = groupe.especes.filter(e =>
        !q || e.nom.toLowerCase().includes(q) ||
        (e.famille || '').toLowerCase().includes(q) ||
        (e.etage || '').toLowerCase().includes(q)
      );
      if (q && !especes.length) return;
      total += especes.length;

      // En-tête groupe
      const header = document.createElement('div');
      header.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;' +
        'letter-spacing:.8px;color:var(--text-ter);padding:10px 10px 3px;';
      header.textContent = groupe.groupe;
      container.appendChild(header);

      // Espèces
      especes.forEach(esp => {
        const div = document.createElement('div');
        const isSelected = selectedEspece?.id === esp.id;
        div.className = 'list-item' + (isSelected ? ' selected' : '');
        div.dataset.id = esp.id;
        div.innerHTML = `
          <div class="list-item-title italic">${esp.nom}</div>
          <div class="list-item-sub">${esp.famille || ''} · ${esp.etage || ''}</div>`;
        div.addEventListener('click', () => selectionnerEspece(groupe.groupe_id, esp.id));
        container.appendChild(div);
      });
    });

    document.getElementById('fos-count').textContent =
      `${total} espèces / ${data.length} groupes`;
  }

  function selectionnerEspece(groupeId, espId) {
    selectedGroupe = data.find(g => g.groupe_id === groupeId);
    selectedEspece = selectedGroupe?.especes.find(e => e.id === espId) || null;
    _renderGroupes(document.getElementById('fos-search')?.value || '');
    if (selectedEspece) _remplirFormulaire(selectedEspece, selectedGroupe);
    else _showEmpty();
  }

  function _remplirFormulaire(esp, groupe) {
    document.getElementById('fos-form-wrap').classList.remove('hidden');
    document.getElementById('fos-empty-state').classList.add('hidden');

    document.getElementById('fos-form-id').value      = esp.id;
    document.getElementById('fos-form-nom').value     = esp.nom || '';
    document.getElementById('fos-form-famille').value = esp.famille || '';
    document.getElementById('fos-form-etage').value   = esp.etage || '';
    document.getElementById('fos-form-planche').value = esp.planche || '';
    document.getElementById('fos-form-desc').value    = esp.description || '';
    document.getElementById('fos-form-groupe').value  = groupe?.groupe_id || '';

    const preview = document.getElementById('fos-form-preview');
    const photoPath = document.getElementById('fos-form-photo-path');
    if (preview && esp.photo) {
      preview.src = '../cenoutil_v2/' + esp.photo;
      preview.classList.add('visible');
    } else if (preview) { preview.classList.remove('visible'); }
    if (photoPath) photoPath.textContent = esp.photo || 'Aucune photo';
  }

  function _showEmpty() {
    document.getElementById('fos-form-wrap')?.classList.add('hidden');
    document.getElementById('fos-empty-state')?.classList.remove('hidden');
  }

  function _bindFormEvents() {
    document.getElementById('fos-search')?.addEventListener('input', e =>
      _renderGroupes(e.target.value));

    document.getElementById('btn-fos-new')?.addEventListener('click', _nouvelle);
    document.getElementById('btn-fos-save')?.addEventListener('click', _sauvegarder);
    document.getElementById('btn-fos-delete')?.addEventListener('click', _supprimer);

    // Peupler groupes
    const selGroupe = document.getElementById('fos-form-groupe');
    if (selGroupe) {
      selGroupe.innerHTML = data.map(g =>
        `<option value="${g.groupe_id}">${g.groupe}</option>`
      ).join('');
    }

    const photoInput = document.getElementById('fos-form-photo');
    const preview    = document.getElementById('fos-form-preview');
    if (photoInput && preview) {
      photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        preview.src = URL.createObjectURL(file);
        preview.classList.add('visible');
        document.getElementById('fos-form-photo-path').textContent =
          'photos/fossiles/' + file.name;
      });
    }
  }

  function _nouvelle() {
    if (!data.length) { App.toast('Aucun groupe défini', 'error'); return; }
    const groupeId = document.getElementById('fos-form-groupe')?.value || data[0].groupe_id;
    const groupe   = data.find(g => g.groupe_id === groupeId) || data[0];
    const newId    = groupe.groupe_id + '_' + String(Date.now()).slice(-4);
    const esp = {
      id: newId, nom: 'Nouvelle espèce', famille: '', etage: '',
      planche: null, description: '', photo: '',
    };
    groupe.especes.push(esp);
    selectionnerEspece(groupe.groupe_id, newId);
    App.toast('Nouvelle espèce créée — remplissez et sauvegardez', 'warning');
  }

  function _sauvegarder() {
    if (!selectedEspece) return;
    const nom = document.getElementById('fos-form-nom').value.trim();
    if (!nom) { App.toast('Le nom est obligatoire', 'error'); return; }

    // Déplacer vers un autre groupe si changé
    const newGroupeId = document.getElementById('fos-form-groupe').value;
    if (selectedGroupe && selectedGroupe.groupe_id !== newGroupeId) {
      selectedGroupe.especes = selectedGroupe.especes.filter(e => e.id !== selectedEspece.id);
      const target = data.find(g => g.groupe_id === newGroupeId);
      if (target) { target.especes.push(selectedEspece); selectedGroupe = target; }
    }

    selectedEspece.nom       = nom;
    selectedEspece.famille   = document.getElementById('fos-form-famille').value.trim();
    selectedEspece.etage     = document.getElementById('fos-form-etage').value.trim();
    selectedEspece.planche   = parseInt(document.getElementById('fos-form-planche').value) || null;
    selectedEspece.description = document.getElementById('fos-form-desc').value.trim();

    const photoPath = document.getElementById('fos-form-photo-path').textContent;
    if (photoPath && photoPath !== 'Aucune photo') selectedEspece.photo = photoPath;

    _renderGroupes(document.getElementById('fos-search')?.value || '');
    App.markDirty();
    App.toast(`"${nom}" sauvegardé`, 'success');
  }

  function _supprimer() {
    if (!selectedEspece || !selectedGroupe) return;
    App.confirm(
      `Supprimer "${selectedEspece.nom}" ?`,
      'Cette espèce sera retirée du catalogue.',
      () => {
        selectedGroupe.especes = selectedGroupe.especes.filter(e => e.id !== selectedEspece.id);
        selectedEspece = null;
        _renderGroupes();
        _showEmpty();
        App.markDirty();
        App.toast('Espèce supprimée', 'warning');
      }
    );
  }

  function getData() { return data; }

  /* init différé des événements */
  document.addEventListener('DOMContentLoaded', _bindFormEvents);

  return { init, getData };

})();

window.EditFossiles = EditFossiles;
