# Marando v4

Éditeur de randonnées KMZ/KML/GPX — version 4.

## Nouveauté v4 — Tracé animé « cortège de fourmis »

Le tracé de randonnée est désormais affiché avec une animation **marching ants** :
- Un fond semi-transparent (vert sombre) indique l'itinéraire au repos
- Des pointillés animés vert clair défilent le long du parcours, simulant un cortège de fourmis
- L'animation est active dans l'**éditeur** (vue KML/GPX/KMZ chargée) et dans le **viewer HTML** généré

## Déploiement

Décompressez l'archive et déposez le dossier `marando_v4/` dans :
```
BernardHoyez.github.io/PWA/marando_v4/
```
URL finale : `https://BernardHoyez.github.io/PWA/marando_v4/`

## Fichiers
```
marando_v4/
├── index.html       Application principale (PWA)
├── sw.js            Service Worker « brise-caches » (VERSION = 'marando-v4')
├── manifest.json    Manifeste PWA
├── icons/
│   ├── icon-192.png Icône placeholder 192×192
│   └── icon-512.png Icône placeholder 512×512
└── README.md
```
