# Circuit IGN — Extracteur GPX/KML

PWA permettant d'extraire un circuit de randonnée tracé sur une carte IGN (JPEG/PNG)
et de l'exporter au format **GPX** ou **KML**, géoréférencé grâce à la carte Plan IGN v2.

🔗 **Application en ligne** : https://BernardHoyez.github.io/PWA/circuit_extract/

---

## Fonctionnalités

| Étape | Description |
|---|---|
| **① Import image** | Chargez votre carte IGN scannée (JPEG ou PNG) |
| **② Géoréférencement** | Pointez 2 à 4 points sur votre image ET sur la carte IGN en ligne (côte à côte). Zoom libre sur la carte. Transformation affine aux moindres carrés. |
| **③ Couleur** | Pipette interactive avec loupe — cliquez sur le tracé pour capturer la couleur exacte. Tolérance réglable. |
| **④ Export** | Téléchargement GPX et/ou KML prêts pour Garmin, Komoot, OsmAnd, Google Earth… |

## Architecture

```
circuit_extract/
├── index.html      ← Page principale (structure HTML)
├── style.css       ← Styles (thème forêt, responsive)
├── app.js          ← Logique complète (extraction, GCP, GPX/KML)
├── sw.js           ← Service Worker (cache hors-ligne)
├── manifest.json   ← Manifeste PWA
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── gen_icons.py    ← Script de génération des icônes (dev)
```

## Déploiement sur GitHub Pages

### Structure du dépôt attendue

```
BernardHoyez.github.io/          ← dépôt GitHub
└── PWA/
    └── circuit_extract/         ← ce dossier
        ├── index.html
        ├── style.css
        ├── app.js
        ├── sw.js
        ├── manifest.json
        └── icons/
```

### Étapes

```bash
# 1. Cloner (ou ouvrir) votre dépôt
git clone https://github.com/BernardHoyez/BernardHoyez.github.io.git
cd BernardHoyez.github.io

# 2. Copier le dossier de l'application
mkdir -p PWA
cp -r /chemin/vers/circuit_extract PWA/

# 3. Committer et pousser
git add PWA/circuit_extract
git commit -m "feat: ajout PWA Circuit IGN extracteur GPX/KML"
git push origin main

# 4. Activer GitHub Pages (si pas encore fait)
#    → Settings > Pages > Source: Deploy from branch > main > / (root)
```

L'application sera accessible à :
**https://BernardHoyez.github.io/PWA/circuit_extract/**

## Utilisation

### Géoréférencement (étape clé)

Pour un résultat précis, choisissez des points bien identifiables sur votre carte :
- Intersections de routes ou de chemins
- Sommets, cols, points cotés
- Coins de villages, clochers

Plus les points sont **éloignés les uns des autres** sur l'image, meilleure est la précision.
Avec **3 ou 4 points**, la transformation affine élimine les distorsions d'impression/scan.

### Pipette couleur

- **Survolez** le tracé pour voir la couleur en temps réel (loupe intégrée)
- **Cliquez** sur le tracé pour la sélectionner
- Augmentez la **tolérance** si le tracé est imprimé (légèrement flou) ou délavé

### Fichiers produits

- **GPX** : compatible Garmin, Komoot, Wikiloc, OsmAnd, CalTopo, AllTrails
- **KML** : compatible Google Earth, Google Maps, QGIS

## Données cartographiques

Les tuiles de la carte en ligne proviennent du service WMTS public de l'IGN :
`https://data.geopf.fr/wmts` — Plan IGN v2 — usage non commercial libre.

## Hors-ligne (PWA)

Après la première visite, le Service Worker met en cache :
- Tous les fichiers statiques de l'application
- Les tuiles IGN visitées (cache automatique)

L'application fonctionne ensuite **sans connexion** sur les zones déjà consultées.

## Licence

Usage personnel et non commercial.
Données IGN : © Institut national de l'information géographique et forestière.
