/* infos.js — Module pages d'information pour cenoutil */

'use strict';

const Infos = (() => {

  let data = [];

  /* ── Initialisation ── */
  function init(pagesData) {
    data = pagesData;
    _renderListe();
  }

  /* ── Liste des fiches ── */
  function _renderListe() {
    const container = document.getElementById('info-list');
    if (!container) return;

    let html = '';
    data.forEach(page => {
      html += `
        <div class="info-card" data-id="${page.id}" role="button" tabindex="0">
          <div class="info-card-title">${page.titre}</div>
          <div class="info-card-sub">${page.resume}</div>
          ${page.image_banniere
            ? `<div class="info-card-img">
                <img src="${page.image_banniere}" alt="${page.titre}"
                  style="width:100%;height:100%;object-fit:cover;"
                  onerror="this.parentElement.style.display='none'">
               </div>`
            : ''}
        </div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.info-card').forEach(card => {
      card.addEventListener('click', () => ouvrirPage(card.dataset.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') ouvrirPage(card.dataset.id); });
    });
  }

  /* ── Ouverture d'une page ── */
  function ouvrirPage(pageId) {
    const page = data.find(p => p.id === pageId);
    if (!page) return;

    const detail = document.getElementById('info-detail');
    if (!detail) return;

    detail.querySelector('.info-detail-page-title').textContent = page.titre;
    const content = detail.querySelector('.info-detail-content');
    content.innerHTML = `<h2>${page.titre}</h2>` + _renderContenu(page.contenu);

    detail.classList.add('active');
    content.scrollTop = 0;
  }

  /* ── Fermeture ── */
  function fermerPage() {
    const detail = document.getElementById('info-detail');
    if (detail) detail.classList.remove('active');
  }

  /* ── Rendu du contenu d'une page ── */
  function _renderContenu(contenu) {
    let html = '';
    contenu.forEach(bloc => {
      switch (bloc.type) {
        case 'paragraphe':
          html += `<p>${bloc.texte}</p>`;
          break;

        case 'figure':
          html += `
            <figure>
              <img src="${bloc.src}" alt="${bloc.legende || ''}"
                onerror="this.parentElement.style.display='none'">
              ${bloc.legende ? `<figcaption>${bloc.legende}</figcaption>` : ''}
            </figure>`;
          break;

        case 'tableau_acces':
          html += `<div style="margin:12px 0;">`;
          bloc.sites.forEach(site => {
            const etatColor = {
              'Très bon': '#2d7a4f', 'Bon': '#4a9465',
              'Entretenu': '#4a9465', 'Moyen': '#e5a020',
              'Délicat': '#e5a020', 'Difficile': '#c0392b',
              'Très difficile': '#c0392b'
            }[site.etat] || '#888';

            html += `
              <div style="border:0.5px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px;background:var(--bg);">
                <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px;">
                  <span style="font-size:11px;font-weight:700;color:var(--vert);min-width:20px;">${site.num}</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">${site.nom}</span>
                  <span style="font-size:10px;color:${etatColor};margin-left:auto;font-weight:600;">${site.etat}</span>
                </div>
                <div style="font-size:11px;color:var(--text-sec);padding-left:28px;line-height:1.4;">${site.acces}</div>
                <div style="font-size:10px;color:var(--text-ter);padding-left:28px;font-family:monospace;margin-top:3px;">${site.lat} · ${site.lng}</div>
              </div>`;
          });
          html += `</div>`;
          break;
      }
    });
    return html;
  }

  return { init, ouvrirPage, fermerPage };

})();

window.Infos = Infos;
