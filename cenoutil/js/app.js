/* app.js — Contrôleur principal de cenoutil */

'use strict';

/* ── Enregistrement du Service Worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/PWA/cenoutil/sw.js')
      .then(reg => console.log('SW enregistré:', reg.scope))
      .catch(err => console.warn('SW échec:', err));
  });
}

/* ── État de l'application ── */
const App = {
  ongletActif: 'accueil',
  carteInitialisee: false,
  data: { markers: [], fossiles: [], pages: [] },
};

/* ── Démarrage ── */
document.addEventListener('DOMContentLoaded', async () => {
  await _chargerDonnees();
  _initNavigation();
  _initAccueil();
  Infos.init(App.data.pages);
  Fossiles.init(App.data.fossiles);
  _initImportMBTiles();
  _masquerLoading();
});

/* ── Chargement des données JSON ── */
async function _chargerDonnees() {
  const base = '/PWA/cenoutil/data/';
  try {
    const [markers, fossiles, pages] = await Promise.all([
      fetch(base + 'markers.json').then(r => r.json()),
      fetch(base + 'fossiles.json').then(r => r.json()),
      fetch(base + 'pages.json').then(r => r.json()),
    ]);
    App.data.markers  = markers;
    App.data.fossiles = fossiles;
    App.data.pages    = pages;
  } catch (e) {
    console.error('Erreur chargement données:', e);
  }
}

/* ── Navigation entre onglets ── */
function _initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const cible = btn.dataset.screen;
      _activerOnglet(cible);
    });
  });

  // Cartes d'accueil
  document.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => _activerOnglet(card.dataset.screen));
  });
}

function _activerOnglet(nom) {
  // Mise à jour des onglets
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === nom);
  });

  // Mise à jour des écrans
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === `screen-${nom}`);
  });

  App.ongletActif = nom;

  // Initialisation différée de la carte
  if (nom === 'carte' && !App.carteInitialisee) {
    App.carteInitialisee = true;
    Carte.init('map', App.data.markers);
  } else if (nom === 'carte') {
    Carte.invalidateSize();
  }
}

/* ── Accueil ── */
function _initAccueil() {
  // Activer l'onglet accueil au démarrage
  _activerOnglet('accueil');
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

/* ── Masquer l'écran de chargement ── */
function _masquerLoading() {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    setTimeout(() => loading.classList.add('hidden'), 1200);
  }
}

/* ── Retour depuis les fiches détail ── */
function retourInfos() { Infos.fermerPage(); }
function retourCarte() { Carte.fermerFiche(); }
function retourFossiles() { Fossiles.fermerFiche(); }

window.retourInfos = retourInfos;
window.retourCarte = retourCarte;
window.retourFossiles = retourFossiles;
