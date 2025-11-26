# TraceVisu 🗺️

Application Progressive Web App (PWA) pour visualiser et convertir des traces GPS.

## 📍 Déploiement

L'application est accessible à l'adresse :  
**https://BernardHoyez.github.io/PWA/tracevisu**

## ✨ Fonctionnalités

- **Import** : Fichiers KML et GPX
- **Visualisation** : Carte interactive OpenStreetMap avec :
  - Trace colorée
  - Marqueurs de départ et d'arrivée
  - Statistiques (distance, dénivelé, nombre de points)
- **Export** : Conversion vers HTML, GPX, KML et GeoJSON
- **PWA** : Installation sur mobile et desktop, utilisation hors ligne

## 🗂️ Structure des fichiers

```
PWA/tracevisu/
│
├── index.html              # Application principale (React)
├── manifest.json           # Manifeste PWA
├── sw.js                   # Service Worker pour le mode hors ligne
├── icon192.png             # Icône 192x192 (personnalisée)
├── icon512.png             # Icône 512x512 (personnalisée)
└── README.md               # Ce fichier
```

## 📦 Installation

### Déploiement sur GitHub Pages

1. Cloner le repository
```bash
git clone https://github.com/BernardHoyez/PWA.git
cd PWA/tracevisu
```

2. Ajouter les fichiers
```bash
git add .
git commit -m "Ajout TraceVisu PWA"
git push origin main
```

3. Activer GitHub Pages :
   - Aller dans Settings → Pages
   - Source : Deploy from a branch
   - Branch : main / root
   - Sauvegarder

### Installation comme PWA

Sur mobile ou desktop, cliquer sur "Installer l'application" dans le navigateur.

## 🚀 Utilisation

1. **Importer** un fichier KML ou GPX
2. **Visualiser** la trace sur la carte interactive
3. **Télécharger** aux formats souhaités :
   - HTML (carte complète)
   - GPX (format GPS)
   - KML (Google Earth)
   - GeoJSON (données géographiques)

## 🛠️ Technologies

- **React** : Interface utilisateur
- **Leaflet** : Cartographie OpenStreetMap
- **PWA** : Service Worker + Manifest
- **Lucide React** : Icônes

## 📱 Compatibilité

- ✅ Chrome / Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS & macOS)
- ✅ Samsung Internet

## 📄 Licence

MIT License - Libre d'utilisation

## 👤 Auteur

Bernard Hoyez  
GitHub: [@BernardHoyez](https://github.com/BernardHoyez)

---

**Note** : Les icônes `icon192.png` et `icon512.png` doivent être créées et placées à la racine du dossier `tracevisu/` avant le déploiement.