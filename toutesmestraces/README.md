# 🥾 Toutes mes traces

Une Progressive Web App (PWA) pour visualiser tous vos points de départ de randonnée sur une carte IGN.

## Fonctionnalités

- ✅ Sélection du dossier contenant vos traces HTML
- 🔍 Analyse automatique des coordonnées GPS
- 🗺️ Visualisation sur carte IGN Plan V2
- 💾 Sauvegarde de la carte en fichier HTML autonome
- 📱 Compatible mobile et desktop
- 🚀 Fonctionne hors ligne (PWA)

## Déploiement sur GitHub Pages

### Prérequis

- Un compte GitHub
- Git installé sur votre ordinateur

### Étapes de déploiement

1. **Créer un dépôt GitHub**
   ```bash
   # Créer un nouveau dépôt nommé PWA sur GitHub
   # Puis cloner le dépôt localement
   git clone https://github.com/BernardHoyez/PWA.git
   cd PWA
   ```

2. **Créer le sous-dossier toutesmestraces**
   ```bash
   mkdir -p toutesmestraces
   cd toutesmestraces
   ```

3. **Copier les fichiers de l'application**
   - Copier `index.html`
   - Copier `manifest.json`
   - Copier `sw.js`
   - Copier `icon192.png`
   - Copier `icon512.png`

4. **Pousser sur GitHub**
   ```bash
   cd ..  # Retour à la racine du dépôt PWA
   git add .
   git commit -m "Ajout de l'application Toutes mes traces"
   git push origin main
   ```

5. **Activer GitHub Pages**
   - Aller sur votre dépôt GitHub : `https://github.com/BernardHoyez/PWA`
   - Cliquer sur **Settings** (Paramètres)
   - Dans le menu de gauche, cliquer sur **Pages**
   - Sous "Source", sélectionner **main** et **/root**
   - Cliquer sur **Save**

6. **Accéder à votre application**
   - L'application sera accessible à : `https://BernardHoyez.github.io/PWA/toutesmestraces/`
   - Attendre quelques minutes pour le déploiement initial

## Utilisation

1. **Ouvrir l'application** dans votre navigateur (Chrome, Edge recommandés)
2. **Sélectionner le dossier** contenant vos traces HTML
3. **Analyser les traces** pour extraire les coordonnées GPS
4. **Visualiser** les points de départ sur la carte IGN
5. **Sauvegarder** la carte en fichier HTML pour consultation ultérieure

## Format des fichiers de traces

L'application supporte plusieurs formats de traces HTML :

- Fichiers avec balises meta géolocalisation
- Fichiers contenant des données GPX
- Fichiers avec coordonnées JavaScript
- Fichiers avec coordonnées décimales en texte

### Exemple de formats reconnus :

```html
<!-- Format 1 : Meta tag -->
<meta name="geo.position" content="43.52971;5.44732">

<!-- Format 2 : GPX -->
<trkpt lat="43.52971" lon="5.44732">

<!-- Format 3 : JavaScript -->
var lat = 43.52971;
var lon = 5.44732;

<!-- Format 4 : Texte -->
43.52971, 5.44732
```

## Compatibilité

- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Safari 15.4+ (support limité de l'API File System)
- ✅ Firefox (avec activation manuelle de l'API)

## Technologies utilisées

- HTML5 / CSS3 / JavaScript
- Leaflet.js pour la cartographie
- API IGN Géoportail
- File System Access API
- Service Worker pour le mode hors ligne

## Structure du projet

```
toutesmestraces/
├── index.html          # Application principale
├── manifest.json       # Manifest PWA
├── sw.js              # Service Worker
├── icon192.png        # Icône 192x192
├── icon512.png        # Icône 512x512
└── README.md          # Ce fichier
```

## Licence

MIT License - Libre d'utilisation et de modification

## Support

Pour toute question ou problème, créer une issue sur le dépôt GitHub.

---

**Créé avec ❤️ pour les passionnés de randonnée**
