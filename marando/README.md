# 🗺 Marando — PWA d'édition de randonnées KMZ

> Déployée sur **GitHub Pages** : `BernardHoyez.github.io/PWA/marando`

---

## Structure du dépôt

```
PWA/
└── marando/
    ├── index.html       ← Application principale (PWA)
    ├── manifest.json    ← Manifeste PWA
    ├── sw.js            ← Service Worker (offline)
    ├── icons/
    │   ├── icon-192.png
    │   └── icon-512.png
    └── README.md
```

---

## Fonctionnement

### Volet Édition

1. **Chargez un fichier KMZ** (glisser-déposer ou clic)
2. Le tracé et les waypoints s'affichent sur la carte
3. Choisissez le fond de carte : **OSM**, **IGN Plan V2** ou **IGN BD Ortho**
4. Dans la colonne gauche, cliquez sur un waypoint pour l'éditer :
   - Modifier le nom (max 40 caractères)
   - Ajouter / modifier un commentaire (max 500 caractères)
   - Voir la vignette photo et l'agrandir
   - Consulter les coordonnées GPS et l'altitude

### Volet Déploiement

1. Passez dans l'onglet **Déploiement**
2. Vérifiez la structure du package
3. Cliquez **Télécharger le Package**
   - Les photos sont optimisées (< 500 ko)
   - Le nom du dossier = `<nom_kmz>_<commune_départ>`
   - Une archive `.zip` est téléchargée

### Contenu du package ZIP

```
<nom_randonnee_commune>/
├── photos/
│   ├── photo1.jpg      ← optimisée < 500 ko
│   └── ...
├── <nom>.kml           ← tracé + waypoints édités
└── <nom>.html          ← viewer autonome avec boutons :
                            [KML] [GPX] [JSON] [PDF] [Imprimer]
```

### Déploiement sur GitHub Pages

Décompressez l'archive et déposez le dossier dans :
```
BernardHoyez.github.io/PWA/kmz-photos/<nom_randonnee_commune>/
```

---

## Technologies

- **Leaflet 1.9** — cartographie
- **JSZip 3.10** — lecture KMZ / création ZIP
- **Nominatim OSM** — géocodage inverse (commune du départ)
- **Canvas API** — optimisation des photos
- **Service Worker** — fonctionnement offline

## Fonds de carte

| Nom | Source | URL |
|-----|--------|-----|
| OSM | OpenStreetMap | tile.openstreetmap.org |
| IGN Plan V2 | Géoplateforme IGN | wxs.ign.fr/essentiels (WMTS) |
| IGN BD Ortho | Géoplateforme IGN | wxs.ign.fr/essentiels (WMTS) |

---

## Installation PWA (mobile / desktop)

Sur Chrome/Edge : bouton « Installer » dans la barre d'adresse.  
Sur iOS Safari : Partager → « Sur l'écran d'accueil ».
