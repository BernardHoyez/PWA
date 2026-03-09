# villes_coord — PWA de géocodage pour QGIS

Application web progressive (PWA) pour géocoder des villes via OpenStreetMap/Nominatim
et exporter un fichier CSV directement importable dans QGIS.

## Déploiement sur GitHub Pages

1. Copier le dossier `villes_coord/` dans votre dépôt à l'emplacement :
   ```
   BernardHoyez.github.io/PWA/villes_coord/
   ```

2. L'application sera accessible à :
   ```
   https://BernardHoyez.github.io/PWA/villes_coord/
   ```

## Structure des fichiers

```
villes_coord/
├── index.html       ← Application complète (HTML + CSS + JS)
├── manifest.json    ← Manifeste PWA
├── sw.js            ← Service Worker (cache + offline)
├── icons/
│   ├── icon192.png  ← Icône PWA 192×192 (placeholder à remplacer)
│   └── icon512.png  ← Icône PWA 512×512 (placeholder à remplacer)
└── README.md
```

## Remplacement des icônes

Les fichiers `icons/icon192.png` et `icons/icon512.png` sont des **placeholders**.
Remplacez-les par vos propres icônes aux dimensions exactes :
- `icon192.png` → 192 × 192 px
- `icon512.png` → 512 × 512 px

Outils recommandés : [Favicon.io](https://favicon.io) ou [RealFaviconGenerator](https://realfavicongenerator.net)

## Fonctionnalités

- Saisie de villes avec géocodage automatique (Nominatim/OSM)
- Affichage de l'initiale, latitude, longitude, nom complet Nominatim
- Sauvegarde locale automatique (localStorage)
- Export CSV encodé UTF-8 BOM (compatible Excel/QGIS)
- Installation PWA (icône sur bureau/mobile)
- Fonctionne hors-ligne (sauf le géocodage)

## Import dans QGIS

1. Couche → Ajouter une couche → **Couche de texte délimité**
2. Sélectionner `villes_qgis.csv`
3. Champ X : `longitude` · Champ Y : `latitude`
4. SCR : **EPSG:4326** (WGS 84)
5. Pour les marqueurs avec initiale : Étiquettes → champ `initiale`

## Format du CSV exporté

```
nom,initiale,latitude,longitude,affichage_nominatim
"Paris","P",48.859490,2.347800,"Paris, Île-de-France, France"
"Lyon","L",45.748000,4.846700,"Lyon, Auvergne-Rhône-Alpes, France"
```
