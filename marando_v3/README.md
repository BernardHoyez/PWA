# 🏔 Marando v3

> **PWA d'édition et de publication de randonnées**  
> Déployée sur GitHub Pages : `BernardHoyez.github.io/PWA/marando_v3`

---

## Présentation

Marando est une application web progressive (PWA) qui permet de transformer un fichier de randonnée brut (KMZ, KML ou GPX) en un package web prêt à publier, avec carte interactive, photos optimisées, profil altimétrique et exports multi-formats.

Elle fonctionne entièrement **dans le navigateur**, sans serveur, sans inscription, sans installation obligatoire.

---

## Fonctionnalités

### Volet Édition

| Fonctionnalité | Détail |
|---|---|
| **Import** | KMZ (OruxMaps, Google Earth…), KML, GPX |
| **Fonds de carte** | OSM, IGN Plan V2, IGN BD Ortho (Géoplateforme publique) |
| **Tracé** | Affichage du tracé sur la carte |
| **Profil altimétrique** | Graphe interactif sous la carte — survol = curseur + marqueur sur la carte |
| **Waypoints** | Liste complète avec édition nom (40 car.), commentaire (500 car.) |
| **Photos embarquées** | Vignette, agrandissement, optimisation automatique < 500 ko |
| **Ajout de photo** | Association d'une photo à n'importe quel waypoint existant |
| **Retrait de photo** | Détachement sans suppression du waypoint |
| **Ajout manuel** | Clic sur le bouton ＋ → clic sur la carte → nom, photo, commentaire |
| **Suppression** | Suppression individuelle de waypoints |
| **Sauvegarde de session** | Restauration automatique au redémarrage (localStorage) |

### Volet Déploiement

| Fonctionnalité | Détail |
|---|---|
| **Nom du dossier** | `<nom_fichier>_<commune_départ>` (géocodage automatique via Nominatim) |
| **Photos optimisées** | Rééchantillonnage JPEG, qualité progressive jusqu'à < 500 ko |
| **Export KML** | Tracé + waypoints édités + références photos |
| **Export GPX** | Tracé + waypoints avec noms et commentaires |
| **Export JSON** | Données complètes structurées |
| **Viewer HTML** | Page autonome avec carte, marqueurs, popups photos, boutons téléchargement |
| **Archive ZIP** | Package complet prêt à déposer sur GitHub Pages |

---

## Structure du package généré

```
<nom_randonnee_commune>/
├── photos/
│   ├── photo1.jpg          ← optimisée < 500 ko
│   └── ...
├── <nom>.kml               ← tracé + waypoints édités
├── <nom>.gpx               ← format GPX standard
└── <nom>.html              ← viewer autonome
```

### Viewer HTML (`<nom>.html`)

Le viewer est un fichier HTML **autonome et autosuffisant** :
- Carte Leaflet avec le même fond cartographique que celui choisi dans l'éditeur (OSM, IGN Plan V2 ou IGN BD Ortho)
- Tracé affiché
- Marqueurs waypoints cliquables → popup avec photo, coordonnées GPS, altitude, commentaire
- Bouton **Agrandir** pour afficher la photo en plein écran
- Boutons de téléchargement : **KML**, **GPX**, **JSON**
- Bouton **Imprimer / PDF**

---

## Déploiement sur GitHub Pages

1. Téléchargez le package ZIP depuis le volet Déploiement
2. Décompressez l'archive
3. Déposez le dossier dans votre dépôt GitHub :
   ```
   BernardHoyez.github.io/PWA/kmz-photos/<nom_randonnee_commune>/
   ```
4. Le viewer est accessible à l'URL :
   ```
   https://BernardHoyez.github.io/PWA/kmz-photos/<nom_randonnee_commune>/<nom>.html
   ```

---

## Installation en PWA (optionnel)

Sur **Chrome / Edge desktop** : bouton « Installer » dans la barre d'adresse.  
Sur **iOS Safari** : Partager → « Sur l'écran d'accueil ».  
Sur **Android Chrome** : menu ⋮ → « Ajouter à l'écran d'accueil ».

Une fois installée, Marando peut être associée aux fichiers `.kmz`, `.kml` et `.gpx` au niveau du système d'exploitation (double-clic → ouverture directe).

---

## Fonds de carte IGN

Les tuiles IGN utilisent l'API publique de la **Géoplateforme IGN** (`data.geopf.fr`), sans clé API requise.

| Nom | Couche WMTS |
|---|---|
| IGN Plan V2 | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` |
| IGN BD Ortho | `ORTHOIMAGERY.ORTHOPHOTOS` |

---

## Compatibilité

| Navigateur | Support |
|---|---|
| Chrome 90+ | ✅ Complet |
| Edge 90+ | ✅ Complet |
| Firefox | ✅ (sans `file_handlers` PWA) |
| Safari 16+ | ✅ (sans `file_handlers` PWA) |
| Android Chrome | ✅ |
| iOS Safari | ✅ |

---

## Technologies

- [Leaflet 1.9](https://leafletjs.com) — cartographie
- [JSZip 3.10](https://stuk.github.io/jszip/) — lecture KMZ / création ZIP
- [Nominatim OSM](https://nominatim.org) — géocodage inverse (commune du départ)
- **Canvas API** — profil altimétrique et optimisation des photos
- **localStorage** — sauvegarde de session
- **Service Worker** — fonctionnement hors ligne (stratégie Network First, brise-caches)

---

## Versions

| Version | Nouveautés |
|---|---|
| **v1** | Import KMZ, édition waypoints, export ZIP (KML + HTML) |
| **v2** | Profil altimétrique interactif, sauvegarde de session, `file_handlers` PWA |
| **v3** | Import GPX/KML/KMZ, ajout/suppression de waypoints, association de photo à tout waypoint |

---

## Licence

Usage personnel et libre. Données cartographiques © OpenStreetMap contributors, © IGN.
