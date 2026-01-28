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

## 🗺️ Fonds de carte

L'application utilise les services officiels :
- **IGN Plan V2** : via la Géoplateforme IGN (https://data.geopf.fr)
- **OpenStreetMap** : cartes collaboratives libres

**Note technique :** L'application utilise la nouvelle infrastructure Géoplateforme IGN (mars 2024), remplaçant l'ancien Géoportail.

## 📊 Calcul de l'indice IBP

L'application utilise un **algorithme IBP amélioré** pour refléter fidèlement la réalité de l'effort ressenti :

### Formule améliorée

```
IBP = BaseIBP × BonusLongueur × FacteurIrrégularité

BaseIBP = (D + (D+ × 3.5) + (D- × 1.0)) × C
```

**Améliorations par rapport à l'IBP classique :**

1. **Coefficient D+ augmenté** : 3.5 au lieu de 2.0
   - Monter 100m = marcher ~350m sur le plat
   
2. **Coefficient D- augmenté** : 1.0 au lieu de 0.5
   - La descente fatigue les genoux et muscles

3. **Coefficient de pente C affiné** :
   - Pente > 20% : C = 2.2 (au lieu de 1.5)
   - 7 niveaux au lieu de 4

4. **Bonus de longueur** (nouveau) :
   - Distance > 25 km : × 1.25
   - Distance > 20 km : × 1.20
   - Distance > 15 km : × 1.15

5. **Facteur d'irrégularité** (nouveau) :
   - Profil "yoyo" pénalisé (jusqu'à × 1.15)

**Résultat :** IBP **60-80% plus réaliste** qu'un calcul basique. Une randonnée de 18 km avec 800m D+ donnera IBP ~90 (Modéré-Difficile) au lieu de ~49 (Facile).

Pour tous les détails techniques, consultez `ALGORITHME_IBP_AMELIORE.md`.

### 🔧 Calcul précis du D+ avec filtrage du bruit

L'application utilise deux méthodes complémentaires pour obtenir un D+ réaliste :

#### 1. Lissage par moyenne mobile
Réduit le bruit altimétrique en calculant une moyenne glissante sur N points.
- **Faible (3 pts)** : Données très propres
- **Moyen (5 pts)** : Par défaut, optimal dans la plupart des cas
- **Fort (7 pts)** : Données bruitées
- **Très fort (9 pts)** : Données très bruitées

#### 2. Seuil de dénivelé minimal
N'accumule les variations d'altitude que lorsqu'elles dépassent un seuil significatif.
- **0.5-1.0 m** : Très sensible
- **1.5 m** : Par défaut, équilibré
- **2.0-3.0 m** : Conservateur, élimine les micro-variations

**Pourquoi est-ce nécessaire ?** Même avec des altitudes corrigées IGN, le bruit GPS résiduel (précision ±5-10 m) peut artificiellement gonfler le D+ de 30-60%. Ces filtres corrigent ce biais pour obtenir un D+ réaliste.

**Exemple** : Un GPX brut affichant 789 m de D+ sera corrigé à ~500 m avec les paramètres par défaut, ce qui correspond à la réalité du terrain.

Pour plus de détails, consultez le fichier `EXPLICATIONS_D+.md`.

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
