# psd2geo 🗺️

**PWA de calibrage cartographique PSD → GeoPackage**

> Déployé sur : [BernardHoyez.github.io/PWA/psd2geo](https://BernardHoyez.github.io/PWA/psd2geo)

---

## Fonctionnalités

### ① Chargement du PSD
- Glisser-déposer ou sélection d'un fichier `.psd` / `.psb`
- Parsing des calques avec PSD.js (côté client, sans serveur)
- Affichage de la composition aplatie avec transparence préservée
- Zoom / pan sur le canevas PSD

### ② Fond de carte de référence
- **OSM** OpenStreetMap Standard
- **IGN Plan V2** (Géoportail, clé `essentiels`)
- **IGN Orthophotos HD**
- **IGN Cartes topographiques**
- **ESRI Satellite World Imagery**
- **CartoDB Dark Matter**

### ③ Points de contrôle (GCP)
- Mode saisie GCP avec bascule
- Clic sur le PSD → coordonnées pixel
- Clic sur la carte → lon/lat WGS84
- Nommage de chaque point (villes, caps, etc.)
- Édition / suppression des GCP
- Marqueurs colorés synchronisés PSD ↔ Carte

### ④ Calibrage géoréférencé
- Transformation **affine** (≥ 3 GCP, recommandée)
- Transformation **polynomiale 2e degré** (≥ 6 GCP)
- Transformation **Thin Plate Spline** (≥ 4 GCP)
- Calcul RMSE en mètres
- **Overlay PSD** géoréférencé sur la carte avec opacité réglable

### ⑤ Export GeoPackage
- Export du raster PNG avec :
  - `.png` — image composite (pixels transparents exclus optionnellement)
  - `.pgw` — World File (géoréférencement affine)
  - `.prj` — projection SRS (WGS84, WebMercator, Lambert-93, Lambert II étendu)
  - `_meta.json` — métadonnées complètes (GCPs, transformation, bbox)
- Compatible QGIS, ArcGIS, GDAL

---

## Architecture

```
psd2geo/
├── index.html          # App PWA complète (SPA)
├── sw.js               # Service Worker (offline, cache tuiles)
├── manifest.json       # Manifest PWA
├── icon192.png         # Icône 192×192
├── icon512.png         # Icône 512×512
└── .github/
    └── workflows/
        └── deploy.yml  # CI/CD GitHub Pages
```

Toute la logique tourne **côté client** : aucun serveur, aucune donnée envoyée.

---

## Déploiement sur GitHub Pages

### Option A — Pages depuis la branche `main`

1. Placez le dossier dans `PWA/psd2geo/` de votre dépôt
2. Activez GitHub Pages : Settings → Pages → Source: `main` / `/` (root)  
   ou configurez le workflow `.github/workflows/deploy.yml`
3. L'app sera disponible à `https://BernardHoyez.github.io/PWA/psd2geo/`

### Option B — GitHub Actions (inclus)

Le workflow `deploy.yml` se déclenche automatiquement à chaque push sur `main`.

---

## Utilisation avec GDAL (optionnel)

Pour convertir l'export en vrai GeoPackage GDAL :

```bash
gdal_translate -of GPKG \
  -a_srs EPSG:4326 \
  psd2geo_export.png \
  psd2geo_export.gpkg
```

Ou avec le world file :
```bash
gdal_translate -of GPKG psd2geo_export.png psd2geo_export.gpkg
```

---

## Dépendances CDN (aucune installation)

| Librairie | Version | Usage |
|-----------|---------|-------|
| Leaflet   | 1.9.4   | Carte interactive |
| PSD.js    | 3.3.2   | Parser PSD côté client |

---

## Licence

MIT — Bernard Hoyez
