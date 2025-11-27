# traceZ

> Convertisseur GPX/KML vers carte HTML interactive avec choix du fond de carte

![PWA](https://img.shields.io/badge/PWA-Ready-success)
![Offline](https://img.shields.io/badge/Offline-Compatible-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Description

**traceZ** est une Progressive Web App (PWA) qui convertit vos fichiers de traces GPS (GPX ou KML) en cartes HTML interactives autonomes, avec le **choix du fond de carte** :
- 🌍 **OpenStreetMap** - Couverture mondiale
- 🇫🇷 **IGN Plan V2** - Haute précision pour la France métropolitaine

L'application fonctionne entièrement dans votre navigateur - aucune donnée n'est envoyée à un serveur externe.

## ✨ Fonctionnalités

- 📁 **Drag & Drop** : Glissez-déposez vos fichiers directement
- 🗺️ **Choix du fond de carte** : OSM ou IGN Plan V2
- 🗺️ **Carte interactive** : Visualisation avec Leaflet
- 💾 **Export multiple** : Téléchargez en GPX, KML ou GeoJSON
- 📱 **PWA installable** : Utilisable hors ligne après installation
- 🔒 **100% local** : Vos données restent sur votre appareil
- 🚀 **Zéro configuration** : Prêt à l'emploi

## 🚀 Utilisation

### En ligne

Accédez à l'application : [https://BernardHoyez.github.io/PWA/traceZ/](https://BernardHoyez.github.io/PWA/traceZ/)

### Étapes

1. **Choisissez** le fond de carte : OpenStreetMap ou IGN Plan V2
2. **Glissez-déposez** un fichier `.gpx` ou `.kml` dans la zone prévue
   - Ou cliquez sur la zone pour sélectionner un fichier
3. **Attendez** la conversion (quelques secondes)
4. **Téléchargez** automatiquement le fichier HTML généré
5. **Ouvrez** le fichier HTML dans n'importe quel navigateur

### Le fichier HTML généré

Le fichier HTML résultant contient :
- ✅ Votre tracé GPS (embarqué en GeoJSON)
- ✅ Une carte interactive Leaflet avec le fond choisi (OSM ou IGN)
- ✅ Des boutons pour exporter vers GPX, KML ou GeoJSON
- ⚠️ Nécessite une connexion internet pour afficher le fond de carte

## 🗺️ Fonds de carte disponibles

### OpenStreetMap (OSM)
- **Couverture** : Mondiale
- **Type** : Contributif, open source
- **Détail** : Bon niveau de détail partout
- **Usage** : Traces internationales

### IGN Plan V2
- **Couverture** : France métropolitaine uniquement
- **Type** : Institut National de l'Information Géographique et Forestière
- **Détail** : Très haute précision (bâtiments, chemins, courbes de niveau)
- **Usage** : Traces en France pour un maximum de détails
- **Accès** : Public via la Géoplateforme IGN

## 📦 Installation locale

### Prérequis

Aucun ! Tout fonctionne dans le navigateur.

### Installation comme PWA

1. Ouvrez l'application dans Chrome, Edge ou Safari
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. L'application sera disponible hors ligne sur votre appareil

### Développement local

```bash
# Cloner le dépôt
git clone https://github.com/BernardHoyez/BernardHoyez.github.io.git

# Naviguer vers le dossier
cd BernardHoyez.github.io/PWA/traceZ

# Lancer un serveur local (exemple avec Python)
python -m http.server 8000

# Ouvrir dans le navigateur
# http://localhost:8000
```

## 📁 Structure du projet

```
traceZ/
├── index.html          # Interface principale avec sélecteur de carte
├── app.js              # Logique de l'application
├── sw.js               # Service Worker (mode offline)
├── manifest.json       # Configuration PWA
├── icon192.png         # Icône 192x192
└── icon512.png         # Icône 512x512
```

## 🛠️ Technologies

- **Vanilla JavaScript** : Aucun framework requis
- **Leaflet** : Bibliothèque de cartographie interactive
- **toGeoJSON** : Conversion GPX/KML → GeoJSON
- **togpx** : Conversion GeoJSON → GPX
- **tokml** : Conversion GeoJSON → KML
- **Service Worker** : Fonctionnement hors ligne
- **IGN Géoplateforme** : Accès public aux tuiles IGN Plan V2

## 🌐 Compatibilité

| Navigateur | Version minimum | Support |
|------------|-----------------|---------|
| Chrome     | 67+             | ✅ Complet |
| Firefox    | 63+             | ✅ Complet |
| Safari     | 11.1+           | ✅ Complet |
| Edge       | 79+             | ✅ Complet |

## 📝 Formats supportés

### En entrée
- `.gpx` - GPS Exchange Format
- `.kml` - Keyhole Markup Language

### En sortie (depuis le HTML généré)
- `.gpx` - GPS Exchange Format
- `.kml` - Keyhole Markup Language  
- `.geojson` - GeoJSON

## 🔐 Confidentialité

- ✅ Aucune donnée n'est envoyée à un serveur
- ✅ Traitement 100% local dans le navigateur
- ✅ Aucun cookie, aucun tracking
- ✅ Vos fichiers GPS restent privés
- ✅ Accès public aux tuiles IGN (pas de clé API requise)

## ⚠️ Limitations actuelles

- Le HTML généré nécessite internet pour le fond de carte
- IGN Plan V2 est limité à la France métropolitaine
- Les fichiers très volumineux (>10 MB) peuvent être lents à traiter
- Le Service Worker nécessite HTTPS (sauf localhost)

## 🆚 Différence avec traceY

**traceZ** est l'évolution de **traceY** avec :
- ✅ Choix du fond de carte (OSM ou IGN Plan V2)
- ✅ Interface améliorée avec sélecteur visuel
- ✅ Optimisé pour les cartes françaises avec IGN

## 🚧 Améliorations futures

- [ ] Support des fichiers `.mbtiles` pour fonctionnement 100% offline
- [ ] Autres fonds IGN (satellite, cartes topographiques)
- [ ] Personnalisation de la couleur du tracé
- [ ] Support des waypoints et POI
- [ ] Statistiques de la trace (distance, dénivelé)
- [ ] Fusion de plusieurs traces

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amelioration`)
3. Committez vos changements (`git commit -am 'Ajout fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/amelioration`)
5. Ouvrez une Pull Request

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails

## 👤 Auteur

**Bernard Hoyez**

- GitHub: [@BernardHoyez](https://github.com/BernardHoyez)

## 🙏 Remerciements

- [Leaflet](https://leafletjs.com/) - Bibliothèque de cartographie
- [OpenStreetMap](https://www.openstreetmap.org/) - Données cartographiques
- [IGN Géoplateforme](https://geoplateforme.fr/) - Fonds de carte IGN
- [Mapbox](https://github.com/mapbox/togeojson) - Bibliothèque toGeoJSON
- Communauté open source

---

⭐ Si vous trouvez ce projet utile, n'hésitez pas à lui donner une étoile !