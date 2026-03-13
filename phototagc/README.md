# ⌖ phototagc

**PWA de géotaggage de photographies**  
Inscrit automatiquement les coordonnées GPS et la date de prise de vue directement sur vos photos, à partir de leurs métadonnées EXIF.

🌐 **[Accéder à l'application](https://bernardhoyez.github.io/PWA/phototagc)**

---

## Aperçu

phototagc lit les métadonnées EXIF de vos photographies (latitude, longitude, date) et inscrit un tag en bas à gauche de chaque image, au format :

```
48°51.30'N 002°21.05'E 2024/06/15
```

Les coordonnées sont exprimées en **degrés et minutes décimales**. Le traitement est entièrement local — aucune photo ne quitte votre appareil.

---

## Fonctionnalités

- **Sélection par dossier** — traitement en lot de tous les JPEG d'un répertoire
- **Extraction EXIF native** — lecture des balises GPS et `DateTimeOriginal` sans bibliothèque tierce
- **Tag personnalisable** — taille de police, couleur du texte, fond du tag, marge
- **Export ZIP** — toutes les photos taguées regroupées en un seul fichier téléchargeable
- **Aperçu avant traitement** — cliquez sur un nom de fichier pour visualiser la photo et son tag détecté
- **Indicateur GPS** — les photos sans données GPS/date sont signalées en rouge dans la liste
- **PWA installable** — fonctionne hors-ligne, installable sur bureau et mobile
- **100% local** — aucun serveur, aucune donnée envoyée

---

## Utilisation

### 1. Choisir les photos

Cliquez sur la zone de dépôt ou glissez-y un dossier contenant vos photographies JPEG géoréférencées. La liste des fichiers s'affiche avec un indicateur de présence des données GPS :

- 🟢 point vert — données GPS et/ou date détectées
- 🔴 point rouge — aucune métadonnée exploitable

### 2. Configurer le tag

Ajustez les options selon vos préférences :

| Option | Valeur par défaut | Description |
|---|---|---|
| Taille de police | 28 px | Taille du texte sur l'image originale |
| Couleur du texte | Blanc | Blanc, jaune, noir ou rouge |
| Fond du tag | Semi-transparent | Semi-transparent, noir plein ou sans fond |
| Marge | 16 px | Distance par rapport aux bords de l'image |

> **Note :** la taille de police est automatiquement mise à l'échelle en fonction de la résolution de chaque photo afin de garantir une lisibilité constante quelle que soit la définition du fichier source.

### 3. Lancer le traitement

Cliquez sur **Lancer le traitement**. Une barre de progression indique l'avancement photo par photo, puis la compression ZIP.

Une fois le traitement terminé, cliquez sur **Télécharger le ZIP** pour récupérer l'ensemble des photos taguées.

---

## Format du tag

```
DD°MM.MM'N/S DDD°MM.MM'E/W AAAA/MM/JJ
```

Exemples :
```
48°51.30'N 002°21.05'E 2024/06/15
43°17.88'N 005°22.41'E 2023/08/03
51°30.00'N 000°07.67'W 2025/01/21
```

Les photos dépourvues de coordonnées GPS mais possédant une date (ou l'inverse) sont taguées avec les seules données disponibles.

---

## Structure des fichiers

```
phototagc/
├── index.html      Interface principale
├── style.css       Styles (thème sombre, typographie Syne + Space Mono)
├── app.js          Logique applicative (canvas, ZIP, options)
├── exif.js         Lecteur EXIF pur JavaScript (sans dépendance)
├── sw.js           Service Worker (cache offline)
├── manifest.json   Manifeste PWA
├── icon192.png     Icône 192×192 (à remplacer)
└── icon512.png     Icône 512×512 (à remplacer)
```

---

## Déploiement sur GitHub Pages

1. Décompresser l'archive dans votre dépôt :
   ```
   docs/PWA/phototagc/
   ```

2. Dans les paramètres du dépôt → **Pages**, sélectionner la branche `main` et le dossier `/docs` comme source.

3. L'application sera accessible à l'adresse :
   ```
   https://BernardHoyez.github.io/PWA/phototagc
   ```

> Le Service Worker et le manifeste sont préconfigurés pour ce chemin (`/PWA/phototagc/`). Si vous modifiez l'URL de déploiement, mettez à jour `BASE_PATH` dans `sw.js` et `start_url` / `scope` dans `manifest.json`.

---

## Dépendances

| Bibliothèque | Version | Usage | Chargement |
|---|---|---|---|
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | Génération de l'archive ZIP | CDN (cdnjs) |
| [Syne](https://fonts.google.com/specimen/Syne) | — | Police d'affichage | Google Fonts |
| [Space Mono](https://fonts.google.com/specimen/Space+Mono) | — | Police monospace du tag | Google Fonts |

Le lecteur EXIF (`exif.js`) est développé en JavaScript natif et ne requiert aucune dépendance externe.

---

## Icônes

Les fichiers `icon192.png` et `icon512.png` fournis sont des **placeholders** générés automatiquement. Pour personnaliser l'icône de l'application, remplacez-les par vos propres fichiers PNG aux dimensions correspondantes (192×192 et 512×512 pixels).

---

## Compatibilité

| Navigateur | Support |
|---|---|
| Chrome / Edge 90+ | ✅ Complet (PWA installable) |
| Firefox 90+ | ✅ Complet |
| Safari / iOS 16+ | ✅ Complet (PWA installable) |
| Samsung Internet | ✅ Complet |

L'API `webkitdirectory` (sélection de dossier) est supportée par tous les navigateurs modernes. Le traitement canvas et la génération ZIP ne nécessitent aucune API expérimentale.

---

## Licence

Libre d'utilisation et de modification.
