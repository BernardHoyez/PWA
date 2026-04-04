# cenoutil — PWA Cénomanien normand

Application terrain hors ligne pour l'étude du Cénomanien des falaises normandes
entre Le Havre et Étretat.

**Auteurs de l'ouvrage de référence :** B. Hoyez, J. Girard, N. Cottard

## Déploiement GitHub Pages

URL : `https://BernardHoyez.github.io/PWA/cenoutil/`

Placer le dossier `cenoutil/` dans le dossier `PWA/` du dépôt GitHub Pages.

## Structure des fichiers

```
cenoutil/
├── index.html          ← Application principale
├── manifest.json       ← Manifest PWA
├── sw.js               ← Service Worker (offline)
├── css/
│   └── style.css       ← Styles
├── js/
│   ├── app.js          ← Contrôleur principal
│   ├── mbtiles.js      ← Lecteur MBTiles (sql.js + OPFS)
│   ├── carte.js        ← Module carte (Leaflet)
│   ├── infos.js        ← Module pages d'information
│   └── fossiles.js     ← Module catalogue fossiles
├── data/
│   ├── markers.json    ← 13 sites géolocalisés
│   ├── fossiles.json   ← Catalogue fossiles (11 groupes)
│   └── pages.json      ← Contenu des pages d'information
├── photos/             ← Photos (à alimenter)
│   ├── README.md
│   ├── fossiles/
│   └── pages/
└── icons/
    ├── icon192.png     ← Icône PWA (ammonite verte)
    └── icon512.png     ← Icône PWA large

```

## Fond de carte MBTiles

Le fond IGN BD ORTHO est fourni par littoextract
(https://BernardHoyez.github.io/PWA/littoextract).

Dans l'application :
1. Générer le `.mbtiles` avec littoextract
2. Dans cenoutil > Carte : bouton 📁 MBTiles pour importer le fichier
3. Le fichier est sauvegardé dans l'OPFS du navigateur pour usage hors ligne

**Format attendu :** MBTiles, schéma TMS, niveaux z15–17, JPEG

## Alimenter le contenu

- **Marqueurs** : éditer `data/markers.json`
- **Fossiles** : éditer `data/fossiles.json`
- **Pages info** : éditer `data/pages.json`
- **Photos** : placer dans `photos/` selon les chemins définis dans les JSON

## Gestion par cenoprepa

Cette application est destinée à être gérée par cenoprepa,
l'outil expert de création et mise à jour du contenu.
