# IGN2MBT – Générateur MBTiles depuis la Géoplateforme IGN

**PWA déployée sur :** https://bernardhoyez.github.io/PWA/ign2mbt/

---

## Description

Application web progressive (PWA) permettant de générer un fichier `.mbtiles` (SQLite)
depuis la géoplateforme IGN, à partir d'une sélection rectangulaire dessinée à la souris
sur un fond de carte OpenStreetMap.

---

## Fonctionnement

1. **Entrer la clé API IGN** dans le champ prévu (obtenir sur https://geoservices.ign.fr/)
2. **Sélectionner la couche WMTS** souhaitée (Scan, PlanIGNv2, Orthophotos…)
3. **Choisir les niveaux de zoom** min et max
4. **Dessiner un rectangle** sur la carte en cliquant-glissant
5. **Cliquer sur « Générer .mbtiles »** — le fichier est téléchargé automatiquement

---

## Structure des fichiers

```
ign2mbt/
├── index.html          Application principale (PWA)
├── manifest.json       Manifeste PWA (installation sur écran d'accueil)
├── sw.js               Service Worker (mise en cache offline)
├── IGN_scan_rando.bsh  Script MOBAC modèle (clé anonymisée)
├── icon192.png         Icône PWA 192×192 px  ← À fournir
├── icon512.png         Icône PWA 512×512 px  ← À fournir
└── README.md           Ce fichier
```

---

## Icônes (à créer)

Les fichiers `icon192.png` et `icon512.png` sont des **placeholders** à remplacer.
Vous pouvez les générer avec n'importe quel éditeur graphique ou via :
- https://realfavicongenerator.net/
- https://maskable.app/editor

---

## Format MBTiles

Le fichier `.mbtiles` généré suit la [spécification MBTiles 1.3](https://github.com/mapbox/mbtiles-spec) :
- Table `metadata` : nom, format, bounds, zoom min/max, description
- Table `tiles` : `(zoom_level, tile_column, tile_row, tile_data)`
- Index unique sur `(zoom_level, tile_column, tile_row)`
- Coordonnée Y en convention **TMS** (y inversé vs. XYZ)

Compatible avec : **MOBAC**, **OruxMaps**, **RMaps**, **Locus Map**, **QGIS**, etc.

---

## Fichier MOBAC (.bsh)

Le fichier `IGN_scan_rando.bsh` est un script BeanShell pour
[Mobile Atlas Creator (MOBAC)](https://mobac.sourceforge.io/).
Il est fourni à titre de référence avec la clé API anonymisée.

**Pour l'utiliser :**
1. Remplacer `VOTRE_CLE_IGN` par votre vraie clé
2. Copier le fichier dans le dossier `beanshell/` de MOBAC

---

## Notes techniques

- Les tuiles IGN nécessitent une **clé API valide** sur `data.geopf.fr`
- Pour les zooms < 7, les tuiles Google Maps sont utilisées en fallback (comme dans le .bsh modèle)
- Le moteur SQLite est fourni par [sql.js](https://sql-js.github.io/sql.js/) (WebAssembly)
- La carte de fond utilise [Leaflet](https://leafletjs.com/) + tuiles OSM

---

## Avertissements

- Respectez les **conditions d'utilisation de l'IGN** et les limites de votre clé API
- La génération de nombreuses tuiles (> 50 000) peut être très longue et produire des fichiers volumineux
- Cette application télécharge les tuiles directement depuis votre navigateur — assurez-vous que votre clé autorise ce type d'accès

---

## Déploiement GitHub Pages

Pousser ce dossier dans le dépôt `bernardhoyez/PWA` sous `PWA/ign2mbt/`.
GitHub Pages sert automatiquement `index.html` depuis ce chemin.
