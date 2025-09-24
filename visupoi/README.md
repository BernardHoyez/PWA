# 🗺️ Carte Interactive POI avec Upload ZIP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-blue.svg)](https://votre-username.github.io/carte-interactive-poi-zip/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![JSZip](https://img.shields.io/badge/JSZip-3.10.1-orange.svg)](https://stuk.github.io/jszip/)

Application web interactive pour visualiser des Points d'Intérêt (POI) sur une carte OpenStreetMap Leaflet, avec support complet pour l'upload et l'affichage de fichiers ZIP contenant des médias.

## 🚀 [**Démo en Ligne**](https://votre-username.github.io/carte-interactive-poi-zip/)

> Testez l'application directement dans votre navigateur !

## 📱 **Application PWA Installable**

Cette application est une **Progressive Web App (PWA)** complète que vous pouvez installer sur votre appareil comme une application native !

### ✨ **Avantages PWA**
- 📲 **Installation** sur mobile, tablette et desktop
- ⚡ **Performances** optimisées avec mise en cache intelligente
- 📴 **Mode hors-ligne** pour consulter vos données
- 🔄 **Mises à jour automatiques** en arrière-plan
- 🎯 **Expérience native** sans app store

## 🎯 Fonctionnalités Principales

### ✅ Upload de Fichier ZIP Complet
- **Interface drag & drop** intuitive pour charger les fichiers ZIP
- **Extraction automatique** du contenu ZIP avec JSZip
- **Barre de progression** en temps réel pendant le traitement
- **Gestion d'erreurs** complète avec messages utilisateur

### ✅ Structure ZIP Supportée
```
votre-visite.zip
├── visit.json          # Données des POI (obligatoire)
└── data/               # Dossier contenant tous les médias
    ├── 1/              # Médias pour POI ID 1
    │   ├── image.jpg
    │   ├── audio.mp3
    │   └── video.mp4
    ├── 2/              # Médias pour POI ID 2
    │   └── photo.png
    └── 3/              # Médias pour POI ID 3
        └── sound.wav
```

### ✅ **PWA (Progressive Web App) Complète**
- 📱 **Application installable** sur tous appareils (iOS, Android, Windows, macOS)
- ⚡ **Mode hors-ligne** avec Service Worker avancé
- 🔄 **Mises à jour automatiques** et notifications
- 📊 **Cache intelligent** des ressources et données
- 🎯 **Interface native** avec gestion des safe areas iOS

### ✅ Carte Interactive Leaflet
- **Carte OpenStreetMap** responsive et intuitive
- **Markers personnalisés** avec codes couleur selon les médias
- **Auto-centrage** intelligent sur tous les POI
- **Popups enrichis** avec médias intégrés
- **Navigation fluide** entre les points d'intérêt

### ✅ Système de Markers Avancé
- 🔵 **Bleu** : Photos disponibles
- 🔴 **Rouge** : Vidéos disponibles  
- 🟢 **Vert** : Audio disponible
- 🟣 **Violet** : Combinaisons de médias
- **Numérotation** des POI sur les markers
- **Hover effects** et interactions

### ✅ Popups Multimédias
- **Images** : Affichage direct avec redimensionnement automatique
- **Vidéos** : Lecteur intégré avec contrôles (MP4, WebM, MOV)
- **Audio** : Lecteur audio avec interface personnalisée (MP3, WAV, OGG)
- **Informations** : Titre, commentaires, coordonnées GPS
- **Design responsive** pour tous les écrans

### ✅ Interface Utilisateur Complète
- **Header** avec branding et description
- **Sidebar** avec liste cliquable de tous les POI
- **Légende interactive** expliquant les symboles
- **Synchronisation** bidirectionnelle carte ↔ liste
- **Design moderne** avec animations fluides

## 🛠️ Technologies Utilisées

- **HTML5** + **CSS3** + **JavaScript ES6**
- **PWA** - Progressive Web App avec Service Worker
- **Leaflet.js** 1.9.4 - Cartes interactives
- **JSZip** 3.10.1 - Extraction de fichiers ZIP
- **OpenStreetMap** - Tuiles cartographiques
- **Font Awesome** 6.4.0 - Icônes
- **Google Fonts** (Inter) - Typographie

## 🗂️ Structure des Fichiers

```
📁 Carte Interactive POI ZIP (PWA)
├── 📄 index.html                    # Application principale 
├── 📁 css/
│   └── style.css                   # Styles complets + PWA
├── 📁 js/
│   ├── main.js                     # Logique carte et ZIP
│   ├── pwa-handler.js              # Gestionnaire PWA
│   └── icon-generator.js           # Générateur d'icônes
├── 📁 icons/
│   ├── icon.svg                    # Icône source vectorielle
│   └── generate-base64-icons.html  # Générateur d'icônes
├── 📁 .github/
│   └── ISSUE_TEMPLATE/             # Templates GitHub
├── 📱 manifest.json                # Manifest PWA
├── ⚙️ service-worker.js            # Service Worker cache
├── 🌐 browserconfig.xml            # Config navigateurs MS
├── 📋 README.md                    # Documentation technique
├── 📖 GUIDE-UTILISATION.md         # Guide utilisateur
├── 📱 INSTALLATION-PWA.md          # Guide installation PWA
├── 🤝 CONTRIBUTING.md              # Guide de contribution
├── 📊 exemple-visit.json           # Exemple de données
├── 🛠️ generate-icons.html          # Outil génération icônes
└── 📄 LICENSE                      # Licence MIT
```

## 📋 Format du Fichier visit.json

```json
{
  "name": "Nom de la visite",
  "pois": [
    {
      "id": 1,
      "title": "Titre du POI",
      "location": "50.04525N, 1.32983E",
      "comment": "Description du point d'intérêt",
      "image": true,
      "video": false,
      "audio": true,
      "details": 0
    }
  ]
}
```

### Champs du POI :
- **id** : Identifiant unique numérique
- **title** : Nom du point d'intérêt
- **location** : Coordonnées GPS format "latitudeN/S, longitudeE/W"
- **comment** : Description textuelle (optionnel)
- **image** : Boolean - présence d'images
- **video** : Boolean - présence de vidéos  
- **audio** : Boolean - présence d'audio
- **details** : Niveau de détail (non utilisé actuellement)

## 🎮 Utilisation

### 1. Préparation des Données
1. Créez votre fichier `visit.json` avec la liste des POI
2. Organisez vos médias dans le dossier `data/` par ID de POI
3. Compressez le tout dans un fichier ZIP

### 2. Chargement
1. Ouvrez l'application dans votre navigateur
2. Glissez-déposez votre fichier ZIP ou cliquez pour le sélectionner
3. Attendez l'extraction et le chargement des médias
4. La carte s'affiche automatiquement avec tous vos POI

### 3. Navigation
- **Cliquez** sur les markers pour voir les détails et médias
- **Utilisez la liste** des POI pour naviguer rapidement
- **Survolez** les éléments pour des aperçus rapides
- **Zoomez/déplacez** la carte librement

## 🗂️ Structure des Fichiers

```
📁 Projet Carte POI ZIP
├── index.html              # Page principale avec interface upload
├── css/
│   └── style.css          # Styles responsive complets
├── js/
│   └── main.js            # Logique complète (upload + carte)
└── README.md              # Documentation (ce fichier)
```

## 🔧 Fonctionnalités Techniques

### Extraction ZIP
- **Lecture asynchrone** des fichiers ZIP avec JSZip
- **Détection automatique** du type de médias par extension
- **Conversion optimisée** : Base64 pour images, Blob URL pour vidéos/audio
- **Gestion mémoire** efficace pour gros fichiers

### Gestion des Coordonnées
- **Parser intelligent** pour format "DDN/S, DDN/S"
- **Support** hémisphères Nord/Sud et Est/Ouest
- **Validation** et gestion d'erreurs robuste

### Performance
- **Chargement progressif** des médias
- **Optimisation mémoire** avec Blob URLs
- **Rendu efficace** des popups à la demande
- **Responsive design** pour tous appareils

## 🚨 Gestion d'Erreurs

- **Validation** du format ZIP et fichiers requis
- **Messages d'erreur** explicites et localisés
- **Fallback gracieux** si médias manquants
- **Logs détaillés** pour débogage

## 📱 Compatibilité

- **Navigateurs modernes** (Chrome, Firefox, Safari, Edge)
- **Appareils mobiles** et tablettes
- **Formats médias** standards du web
- **Fichiers ZIP** jusqu'à plusieurs centaines de Mo

## 🚀 Déploiement

Pour déployer votre carte interactive :
1. Utilisez l'onglet **Publier** pour mettre en ligne automatiquement
2. Partagez l'URL générée avec vos utilisateurs
3. Ils pourront charger leurs propres fichiers ZIP de visites

---

## 🤝 Contribution

Les contributions sont les bienvenues ! 

### Comment Contribuer :
1. **Fork** le projet
2. Créez une **branche** pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Committez** vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. **Pushez** vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une **Pull Request**

### Idées d'Améliorations :
- 🎨 Thèmes de couleurs personnalisables
- 📊 Export des données en différents formats
- 🌍 Support multilingue
- 📱 Mode hors-ligne avec Service Worker
- 🔍 Recherche et filtres avancés

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## ⭐ Support

Si ce projet vous a été utile, n'hésitez pas à lui donner une **⭐ étoile** !

### Questions ou Problèmes ?
- 🐛 **Bug** : Ouvrez une [Issue](https://github.com/votre-username/carte-interactive-poi-zip/issues)
- 💡 **Suggestion** : Créez une [Discussion](https://github.com/votre-username/carte-interactive-poi-zip/discussions)
- 📧 **Contact** : [votre-email@exemple.com](mailto:votre-email@exemple.com)

---

**Application créée avec ❤️ pour la communauté !** 🎯  
Prête à charger et visualiser vos visites géologiques, touristiques ou éducatives avec tous leurs médias intégrés.