# MonIP - PWA Afficheur d'adresses IP

Application Progressive Web App pour afficher votre adresse IP publique et privée en temps réel.

## 📁 Structure des fichiers

Créez cette structure dans votre repository GitHub :

```
BernardHoyez.github.io/
└── PWA/
    └── monip/
        ├── index.html
        ├── app.js
        ├── sw.js
        ├── manifest.json
        ├── icon-192.png
        ├── icon-512.png
        └── README.md
```

## 🚀 Installation sur GitHub Pages

### 1. Créer le repository (si pas déjà fait)
- Nom du repository : `BernardHoyez.github.io`
- Public

### 2. Créer la structure de dossiers
```bash
mkdir -p PWA/monip
cd PWA/monip
```

### 3. Ajouter les fichiers
Copiez les fichiers suivants dans le dossier `PWA/monip/` :
- `index.html`
- `app.js`
- `sw.js`
- `manifest.json`

### 4. Créer les icônes

Vous devez créer deux icônes PNG :
- **icon-192.png** : 192x192 pixels
- **icon-512.png** : 512x512 pixels

**Option 1 - Créer manuellement :**
Utilisez un éditeur graphique (Photoshop, GIMP, Canva, Figma) pour créer des icônes avec :
- Fond bleu (#1e3a8a)
- Logo/texte "MonIP" ou symbole de globe/réseau
- Format PNG transparent ou avec fond

**Option 2 - Utiliser un générateur en ligne :**
- https://realfavicongenerator.net/
- https://favicon.io/
- Uploadez une image et générez les différentes tailles

**Option 3 - Générer depuis SVG :**
Si vous avez un logo SVG, convertissez-le aux bonnes dimensions :
```bash
# Avec ImageMagick
convert logo.svg -resize 192x192 icon-192.png
convert logo.svg -resize 512x512 icon-512.png
```

### 5. Pousser vers GitHub
```bash
git add .
git commit -m "Ajout PWA MonIP"
git push origin main
```

### 6. Activer GitHub Pages
1. Allez dans **Settings** > **Pages**
2. Source : **Deploy from a branch**
3. Branch : **main** / folder : **/ (root)**
4. Save

### 7. Accéder à l'application
Votre PWA sera accessible à :
**https://BernardHoyez.github.io/PWA/monip/**

## ✅ Vérification

Une fois déployé, testez :
1. **Navigation** : Ouvrez l'URL dans votre navigateur
2. **Installation PWA** : Une bannière devrait apparaître pour installer l'app
3. **Service Worker** : Ouvrez DevTools > Application > Service Workers
4. **Cache** : Vérifiez que les fichiers sont en cache
5. **Hors ligne** : Désactivez le réseau, l'app devrait toujours fonctionner (sauf APIs externes)

## 🎨 Personnalisation des icônes

Voici un exemple de design simple pour vos icônes :

**Recommandations :**
- Utilisez le gradient bleu/violet du thème : `linear-gradient(135deg, #1e3a8a 0%, #7e22ce 50%, #3730a3 100%)`
- Ajoutez un symbole de globe ou de réseau en blanc
- Gardez le design simple et reconnaissable
- Format PNG avec transparence

**Design suggéré :**
- Fond : Dégradé bleu → violet
- Centre : Globe blanc stylisé ou texte "IP"
- Style : Moderne, épuré, flat design

## 🔧 Configuration

Si vous voulez déployer à un autre chemin, modifiez dans tous les fichiers :
- `/PWA/monip/` → votre nouveau chemin
- Dans `index.html`, `manifest.json`, et `sw.js`

## 📱 Fonctionnalités

✅ Affichage IP publique avec géolocalisation  
✅ Affichage IP privée (locale)  
✅ Copie en un clic  
✅ Actualisation manuelle  
✅ Installation en tant qu'app (PWA)  
✅ Fonctionne hors ligne (interface)  
✅ Design responsive et moderne  

## 🛠️ Technologies

- HTML5
- CSS3 (Glassmorphism)
- JavaScript Vanilla (ES5)
- Service Worker API
- WebRTC (détection IP locale)
- Fetch API (IP publique)

## 📄 Licence

Libre d'utilisation personnelle

## 👤 Auteur

Bernard Hoyez
https://github.com/BernardHoyez