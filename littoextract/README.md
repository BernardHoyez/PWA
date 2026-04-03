# LittoExtract

PWA d'extraction de tuiles orthophoto IGN le long du littoral normand.

## Déploiement

Déployer sur GitHub Pages à l'adresse :
```
https://BernardHoyez.github.io/PWA/littoextract/
```

### Structure du dépôt

```
PWA/
└── littoextract/
    ├── index.html
    ├── app.js
    ├── style.css
    ├── sw.js
    ├── manifest.json
    ├── coastline.geojson
    └── icons/
        ├── icon192.png   ← À remplacer par votre icône personnalisée
        └── icon512.png   ← À remplacer par votre icône personnalisée
```

## Fonctionnalités

### Onglet Extraire
- Visualisation du trait de côte Le Havre → Étretat sur fond IGN Plan
- Buffer ±200 m affiché en surimpression (cyan)
- Calcul automatique du nombre de tuiles par niveau de zoom
- Téléchargement des tuiles BD ORTHO 20 cm (Géoplateforme IGN)
  - Concurrence : 6 requêtes simultanées
  - Reprise automatique en cas d'erreur (3 tentatives)
  - Bouton d'interruption
- Export en fichier `.mbtiles` (SQLite, convention TMS)

### Onglet Visualiser
- Carte hors-ligne alimentée par les tuiles téléchargées
- Navigation le long du trait de côte (slider + boutons)
- Waypoints tous les ~1 km entre Le Havre et Étretat
- Fonctionne sans réseau via Service Worker

## Configuration (app.js)

```js
const CONFIG = {
  BUFFER_KM:    0.2,   // Bande littorale : ±200 m
  ZOOM_MIN:     15,
  ZOOM_MAX:     17,
  CONCURRENCY:  6,     // Requêtes parallèles
  IGN_TMS:      'https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/{z}/{x}/{y}.jpeg',
};
```

## Données géographiques

Le fichier `coastline.geojson` contient une approximation du trait de côte
entre Le Havre et Étretat. Pour une précision maximale, remplacer par les
données officielles **HISTOLITT** disponibles sur :
- https://www.data.gouv.fr (rechercher "histolitt")
- https://data.shom.fr

Format attendu : GeoJSON `Feature` avec géométrie `LineString`,
coordonnées en WGS84 (lon/lat), du Havre vers Étretat.

## Icônes

Remplacer les placeholders dans `icons/` par vos icônes personnalisées :
- `icon192.png` — 192×192 px
- `icon512.png` — 512×512 px

## Dépendances CDN

| Lib | Version | Usage |
|-----|---------|-------|
| MapLibre GL JS | 4.1.3 | Carte interactive |
| Turf.js | 6.5.0 | Buffer géospatial, calculs |
| sql.js | 1.10.3 | SQLite WASM (export MBTiles) |

## Notes techniques

- **Inversion axe Y MBTiles** : le format MBTiles utilise la convention TMS
  (`tile_row = 2^z - 1 - y`). La conversion est appliquée à l'export.
- **Service Worker** : les tuiles sont transmises depuis le thread principal
  vers le SW via `postMessage` pour être servies à MapLibre lors du mode
  visualiseur hors-ligne.
- **Taille estimée** : ~25 Ko/tuile JPEG en moyenne.
  Pour 5 000 tuiles → ~125 Mo de fichier MBTiles.

## Utilisation en production hors-ligne

Le fichier `.mbtiles` généré est compatible avec :
- **MB-Util** (conversion en dossier de tuiles)
- **TileServer GL** (serveur de tuiles local)
- **QGIS** (plugin QTiles / visualisation directe)
- Toute application acceptant une source de tuiles MBTiles

## Licence

Usage personnel et non-commercial.
Données IGN © Institut national de l'information géographique et forestière —
Géoplateforme — Licence Ouverte Etalab 2.0.
