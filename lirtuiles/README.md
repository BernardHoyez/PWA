# LirTuiles - PWA Lecteur MBTiles

PWA pour afficher des cartes MBTiles en offline avec position GPS.

## Installation sur Android
1. Ouvrir Chrome à `https://bernardhoyez.github.io/PWA/lirtuiles`
2. Menu → "Installer l'application"

## Utilisation
1. **Charger une carte** : Touchez 📁 pour sélectionner un fichier `.mbtiles`
2. **Se localiser** : Touchez 📍 pour centrer la carte sur votre position GPS

## Contraintes
- Les fichiers MBTiles doivent être copiés manuellement dans le téléphone
- **Accès direct au dossier Documents impossible** pour des raisons de sécurité (sélection de fichier manuelle requise)

## Technologies
- Leaflet + sql.js + Leaflet.TileLayer.MBTiles
- Service Worker pour le mode offline