/* app.js v2 — Contrôleur principal cenoutil
   Charge : descentes (markers.json) + observations (observations.json)
*/

'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PWA/cenoutil/sw.js')
      .then(reg => {
        console.log('[cenoutil] SW enregistré :', reg.scope);

        /* Détecter une mise à jour disponible */
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'activated') {
              /* Nouveau SW actif → proposer le rechargement */
              _notifierMiseAJour();
            }
          });
        });

        /* Vérifier les mises à jour toutes les 60 secondes si en ligne */
        setInterval(() => {
          if (navigator.onLine) reg.update();
        }, 60_000);
      })
      .catch(err => console.warn('[cenoutil] SW échec :', err));
  });

  /* Rechargement automatique si le SW prend le contrôle en cours de session */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[cenoutil] nouveau SW actif — rechargement');
    window.location.reload();
  });
}

function _notifierMiseAJour() {
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed', 'bottom:70px', 'left:50%', 'transform:translateX(-50%)',
    'background:#2d7a4f', 'color:white', 'padding:10px 18px',
    'border-radius:20px', 'font-size:13px', 'font-weight:600',
    'box-shadow:0 3px 12px rgba(0,0,0,0.25)', 'z-index:9999',
    'cursor:pointer', 'white-space:nowrap',
  ].join(';');
  banner.textContent = '↻ Mise à jour disponible — appuyer pour recharger';
  banner.onclick = () => window.location.reload();
  document.body.appendChild(banner);
  /* Auto-disparaît après 10 s */
  setTimeout(() => banner.remove(), 10_000);
}

const App = {
  ongletActif: 'accueil',
  carteInitialisee: false,
  data: { descentes: [], observations: [], fossiles: [], pages: [] },
};

document.addEventListener('DOMContentLoaded', async () => {
  await _chargerDonnees();
  _initNavigation();
  Infos.init(App.data.pages);
  Fossiles.init(App.data.fossiles);
  _initImportMBTiles();
  _activerOnglet('accueil');
  _masquerLoading();
});

/* ── Chargement des données ── */
async function _chargerDonnees() {
  const base = '/PWA/cenoutil/data/';
  try {
    const [descentes, observations, fossiles, pages] = await Promise.all([
      fetch(base + 'markers.json').then(r => r.json()),
      fetch(base + 'observations.json').then(r => r.json()),
      fetch(base + 'fossiles.json').then(r => r.json()),
      fetch(base + 'pages.json').then(r => r.json()),
    ]);
    App.data.descentes    = descentes;
    App.data.observations = observations;
    App.data.fossiles     = fossiles;
    App.data.pages        = pages;
  } catch (e) {
    console.error('Erreur chargement données:', e);
  }
}

/* ── Navigation ── */
function _initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => _activerOnglet(btn.dataset.screen));
  });
  document.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => _activerOnglet(card.dataset.screen));
  });
}

function _activerOnglet(nom) {
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === nom));
  document.querySelectorAll('.screen').forEach(s =>
    s.classList.toggle('active', s.id === `screen-${nom}`));
  App.ongletActif = nom;

  if (nom === 'carte' && !App.carteInitialisee) {
    App.carteInitialisee = true;
    Carte.init('map', App.data.descentes, App.data.observations);
  } else if (nom === 'carte') {
    Carte.invalidateSize();
  }
}

/* ── Import MBTiles ── */
function _initImportMBTiles() {
  const input = document.getElementById('mbtiles-input');
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    await Carte.importMBTiles(file);
    input.value = '';
  });
}

/* ── Loading ── */
function _masquerLoading() {
  const loading = document.getElementById('loading-screen');
  if (loading) setTimeout(() => loading.classList.add('hidden'), 1200);
}

/* ── Retours depuis les fiches ── */
function retourInfos()      { Infos.fermerPage(); }
function retourDescente()   { Carte.fermerDescente(); }
function retourObservation(){ Carte.fermerObservation(); }
function retourFossiles()   { Fossiles.fermerFiche(); }
function fermerPhotoFS()    { Carte.fermerPhotoFullscreen(); }

window.retourInfos      = retourInfos;
window.retourDescente   = retourDescente;
window.retourObservation= retourObservation;
window.retourFossiles   = retourFossiles;
window.fermerPhotoFS    = fermerPhotoFS;
