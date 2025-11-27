# traceA

> Convertisseur GPX/KML avancé avec statistiques, waypoints et partage

![PWA](https://img.shields.io/badge/PWA-Ready-success)
![Offline](https://img.shields.io/badge/Offline-Compatible-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Description

**traceA** est une Progressive Web App (PWA) avancée qui convertit vos fichiers de traces GPS (GPX ou KML) en cartes HTML interactives avec :
- 📊 **Statistiques détaillées** (distance, dénivelé, durée)
- 📍 **Waypoints et POI** affichés sur la carte
- 🏷️ **Nommage intelligent** des fichiers générés
- 🔗 **Partage facile** de vos traces
- 🖨️ **Export PDF/impression** optimisée
- 🗺️ **Choix du fond** : OpenStreetMap ou IGN Plan V2

L'application fonctionne entièrement dans votre navigateur - aucune donnée n'est envoyée à un serveur externe.

## ✨ Fonctionnalités principales

### 📊 Statistiques automatiques
- **Distance totale** : Calculée avec précision en kilomètres
- **Dénivelé positif (D+)** : Si altitude disponible dans le GPX
- **Dénivelé négatif (D-)** : Si altitude disponible dans le GPX
- **Durée** : Si timestamps disponibles dans le fichier
- **Nombre de waypoints** : Points d'intérêt détectés

### 📍 Waypoints et POI
- Affichage automatique des waypoints du GPX/KML
- Marqueurs cliquables sur la carte
- Pop-ups avec nom et description
- Icônes distinctives pour les points d'intérêt

### 🏷️ Nommage intelligent
Les fichiers générés suivent un format descriptif :
```
trace-Honfleur-15.23km-2025-01-15.html
trace-Paris-42.50km-2025-02-20.html
```
- Détection automatique du lieu (via reverse geocoding)
- Distance arrondie en km
- Date de génération

### 🔗 Partage et export
Dans le fichier HTML généré :
- **Bouton Partager** : Utilise l'API Web Share (mobile) ou télécharge le fichier
- **Bouton Imprimer** : Version optimisée pour impression
- **Bouton PDF** : Export en image PNG haute résolution
- **Exports classiques** : GPX, KML, GeoJSON

### 🗺️ Deux fonds de carte
- **OpenStreetMap** : Couverture mondiale
- **IGN Plan V2** : Haute précision France métropolitaine

## 🚀 Utilisation

### En ligne

Accédez à l'application : [https://BernardHoyez.github.io/PWA/traceA/](https://BernardHoyez.github.io/PWA/traceA/)

### Étapes

1. **Choisissez** le fond de carte : OpenStreetMap ou IGN Plan V2
2. **Glissez-déposez** un fichier `.gpx` ou `.kml`
3. **Attendez** l'analyse et le reverse geocoding
4. **Téléchargez** le fichier HTML nommé intelligemment
5. **Ouvrez** le fichier HTML pour voir :
   - La carte interactive avec le tracé
   - Les statistiques dans un panneau
   - Les waypoints cliquables
   - Les boutons de partage et export

## 📊 Exemple de statistiques affichées

```
📊 Statistiques
Distance: 15.23 km
D+: 450 m
D-: 420 m
Durée: 3h24
Points: 5
```

## 📁 Structure du projet

```
traceA/
├── index.html          # Interface avec sélecteur de carte
├── app.js              # Logique avancée (stats, waypoints, nommage)
├── sw.js               # Service Worker (mode offline)
├── manifest.json       # Configuration PWA
├── icon192.png         # Icône 192x192
└── icon512.png         # Icône 512x512
```

## 🛠️ Technologies

- **Vanilla JavaScript** : Aucun framework requis
- **Leaflet** : Bibliothèque de cartographie interactive
- **Turf.js** : Calculs géospatiaux (distance, bbox)
- **toGeoJSON** : Conversion GPX/KML → GeoJSON
- **togpx / tokml** : Conversions inverses
- **html2canvas** : Export PDF/image
- **Nominatim** : Reverse geocoding (OpenStreetMap)
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
- `.gpx` - GPS Exchange Format (avec ou sans altitude/timestamps)
- `.kml` - Keyhole Markup Language (avec waypoints)

### En sortie (depuis le HTML généré)
- `.gpx` - GPS Exchange Format
- `.kml` - Keyhole Markup Language  
- `.geojson` - GeoJSON
- `.png` - Export image (via html2canvas)
- `.html` - Partage du fichier complet

## 🔐 Confidentialité

- ✅ Aucune donnée n'est envoyée à un serveur (sauf reverse geocoding via Nominatim)
- ✅ Traitement 100% local dans le navigateur
- ✅ Aucun cookie, aucun tracking
- ✅ Vos fichiers GPS restent privés
- ✅ Accès public aux tuiles IGN (pas de clé API requise)

## ⚠️ Limitations

- Le HTML généré nécessite internet pour le fond de carte
- IGN Plan V2 est limité à la France métropolitaine
- Reverse geocoding nécessite une connexion internet
- Export PDF génère une image PNG (pas de vrai PDF multi-pages)
- Les très gros fichiers (>10 MB) peuvent ralentir le traitement

## 🆚 Différences avec traceY et traceZ

| Fonctionnalité | traceY | traceZ | traceA |
|----------------|--------|--------|--------|
| Drag & drop | ✅ | ✅ | ✅ |
| Choix OSM/IGN | ❌ | ✅ | ✅ |
| Statistiques | ❌ | ❌ | ✅ |
| Waypoints | ❌ | ❌ | ✅ |
| Nommage intelligent | ❌ | ❌ | ✅ |
| Partage | ❌ | ❌ | ✅ |
| Export PDF | ❌ | ❌ | ✅ |
| Impression | ❌ | ❌ | ✅ |

## 🚧 Améliorations futures

- [ ] Support des fichiers `.mbtiles` pour fonctionnement 100% offline
- [ ] Profil altimétrique interactif
- [ ] Personnalisation couleur/épaisseur du tracé
- [ ] Multi-traces avec légende
- [ ] Vrai export PDF multi-pages (avec jsPDF)
- [ ] Support format .fit (Garmin/Strava)
- [ ] Statistiques avancées (vitesse, allure, cadence)
- [ ] Mode sombre

## 💡 Conseils d'utilisation

### Pour de meilleures statistiques
- Utilisez des fichiers GPX avec altitude pour le dénivelé
- Incluez des timestamps pour la durée
- Ajoutez des waypoints pour marquer les points importants

### Pour un nommage optimal
- La localisation est détectée au centre de la trace
- Assurez une connexion internet pour le reverse geocoding
- Le nom de lieu est simplifié (ville principale)

### Pour le partage
- Sur mobile, utilisez le bouton "Partager" natif
- Sur ordinateur, le fichier HTML est téléchargé
- Le fichier HTML peut être envoyé par email/cloud

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
- [Turf.js](https://turfjs.org/) - Calculs géospatiaux
- [OpenStreetMap](https://www.openstreetmap.org/) - Données cartographiques
- [Nominatim](https://nominatim.org/) - Reverse geocoding
- [IGN Géoplateforme](https://geoplateforme.fr/) - Fonds de carte IGN
- [Mapbox](https://github.com/mapbox/togeojson) - Bibliothèque toGeoJSON
- [html2canvas](https://html2canvas.hertzen.com/) - Export image
- Communauté open source

---

⭐ Si vous trouvez ce projet utile, n'hésitez pas à lui donner une étoile !