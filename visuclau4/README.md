# Guide de Visite PWA

Application Progressive Web App (PWA) de guide de visite sur le terrain avec géolocalisation GPS et support des médias.

## 📁 Fichiers de l'application

```
field-guide-pwa/
├── index.html          # Page principale
├── app.js              # Application JavaScript
├── styles.css          # Feuille de style
├── manifest.json       # Manifeste PWA
├── sw.js              # Service Worker
├── README.md          # Documentation
└── icons/             # Icônes PWA (à créer)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## 🚀 Installation rapide

1. **Créer le dossier** : `mkdir field-guide-pwa && cd field-guide-pwa`
2. **Copier tous les fichiers** fournis dans le dossier
3. **Créer le dossier icons/** et générer les icônes PWA
4. **Servir via HTTPS** (obligatoire pour PWA)

### Génération des icônes

Créez un dossier `icons/` et générez les icônes aux tailles :
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

**Outils recommandés :**
- [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Serveur local pour test

```bash
# Node.js
npx serve . --cors

# Python 3  
python -m http.server 8000

# PHP
php -S localhost:8000
```

## 📱 Fonctionnalités

✅ **Chargement ZIP intelligent**
- Interface de sélection de fichier
- Parsing automatique de `visit.json`
- Support médias (JPEG, MP4, MP3)
- Gestion erreurs robuste avec diagnostic

✅ **Carte interactive**
- OpenStreetMap avec Leaflet
- Marqueurs numérotés par ID
- Zoom automatique adaptatif  
- Design 100% responsive

✅ **Géolocalisation temps réel**
- GPS avec marqueur pulsant rouge
- Calcul distance et azimut automatique
- Gestion erreurs et permissions
- Optimisation batterie mobile

✅ **Popups riches avec diagnostic**
- 85% largeur écran responsive
- Médias intégrés (images/vidéos/audio)
- **Diagnostic visuel des images**
- Coordonnées GPS et distances

✅ **PWA complète**
- Installable sur écran d'accueil
- Fonctionnement hors ligne
- Service Worker intelligent
- Notifications de mise à jour

## 📦 Format des données ZIP

### Structure requise
```
votre-visite.zip
├── visit.json          # Configuration des POI
└── data/               # Dossier des médias
    ├── 1/              # POI ID 1
    │   ├── Titre.txt
    │   ├── Localisation.txt
    │   ├── Commentaire.txt
    │   ├── IMG_20181023.jpg
    │   └── audio.mp3
    ├── 2/              # POI ID 2
    │   ├── Titre.txt
    │   ├── Localisation.txt
    │   ├── Commentaire.txt
    │   └── video.mp4
    └── ...
```

### Exemple visit.json
```json
[
  {
    "id": 1,
    "folder": "1",
    "titleFile": "Titre.txt",
    "locationFile": "Localisation.txt", 
    "commentFile": "Commentaire.txt",
    "image": "IMG_20181023_144714.jpg",
    "audio": "commentaire_audio.mp3"
  },
  {
    "id": 2,
    "folder": "2",
    "titleFile": "Titre.txt",
    "locationFile": "Localisation.txt",
    "commentFile": "Commentaire.txt",
    "video": "video_explication.mp4"
  }
]
```

### Formats de coordonnées supportés
Dans le fichier `Localisation.txt` :
```
49.123456, 0.234567
lat: 49.123456, lon: 0.234567  
latitude: 49.123456, longitude: 0.234567
49.123456° N, 0.234567° E
```

## 🔍 Diagnostic des images

L'application inclut un **système de diagnostic visuel** pour résoudre les problèmes d'images :

### Dans chaque popup POI :
- **Zone de diagnostic** avec informations détaillées
- **Test 1** : Blob URL (méthode moderne)
- **Test 2** : Base64 (méthode de secours)
- **Test 3** : Image de référence (carré bleu "TEST")
- **Bouton test manuel** avec logs console

### Résolution des problèmes images :
1. **Vérifiez le format** : JPEG, PNG recommandés
2. **Taille raisonnable** : < 10MB par image
3. **Noms sans espaces** ni caractères spéciaux
4. **Encodage UTF-8** pour tous les fichiers texte

## 🛠️ Architecture technique

### Technologies utilisées
- **Leaflet** : Cartographie OpenStreetMap
- **JSZip** : Traitement des fichiers ZIP
- **Service Worker** : Cache intelligent et mode hors ligne
- **Geolocation API** : GPS temps réel
- **PWA APIs** : Installation et notifications

### Structure du code
- **app.js** : Classe `FieldGuideApp` principale
- **sw.js** : Service Worker avec stratégies de cache
- **styles.css** : Styles responsive avec variables CSS
- **manifest.json** : Configuration PWA complète

## 🧪 Tests et validation

### Fonctionnalités à tester
- ✅ Chargement fichier ZIP
- ✅ Affichage carte et marqueurs  
- ✅ Géolocalisation (autoriser l'accès)
- ✅ Popups avec médias et diagnostic
- ✅ POI multiples (même coordonnée)
- ✅ Mode hors ligne
- ✅ Installation PWA

### Tests sur différents appareils
- **Chrome/Edge** (Android) : Menu → "Ajouter à l'écran d'accueil"
- **Safari** (iOS) : Bouton Partager → "Sur l'écran d'accueil"  
- **Desktop** : Icône d'installation dans la barre d'adresse

## 🔧 Personnalisation

### Couleurs (variables CSS)
```css
:root {
  --primary: #2563eb;        /* Bleu principal */
  --secondary: #10b981;      /* Vert GPS actif */
  --danger: #ef4444;         /* Rouge GPS inactif */
}
```

### Configuration PWA (manifest.json)
```json
{
  "name": "Votre Guide Personnalisé",
  "theme_color": "#votre-couleur",
  "background_color": "#votre-fond"
}
```

## 🐛 Résolution des problèmes

### Problèmes fréquents

**Images ne s'affichent pas**
1. Ouvrez un POI avec image
2. Regardez la zone "📸 Diagnostic Image"  
3. Vérifiez les résultats Test 1, 2, 3
4. Utilisez le bouton "🔍 Lancer tests manuels"

**GPS ne fonctionne pas**
- Autoriser l'accès à la localisation
- Vérifier HTTPS (obligatoire)
- Tester en extérieur

**ZIP ne charge pas**
- Vérifier `visit.json` à la racine
- Valider le JSON sur jsonlint.com
- Encodage UTF-8 pour tous les fichiers

**PWA ne s'installe pas**
- Servir en HTTPS obligatoire
- Vérifier `manifest.json` et icônes
- Ouvrir les DevTools → Application → Manifest

## 📊 Performance

### Optimisations incluses
- **Cache intelligent** : Cartes et assets mis en cache
- **Lazy loading** : Chargement médias à la demande
- **Responsive images** : Adaptation automatique
- **Compression** : Gzip recommandé côté serveur

### Recommandations fichiers
- **Images** : Optimiser à 1920px max, JPEG qualité 85%
- **Vidéos** : H.264/MP4, résolution 1080p max
- **Audio** : MP3 128-192 kbps
- **ZIP total** : Éviter > 100MB

## 🔄 Mises à jour

L'application détecte automatiquement les mises à jour :
1. Notification automatique affichée
2. Bouton "Mettre à jour" → Rechargement
3. Cache vidé et nouvelle version installée

## 📞 Support et contribution

### Signalement de bugs
1. Vérifier la liste des problèmes connus
2. Tester sur plusieurs navigateurs  
3. Fournir : navigateur, OS, fichier ZIP test
4. Inclure les logs console si possible

### Logs de debug
- Ouvrir DevTools (F12) → Console
- Tous les processus sont loggés en détail
- Messages préfixés `[SW]` pour Service Worker

---

**Application PWA complète prête pour la production** 🚀  
**Développée avec ❤️ pour les guides de terrain**