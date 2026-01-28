# ignibp - Calculateur d'indice IBP pour randonnées

Application web progressive (PWA) pour calculer l'indice IBP de randonnées à partir de fichiers GPX avec données altimétriques IGN.

## 🎯 Fonctionnalités

- **Import de fichiers GPX** avec données altimétriques corrigées IGN
- **Visualisation cartographique** sur fond IGN Plan V2 ou OpenStreetMap
- **Tracé coloré** selon la pente topographique (gradient de couleurs)
- **Calcul de l'indice IBP** avec algorithme approché
- **Statistiques détaillées** : distance, dénivelé positif/négatif, altitude min/max
- **Évaluation de la difficulté** avec description personnalisée
- **Mode hors ligne** via Service Worker
- **Interface responsive** et design moderne

## 🗺️ Légende des couleurs

Le tracé sur la carte utilise un dégradé de couleurs pour représenter la pente :

- 🟢 **Vert** : Pente ≤ 5% (facile)
- 🟡 **Jaune** : Pente 5-10% (modéré)
- 🟠 **Orange** : Pente 10-15% (difficile)
- 🔴 **Orange foncé** : Pente 15-20% (très difficile)
- 🔴 **Rouge** : Pente ≥ 20% (extrême)

## 📊 Calcul de l'indice IBP

L'indice IBP est calculé selon la formule approximative :

```
IBP = (D + (D+ × 2) + (D- × 0.5)) × C
```

Où :
- **D** = distance en km
- **D+** = dénivelé positif en hectomètres
- **D-** = dénivelé négatif en hectomètres
- **C** = coefficient de difficulté basé sur la pente moyenne

### Niveaux de difficulté

| Indice IBP | Difficulté | Description |
|-----------|------------|-------------|
| < 25 | Très facile | Accessible à tous, promenade familiale |
| 25-50 | Facile | Peu d'effort requis |
| 50-75 | Modéré | Bonne condition physique recommandée |
| 75-100 | Difficile | Effort soutenu, bonne préparation nécessaire |
| 100-125 | Très difficile | Pour randonneurs expérimentés |
| > 125 | Extrêmement difficile | Réservé aux randonneurs chevronnés |

## 🚀 Déploiement sur GitHub Pages

### Prérequis

1. Créer un dépôt GitHub nommé `BernardHoyez.github.io` (si ce n'est pas déjà fait)
2. Avoir les fichiers `icon192.png` et `icon512.png` personnalisés

### Structure du projet

```
BernardHoyez.github.io/
└── PWA/
    └── ignibp/
        ├── index.html
        ├── app.js
        ├── manifest.json
        ├── sw.js
        ├── icon192.png
        ├── icon512.png
        └── README.md
```

### Instructions de déploiement

1. **Cloner ou créer le dépôt** :
   ```bash
   git clone https://github.com/BernardHoyez/BernardHoyez.github.io.git
   cd BernardHoyez.github.io
   ```

2. **Créer la structure** :
   ```bash
   mkdir -p PWA/ignibp
   cd PWA/ignibp
   ```

3. **Copier les fichiers** :
   - Copier tous les fichiers HTML, JS, JSON
   - Ajouter vos icônes `icon192.png` et `icon512.png`

4. **Pousser vers GitHub** :
   ```bash
   git add .
   git commit -m "Ajout de l'application ignibp"
   git push origin main
   ```

5. **Activer GitHub Pages** :
   - Aller dans Settings → Pages
   - Source : Deploy from a branch
   - Branch : main / root
   - Sauvegarder

6. **Accéder à l'application** :
   - URL : `https://BernardHoyez.github.io/PWA/ignibp/`
   - L'application sera disponible en quelques minutes

## 📱 Installation comme PWA

Sur mobile ou desktop, l'application peut être installée :

- **Chrome/Edge** : Cliquer sur l'icône d'installation dans la barre d'adresse
- **Safari iOS** : Partager → Ajouter à l'écran d'accueil
- **Android** : Menu → Installer l'application

## 🔧 Technologies utilisées

- **HTML5** / **CSS3** (Variables CSS, Grid, Flexbox)
- **JavaScript** (ES6+, Classes, Async/Await)
- **Leaflet.js** pour la cartographie
- **Service Worker** pour le mode hors ligne
- **Web App Manifest** pour l'installation PWA
- **API Géoportail IGN** pour les cartes
- **OpenStreetMap** comme alternative

## 📝 Format GPX requis

Le fichier GPX doit contenir :
- Des points de trace (`<trkpt>`) avec latitude et longitude
- Des données d'altitude (`<ele>`) pour chaque point
- Les altitudes doivent être corrigées IGN pour une meilleure précision

Exemple de structure GPX :
```xml
<gpx>
  <trk>
    <trkseg>
      <trkpt lat="45.5" lon="5.9">
        <ele>500</ele>
      </trkpt>
      <!-- autres points -->
    </trkseg>
  </trk>
</gpx>
```

## 🎨 Design

L'application utilise un design moderne avec :
- Palette de couleurs nature (vert forêt, ambre)
- Typographie distinctive (Playfair Display + Source Sans 3)
- Interface responsive et intuitive
- Animations fluides
- Mode drag & drop

## 📄 Licence

© 2026 - Application ignibp pour le calcul d'indice IBP

## 🤝 Contribution

Pour toute suggestion ou amélioration, n'hésitez pas à ouvrir une issue ou une pull request.

---

Développé avec ❤️ pour la communauté des randonneurs
