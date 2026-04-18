/* fossiles.js — Module catalogue fossiles pour cenoutil */

'use strict';

const Fossiles = (() => {

  let data = [];          // Données JSON complètes
  let filtreGroupe = 'tous';
  let recherche = '';

  /* ── Initialisation ── */
  async function init(fossilesData) {
    data = fossilesData;
    _renderPills();
    _renderListe();
    _bindEvents();
  }

  /* ── Génération des pastilles de groupes ── */
  function _renderPills() {
    const container = document.getElementById('fossil-pills');
    if (!container) return;

    const groupes = data.map(g => ({ id: g.groupe_id, label: g.groupe.split(' — ')[0] }));

    let html = `<button class="pill active" data-groupe="tous">Tous</button>`;
    groupes.forEach(g => {
      html += `<button class="pill" data-groupe="${g.id}">${g.label}</button>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtreGroupe = btn.dataset.groupe;
        _renderListe();
      });
    });
  }

  /* ── Rendu de la liste filtrée ── */
  function _renderListe() {
    const container = document.getElementById('fossil-list');
    if (!container) return;

    const q = recherche.toLowerCase().trim();

    let html = '';
    data.forEach(groupe => {
      if (filtreGroupe !== 'tous' && groupe.groupe_id !== filtreGroupe) return;

      const especes = groupe.especes.filter(e => {
        if (!q) return true;
        return e.nom.toLowerCase().includes(q) ||
               (e.famille && e.famille.toLowerCase().includes(q)) ||
               (e.etage && e.etage.toLowerCase().includes(q));
      });

      if (!especes.length) return;

      html += `
        <div class="fossil-group-label">
          ${groupe.groupe}
          <span class="group-badge">${especes.length}</span>
        </div>`;

      especes.forEach(e => {
        html += `
          <div class="fossil-item" data-id="${e.id}" role="button" tabindex="0">
            <div class="fossil-thumb">
              ${e.photo
                ? `<img src="${e.photo}" alt="${e.nom}" onerror="this.parentElement.innerHTML='<svg width=24 height=24 viewBox=&quot;0 0 28 28&quot;><circle cx=14 cy=14 r=13 fill=&quot;#e8f3e8&quot;/></svg>'">`
                : '<svg width="24" height="24" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#e8f3e8"/><g transform="translate(14,14)" fill="none" stroke="#2d7a4f" stroke-linecap="round" stroke-width="1"><path d="M2,0 C3,-.5 4,-1.5 5.5,-2 C7,-2.5 8,-1.5 8,0 C8,1.5 7,3 5.5,4 C4,5 2,5.5 0,5 C-2,4.5 -3.5,3 -4,1 C-4.5,-1 -4,-3 -2.5,-4.5 C-1,-6 1,-6.5 3,-6 C5,-5.5 6.5,-4 7,-2.5" stroke-width="1.2"/><circle cx="0" cy="0" r="2" fill="#2d7a4f"/></g></svg>'
              }
            </div>
            <div>
              <div class="fossil-name">${e.nom}</div>
              <div class="fossil-group">${e.famille || ''} · ${e.etage || ''}</div>
            </div>
            <span class="fossil-chev">›</span>
          </div>`;
      });
    });

    if (!html) {
      html = `<div style="padding:24px;text-align:center;color:var(--text-ter);font-size:13px;">
        Aucun résultat pour « ${q} »
      </div>`;
    }

    container.innerHTML = html;

    // Événements clic
    container.querySelectorAll('.fossil-item').forEach(item => {
      item.addEventListener('click', () => ouvrirFiche(item.dataset.id));
      item.addEventListener('keydown', e => { if (e.key === 'Enter') ouvrirFiche(item.dataset.id); });
    });
  }

  /* ── Ouverture fiche fossile ── */
  function ouvrirFiche(espId) {
    let espece = null;
    let groupeLabel = '';
    data.forEach(g => {
      const found = g.especes.find(e => e.id === espId);
      if (found) { espece = found; groupeLabel = g.groupe; }
    });
    if (!espece) return;

    const detail = document.getElementById('fossil-detail');
    if (!detail) return;

    const photo = detail.querySelector('.fossil-detail-photo');
    if (photo) {
      if (espece.photo) {
        photo.style.display = 'block';
        photo.onerror = () => {
          /* Photo introuvable : afficher un message avec le chemin attendu */
          photo.style.display = 'none';
          const errEl = detail.querySelector('.fossil-photo-error');
          if (errEl) {
            errEl.textContent = '⚠ Photo non trouvée : ' + espece.photo;
            errEl.style.display = 'block';
          }
        };
        photo.onload = () => {
          const errEl = detail.querySelector('.fossil-photo-error');
          if (errEl) errEl.style.display = 'none';
        };
        photo.src = espece.photo;
      } else {
        photo.style.display = 'none';
      }
    }

    detail.querySelector('.fossil-detail-name').textContent = espece.nom;
    detail.querySelector('.fossil-detail-family').textContent =
      `${espece.famille || ''}  ·  ${groupeLabel}`;
    detail.querySelector('.fossil-detail-stage').textContent = espece.etage || '';
    detail.querySelector('.fossil-detail-desc').textContent = espece.description || '';

    const planche = detail.querySelector('.fossil-detail-planche');
    if (planche) {
      planche.textContent = espece.planche ? `Planche ${espece.planche}` : '';
      planche.style.display = espece.planche ? 'inline-block' : 'none';
    }

    detail.classList.add('active');
  }

  /* ── Fermeture fiche fossile ── */
  function fermerFiche() {
    const detail = document.getElementById('fossil-detail');
    if (detail) detail.classList.remove('active');
  }

  /* ── Événements recherche ── */
  function _bindEvents() {
    const input = document.getElementById('fossil-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      recherche = input.value;
      _renderListe();
    });
  }

  return { init, ouvrirFiche, fermerFiche };

})();

window.Fossiles = Fossiles;
