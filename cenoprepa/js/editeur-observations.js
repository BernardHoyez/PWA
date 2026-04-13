/* editeur-observations.js — Éditeur des marqueurs d'observation */

'use strict';

const EditObservations = (() => {

  let data = [];          // observations[]
  let selected = null;    // observation en cours d'édition
  let gpsBinding = null;  // liaison GPS
  let fossileChips = [];  // liste de fossiles en cours

  const STRATS = [
    '—',
    'Albien (pré-Cénomanien)',
    'Cénomanien inférieur — Ce1',
    'Cénomanien inférieur — Ce2a',
    'Cénomanien moyen — Ce2b',
    'Cénomanien moyen — Ce2c',
    'Cénomanien supérieur — Ce3',
    'Cénomanien terminal',
    'Limite Cénomanien–Turonien',
    'Turonien basal',
    'Indéterminé',
  ];

  /* ── Init ── */
  function init(obsData) {
    data = obsData || [];
    _renderList();
    _bindFormEvents();
    _showEmpty();
  }

  /* ── Liste gauche ── */
  function _renderList(filter = '') {
    const container = document.getElementById('obs-list-items');
    if (!container) return;

    const q = filter.toLowerCase();
    const filtered = data.filter(o =>
      !q || o.nom.toLowerCase().includes(q) ||
      (o.stratigraphie || '').toLowerCase().includes(q) ||
      (o.commentaire || '').toLowerCase().includes(q)
    );

    // Compter
    document.getElementById('obs-count').textContent =
      `${filtered.length} / ${data.length}`;

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = `<div style="padding:20px;text-align:center;
        color:var(--text-ter);font-size:12px;">Aucun résultat</div>`;
      return;
    }

    filtered.forEach(obs => {
      const div = document.createElement('div');
      div.className = 'list-item' + (selected?.id === obs.id ? ' selected' : '');
      div.dataset.id = obs.id;
      div.innerHTML = `
        <div class="list-item-title">${obs.nom}</div>
        <div class="list-item-sub">${obs.stratigraphie || '—'} · ${obs.coords_originales || ''}</div>`;
      div.addEventListener('click', () => selectionner(obs.id));
      container.appendChild(div);
    });
  }

  /* ── Sélectionner une observation ── */
  function selectionner(id) {
    selected = data.find(o => o.id === id) || null;
    _renderList(document.getElementById('obs-search')?.value || '');
    if (selected) _remplirFormulaire(selected);
    else _showEmpty();
  }

  /* ── Remplir le formulaire ── */
  function _remplirFormulaire(obs) {
    document.getElementById('obs-form-wrap').classList.remove('hidden');
    document.getElementById('obs-empty-state').classList.add('hidden');

    document.getElementById('obs-form-id').value     = obs.id;
    document.getElementById('obs-form-nom').value    = obs.nom || '';
    document.getElementById('obs-form-gps').value    = obs.coords_originales || '';
    document.getElementById('obs-form-date').value   = obs.date || '';
    document.getElementById('obs-form-obs').value    = obs.observateurs || '';
    document.getElementById('obs-form-comment').value= obs.commentaire || '';

    // Stratigraphie
    const sel = document.getElementById('obs-form-strat');
    sel.value = obs.stratigraphie || '—';

    // Fossiles en chips
    fossileChips = obs.fossiles
      ? obs.fossiles.split(',').map(f => f.trim()).filter(Boolean)
      : [];
    _renderChips();

    // Photo actuelle
    const photoPath = document.getElementById('obs-form-photo-path');
    if (photoPath) photoPath.textContent = obs.photo || 'Aucune photo';

    const preview = document.getElementById('obs-form-preview');
    if (preview && obs.photo) {
      preview.src = '../cenoutil_v2/' + obs.photo;
      preview.classList.add('visible');
    } else if (preview) {
      preview.classList.remove('visible');
    }

    // Valider GPS
    if (gpsBinding) gpsBinding.validate();
  }

  /* ── Afficher état vide ── */
  function _showEmpty() {
    document.getElementById('obs-form-wrap')?.classList.add('hidden');
    document.getElementById('obs-empty-state')?.classList.remove('hidden');
  }

  /* ── Chips fossiles ── */
  function _renderChips() {
    const wrap = document.getElementById('obs-chips-wrap');
    if (!wrap) return;
    // Vider sauf l'input
    const input = document.getElementById('obs-chips-input');
    wrap.innerHTML = '';

    fossileChips.forEach((f, i) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `${f}<button class="chip-remove" data-i="${i}" title="Retirer">×</button>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        fossileChips.splice(i, 1);
        _renderChips();
      });
      wrap.appendChild(chip);
    });

    // Remettre l'input
    const inp = document.createElement('input');
    inp.id = 'obs-chips-input';
    inp.className = 'chips-input';
    inp.placeholder = 'Ajouter une espèce…';
    inp.setAttribute('autocomplete', 'off');
    inp.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
        e.preventDefault();
        fossileChips.push(inp.value.trim());
        inp.value = '';
        _renderChips();
      }
      if (e.key === 'Backspace' && !inp.value && fossileChips.length) {
        fossileChips.pop();
        _renderChips();
      }
    });
    wrap.appendChild(inp);
    wrap.addEventListener('click', () => inp.focus());
  }

  /* ── Événements du formulaire ── */
  function _bindFormEvents() {
    // Recherche liste
    document.getElementById('obs-search')?.addEventListener('input', e =>
      _renderList(e.target.value));

    // Nouveau
    document.getElementById('btn-obs-new')?.addEventListener('click', _nouveau);

    // Sauvegarder
    document.getElementById('btn-obs-save')?.addEventListener('click', _sauvegarder);

    // Supprimer
    document.getElementById('btn-obs-delete')?.addEventListener('click', _supprimer);

    // GPS validation
    const gpsInput  = document.getElementById('obs-form-gps');
    const gpsStatus = document.getElementById('obs-gps-status');
    if (gpsInput && gpsStatus) {
      gpsBinding = GPS.bindInput(gpsInput, gpsStatus);
    }

    // Peupler le select stratigraphie
    const sel = document.getElementById('obs-form-strat');
    if (sel) {
      sel.innerHTML = STRATS.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Photo upload
    const photoInput = document.getElementById('obs-form-photo');
    const preview    = document.getElementById('obs-form-preview');
    if (photoInput && preview) {
      photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.classList.add('visible');
        document.getElementById('obs-form-photo-path').textContent =
          'photos/observations/' + file.name;
      });
    }
  }

  /* ── Nouveau ── */
  function _nouveau() {
    const now = new Date().toISOString().split('T')[0];
    const newId = 'obs' + String(Date.now()).slice(-6);
    const obs = {
      id: newId, type: 'observation',
      nom: 'Nouvelle observation',
      lat: null, lng: null, coords_originales: '',
      stratigraphie: '—', fossiles: '',
      commentaire: '', date: now,
      observateurs: '', photo: '',
    };
    data.push(obs);
    selectionner(newId);
    App.toast('Nouvelle observation créée — remplissez et sauvegardez', 'warning');
  }

  /* ── Sauvegarder ── */
  function _sauvegarder() {
    if (!selected) return;

    const nom = document.getElementById('obs-form-nom').value.trim();
    if (!nom) { App.toast('Le nom est obligatoire', 'error'); return; }

    const gpsCoords = gpsBinding?.getCoords();
    const gpsStr    = document.getElementById('obs-form-gps').value.trim();
    if (gpsStr && !gpsCoords) {
      App.toast('Coordonnées GPS invalides — vérifiez le format', 'error'); return;
    }

    // Mettre à jour l'objet
    selected.nom              = nom;
    selected.coords_originales= gpsStr;
    selected.lat              = gpsCoords?.lat ?? selected.lat;
    selected.lng              = gpsCoords?.lng ?? selected.lng;
    selected.stratigraphie    = document.getElementById('obs-form-strat').value;
    selected.fossiles         = fossileChips.join(', ');
    selected.commentaire      = document.getElementById('obs-form-comment').value.trim();
    selected.date             = document.getElementById('obs-form-date').value;
    selected.observateurs     = document.getElementById('obs-form-obs').value.trim();

    // Photo
    const photoPath = document.getElementById('obs-form-photo-path').textContent;
    if (photoPath && photoPath !== 'Aucune photo') selected.photo = photoPath;

    _renderList(document.getElementById('obs-search')?.value || '');
    App.markDirty();
    App.toast(`"${nom}" sauvegardé`, 'success');
  }

  /* ── Supprimer ── */
  function _supprimer() {
    if (!selected) return;
    App.confirm(
      `Supprimer "${selected.nom}" ?`,
      'Cette action est irréversible.',
      () => {
        data = data.filter(o => o.id !== selected.id);
        selected = null;
        _renderList();
        _showEmpty();
        App.markDirty();
        App.toast('Observation supprimée', 'warning');
      }
    );
  }

  /* ── API publique ── */
  function getData() { return data; }

  return { init, getData };

})();

window.EditObservations = EditObservations;
