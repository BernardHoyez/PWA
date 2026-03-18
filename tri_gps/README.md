# tri_gps — PWA de tri de photos géolocalisées

Déployée sur : **BernardHoyez.github.io/PWA/tri_gps**

## Structure des fichiers

```
tri_gps/
├── index.html          ← Application principale
├── manifest.json       ← Manifeste PWA
├── sw.js               ← Service Worker (cache offline)
├── icon192.png         ← Icône PWA 192×192 (à fournir)
├── icon512.png         ← Icône PWA 512×512 (à fournir)
└── README.md
```

## Déploiement GitHub Pages

1. Créer le dossier `PWA/tri_gps/` dans le dépôt `BernardHoyez.github.io`
2. Copier tous les fichiers (sauf les `.placeholder.txt`)
3. Fournir `icon192.png` (192×192 px) et `icon512.png` (512×512 px)
4. Activer GitHub Pages depuis les paramètres du dépôt (branche `main`, dossier racine)
5. L'application sera accessible à : `https://BernardHoyez.github.io/PWA/tri_gps/`

## Utilisation

### 1. Charger les photos
- Cliquer **📂 Charger photos**
- Sélectionner toutes les photos du dossier (JPEG géolocalisées)
- Les marqueurs apparaissent sur la carte (gris = sans polygone)

### 2. Choisir le fond cartographique
- **IGN Photos aériennes** — Orthophotos HD (Géoportail)
- **IGN Plan V2** — Carte topographique (Géoportail)
- **OpenStreetMap** — Carte collaborative

### 3. Dessiner le polygone
- Cliquer **✏️ Polygone** puis tracer le périmètre sur la carte
- Les photos à l'intérieur passent en **vert** (OK)
- Les photos hors polygone passent en **rouge** (hors)

### 4. Taguer et sauvegarder
- Onglet **Actions** → **🏷️ Taguer & Sauvegarder**
- Un ZIP est téléchargé contenant deux sous-dossiers :
  - `nom_dossier_tag_OK/` — photos avec le tag GPS en bas à gauche
  - `nom_dossier_NO_tag/` — photos non sélectionnées (sans modification)

## Format du tag appliqué

```
XX°XX.XXN YYY°YY.YYE AAAA/MM/JJ
```

Exemple : `48°52.17N 002°21.03E 2024/06/15`

Le tag est positionné **en bas à gauche** de chaque photo, avec un fond semi-transparent noir, en police monospace blanche. La taille du texte est proportionnelle à la résolution de l'image.

## Technologies utilisées

- **Leaflet.js** — Carte interactive
- **Leaflet.draw** — Dessin du polygone
- **IGN Géoportail WMTS** — Tuiles cartographiques françaises
- **JSZip** — Génération du ZIP côté client
- **Canvas API** — Application du tag sur les images
- **EXIF natif** — Lecture des coordonnées GPS sans dépendance externe
- **Service Worker** — Fonctionnement offline partiel

## Notes techniques

- Traitement **100% côté client** : aucune donnée n'est envoyée vers un serveur
- Compatible navigateurs modernes (Chrome, Firefox, Edge, Safari)
- L'installation en tant qu'application (PWA) est proposée par le navigateur
- Les coordonnées GPS sont lues directement dans les données EXIF binaires
- Le format de sortie des photos taguées est JPEG (qualité 92%)
