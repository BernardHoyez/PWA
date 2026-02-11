# 📍 KMZ to KML Converter v1.0

Application Web Progressive (PWA) pour optimiser les traces de randonnée OruxMaps avec photos géolocalisées.

## ✨ Fonctionnalités

### 🎯 Workflow complet en 3 étapes

1. **Upload & Personnalisation**
   - Glissez-déposez votre fichier KMZ
   - Optimisation automatique des photos (1920px max, JPEG 82%)
   - Détection automatique de la commune via géolocalisation
   - Édition des noms de waypoints (max 20 caractères)
   - Ajout de commentaires optionnels (max 60 caractères)

2. **Téléchargement KMZ modifié**
   - Fichier prêt à uploader sur GitHub
   - Structure : `/kmz-photos/{Commune}_{Nom}/`
   - Photos optimisées incluses

3. **Téléchargement KML final**
   - Liens pointant vers GitHub
   - Boutons "🔍 Agrandir l'image" pour chaque photo
   - Compatible Google Earth / OruxMaps

## 🛠️ Technologies utilisées

- **DOMParser/XMLSerializer** : Manipulation propre du XML/KML
- **JSZip** : Gestion des archives KMZ
- **Nominatim API** : Géolocalisation inverse (OSM)
- **Canvas API** : Optimisation des images
- **Service Worker** : Mode offline (PWA)

## 📦 Structure du projet

```
kmz-to-kml/
├── index.html          # Interface utilisateur
├── style.css           # Design responsive
├── app.js              # Logique (DOMParser)
├── manifest.json       # Configuration PWA
├── sw.js               # Service Worker
├── icon192.png         # Icône 192x192
├── icon512.png         # Icône 512x512
└── README.md           # Documentation
```

## 🚀 Installation

### Option 1 : GitHub Pages

1. Forkez ce repo
2. Activez GitHub Pages (Settings > Pages)
3. Accédez à `https://VOTRE-USER.github.io/kmz-to-kml/`

### Option 2 : Local

```bash
# Serveur simple Python
python3 -m http.server 8000

# Ou serveur Node.js
npx serve
```

Puis ouvrez `http://localhost:8000`

## 📖 Guide d'utilisation

### 1. Préparer votre trace OruxMaps

- Créez une trace avec photos dans OruxMaps
- Exportez au format KMZ
- Les photos doivent être des waypoints de style #3

### 2. Traiter avec l'application

1. **Uploadez** votre fichier KMZ
2. **Attendez** l'analyse (détection commune + optimisation)
3. **Personnalisez** les noms et commentaires
4. **Vérifiez** le nom de la commune détectée

### 3. Télécharger le KMZ modifié

- Cliquez sur "📦 Télécharger KMZ modifié"
- Fichier généré : `{Commune}_{Nom}.kmz`

### 4. Uploader sur GitHub

Structure à respecter :
```
votre-repo/
└── kmz-photos/
    └── {Commune}_{Nom}/
        ├── doc.kml
        └── files/
            ├── photo1.jpg
            ├── photo2.jpg
            └── ...
```

### 5. Configurer l'URL GitHub

Dans l'application, entrez votre URL de base :
```
https://raw.githubusercontent.com/VOTRE-USER/VOTRE-REPO/main/kmz-photos
```

### 6. Télécharger le KML final

- Cliquez sur "📄 Télécharger KML final"
- Fichier prêt pour Google Earth !

## 🎨 Points clés de l'approche DOMParser

### Avant (regex - ❌ problématique)
```javascript
let kml = originalKmlContent; // STRING
kml = kml.replace(/<name>.*?<\/name>/, '<name>Nouveau</name>');
// ❌ Problèmes : échappement, CDATA, namespaces...
```

### Maintenant (DOMParser - ✅ propre)
```javascript
const doc = new DOMParser().parseFromString(kmlText, 'text/xml');
const nameEl = doc.getElementsByTagName('name')[0];
nameEl.textContent = 'Nouveau';
const newKml = new XMLSerializer().serializeToString(doc);
// ✅ Le navigateur gère tout !
```

## 🔧 Personnalisation

### Modifier la taille d'optimisation

Dans `app.js`, ligne ~357 :
```javascript
const maxSize = 1920; // Changez ici
```

### Modifier la qualité JPEG

Dans `app.js`, ligne ~372 :
```javascript
canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82); // 0.82 = 82%
```

### Modifier les limites de caractères

- Noms : `maxlength="20"` dans `index.html`
- Commentaires : `maxlength="60"` dans `index.html`

## 📝 Compatibilité

- ✅ OruxMaps v10.6+
- ✅ Google Earth
- ✅ Tous navigateurs modernes
- ✅ Mode offline (PWA)

## 🐛 Dépannage

### "Aucun waypoint photo trouvé"
→ Vérifiez que vos waypoints utilisent le style #3 dans OruxMaps

### "Détection commune échouée"
→ Modifiez manuellement le nom de la commune

### Images non optimisées
→ Vérifiez que votre navigateur supporte Canvas API

## 📄 Licence

MIT - Utilisez librement !

---

**Version 1.0** - Février 2026  
Créé avec ❤️ pour les randonneurs
