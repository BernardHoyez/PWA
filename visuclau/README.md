# Guide de Visite PWA

Application Progressive Web App (PWA) de guide de visite sur le terrain avec géolocalisation GPS et support des médias.

## 📁 Structure des fichiers

```
field-guide-pwa/
├── index.html          # Page principale
├── manifest.json       # Manifeste PWA
├── sw.js              # Service Worker
├── styles.css         # Feuille de style
├── app.js             # Application JavaScript
├── icons/             # Icônes PWA
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── screenshots/       # Captures d'écran (optionnel)
    ├── mobile-1.png
    └── desktop-1.png
```

## 🚀 Installation

1. **Créer les fichiers** : Copiez tous les fichiers fournis dans un dossier
2. **Créer le dossier icons/** et générer les icônes PWA
3. **Servir via HTTPS** : La PWA nécessite HTTPS (ou localhost pour les tests)

### Génération des icônes

Créez un dossier `icons/` et générez les icônes aux tailles suivantes :
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

**Outil recommandé** : [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)

### Serveur de test local

```bash
# Avec Node.js/npm
npx serve .

# Avec Python 3
python -m http.server 8000

# Avec PHP
php -S localhost:8000
```

## 📱 Fonctionnalités

### ✅ Chargement ZIP
- Interface pour sélectionner fichier ZIP
- Parsing automatique de `visit.json`
- Support médias (JPEG, MP4, MP3)
- Gestion erreurs robuste

### ✅ Carte interactive
- OpenStreetMap avec Leaflet
- Marqueurs numérotés par ID
- Zoom automatique adaptatif
- Design responsive mobile

### ✅ Géolocalisation
- GPS temps réel avec marqueur pulsant
- Calcul distance et azimut
- Gestion erreurs géolocalisation
- Optimisation batterie

### ✅ Popups riches
- 85% largeur écran (responsive)
- Médias intégrés (images/vidéos/audio)
- Commentaires formatés
- Coordonnées GPS affichées

### ✅ PWA complète
- Installable sur écran d'accueil
- Fonctionnement hors ligne
- Service Worker avec cache intelligent
- Notifications de mise à jour
- Support mode sombre/contraste élevé

## 📦 Format des données

### Structure ZIP requise
```
votre-visite.zip
├── visit.json
└── data/
    ├── 1/
    │   ├── Titre.txt
    │   ├── Localisation.txt
    │   ├── Commentaire.txt
    │   ├── IMG_exemple.jpg
    │   └── audio_exemple.mp3
    ├── 2/
    │   ├── Titre.txt
    │   ├── Localisation.txt
    │   ├── Commentaire.txt
    │   └── video_exemple.mp4
    └── 3/
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
    "audio": "Diapo43c_Dessin_des_falaises.mp3"
  },
  {
    "id": 2,
    "folder": "2",
    "titleFile": "Titre.txt",
    "locationFile": "Localisation.txt",
    "commentFile": "Commentaire.txt",
    "image": "OMIMG_20240802_183545.jpg",
    "audio": "Diapo40_Cycles_dans_la_craie.mp3"
  },
  {
    "id": 3,
    "folder": "3",
    "titleFile": "Titre.txt",
    "locationFile": "Localisation.txt",
    "commentFile": "Commentaire.txt",
    "video": "VID_20241212_160922_Fagesia.mp4"
  }
]
```

### Format des coordonnées supportés
Le fichier `Localisation.txt` peut contenir :
```
49.123456, 0.234567
lat: 49.123456, lon: 0.234567
latitude: 49.123456, longitude: 0.234567
49.123456° N, 0.234567° E
```

## 🔧 Configuration

### Personnalisation du manifest.json
```json
{
  "name": "Votre Guide de Visite",
  "short_name": "Guide",
  "description": "Description personnalisée",
  "theme_color": "#votre-couleur",
  "background_color": "#votre-couleur-bg"
}
```

### Variables CSS personnalisables
```css
:root {
  --primary: #2563eb;        /* Couleur principale */
  --primary-dark: #1d4ed8;   /* Couleur principale foncée */
  --secondary: #10b981;      /* Couleur secondaire */
  --danger: #ef4444;         /* Couleur GPS/erreurs */
}
```

## 🛠️ Développement

### Structure du code
- **app.js** : Logique principale de l'application
- **sw.js** : Service Worker pour le cache et mode hors ligne  
- **styles.css** : Styles responsives avec variables CSS
- **manifest.json** : Configuration PWA

### Points d'entrée principaux
```javascript
// Initialisation
const app = new FieldGuideApp();

// Chargement ZIP
app.handleZipUpload(file);

// Géolocalisation
app.startGeolocation();

// Affichage POI
app.showPOIPopup(poi);
```

## 📱 Tests sur mobile

### Chrome/Edge (Android)
1. Ouvrir l'URL HTTPS
2. Menu → "Ajouter à l'écran d'accueil"
3. Ou notification automatique d'installation

### Safari (iOS)
1. Ouvrir l'URL HTTPS  
2. Bouton Partager → "Sur l'écran d'accueil"

### Tests de fonctionnalités
- ✅ Chargement fichier ZIP
- ✅ Géolocalisation (autoriser l'accès)
- ✅ Affichage carte et marqueurs
- ✅ Popups avec médias
- ✅ Mode hors ligne
- ✅ Installation PWA

## 🔒 Sécurité et vie privée

- **Géolocalisation** : Utilisée uniquement localement, pas de transmission
- **Données ZIP** : Traitées côté client, pas de serveur
- **Cache** : Stockage local sécurisé via Service Worker
- **HTTPS requis** : Protection des données en transit

## 🌐 Compatibilité navigateurs

| Navigateur | Version min | PWA | GPS | Médias |
|------------|-------------|-----|-----|--------|
| Chrome     | 67+         | ✅  | ✅  | ✅     |
| Firefox    | 79+         | ✅  | ✅  | ✅     |
| Safari     | 11.1+       | ✅  | ✅  | ✅     |
| Edge       | 79+         | ✅  | ✅  | ✅     |

## 🐛 Dépannage

### Problèmes fréquents

**PWA ne s'installe pas**
- Vérifier HTTPS activé
- Contrôler la présence de `manifest.json`
- Vérifier les icônes dans le dossier `icons/`

**Géolocalisation ne fonctionne pas**
- Autoriser l'accès à la localisation
- Vérifier HTTPS (requis pour GPS)
- Tester en extérieur (meilleur signal)

**Fichier ZIP ne charge pas**
- Vérifier la structure : `visit.json` à la racine
- Contrôler le format JSON (validateur en ligne)
- Vérifier l'encodage UTF-8 des fichiers texte

**Médias ne s'affichent pas**
- Formats supportés : JPEG, MP4, MP3
- Taille maximum : ~50MB par fichier
- Noms de fichiers sans caractères spéciaux

### Console de débogage
Ouvrir les outils développeur (F12) pour voir les erreurs détaillées.

## 📈 Performance

### Optimisations incluses
- **Cache intelligent** : Cartes et assets en cache
- **Lazy loading** : Images chargées à la demande  
- **Compression** : Gzip activé côté serveur
- **Responsive** : Adaptatif toutes tailles écran

### Recommandations
- **Taille images** : Optimiser à 1920px max
- **Vidéos** : Compresser en H.264/MP4
- **Audio** : MP3 128kbps suffisant
- **ZIP** : Éviter les fichiers > 100MB

## 🔄 Mises à jour

L'application détecte automatiquement les mises à jour et affiche une notification. Les utilisateurs peuvent :
1. Accepter la mise à jour → Rechargement automatique
2. Continuer avec l'ancienne version

## 📞 Support

Pour signaler un bug ou demander une fonctionnalité :
1. Vérifier la liste des problèmes connus ci-dessus
2. Tester sur plusieurs navigateurs
3. Fournir les détails : navigateur, OS, fichier ZIP de test

## 📄 Licence

Ce projet est sous licence MIT. Libre d'utilisation pour projets personnels et commerciaux.

---

**Développé avec ❤️ pour les guides de terrain**