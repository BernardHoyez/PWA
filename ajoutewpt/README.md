# AjouteWPT

PWA de création de waypoints géolocalisés à partir de photos de randonnée.

## Déploiement sur GitHub Pages

**URL cible :** `https://BernardHoyez.github.io/PWA/ajoutewpt/`

### Structure du dépôt

```
PWA/
└── ajoutewpt/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── sw.js
    ├── manifest.json
    ├── icons/
    │   ├── icon192.png   ← remplacer par icône définitive
    │   └── icon512.png   ← remplacer par icône définitive
    └── README.md
```

### Étapes de déploiement

1. Créer (ou utiliser) le dépôt GitHub `BernardHoyez/PWA`
2. Copier le dossier `ajoutewpt/` dans le dépôt
3. Activer GitHub Pages sur la branche `main` (racine `/`)
4. L'application sera accessible à `https://BernardHoyez.github.io/PWA/ajoutewpt/`

> **Note :** Les icônes `icon192.png` et `icon512.png` sont des placeholders.  
> Remplacez-les par vos propres icônes (fond vert foncé recommandé).

---

## Fonctionnalités

### Étape 1 — Création de waypoints bruts

- Import d'un dossier de photos JPG / PNG par glisser-déposer ou sélecteur
- Génération automatique d'une vignette 100 px de large
- Compression de l'image à 500 ko maximum (qualité maximale conservée)
- Lecture des coordonnées GPS EXIF si disponibles
- Édition du nom (< 100 caractères) et du commentaire HTML (< 500 caractères)
- Sauvegarde au format JSON suffixé `_raw`

### Étape 2 — Géolocalisation

- Chargement d'un fichier `_raw`
- Chargement d'un tracé GPS (GPX ou KML)
- Fond cartographique au choix : OSM ou IGN Plan V2
- Sélection d'un waypoint dans la liste (Fenêtre B)
- Clic sur la carte (Fenêtre A) pour poser le waypoint
- Sauvegarde au format JSON suffixé `_loc`

---

## Format des fichiers

### `*_raw.json`
```json
{
  "version": "1.0",
  "created": "2024-...",
  "waypoints": [
    {
      "id": "uuid",
      "filename": "IMG_001.jpg",
      "name": "Col du Galibier",
      "comment": "<b>Vue</b> panoramique...",
      "thumb": "data:image/jpeg;base64,...",
      "compressedImage": "data:image/jpeg;base64,...",
      "compressedSize": 487234,
      "exifLat": 45.0641,
      "exifLon": 6.4085,
      "exifDate": "2024:07:15 10:23:45"
    }
  ]
}
```

### `*_loc.json`
Identique à `_raw.json` avec en plus les champs `lat` et `lon` placés manuellement.

---

## Technologies utilisées

- HTML5 / CSS3 / JavaScript (Vanilla)
- [Leaflet.js](https://leafletjs.com/) — cartographie
- [Leaflet-GPX](https://github.com/mpetazzoni/leaflet-gpx) — tracés GPX
- Service Worker — fonctionnement hors ligne (PWA)
- Web APIs : File, FileReader, Canvas, DataView (EXIF)
