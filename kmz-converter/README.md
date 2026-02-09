# 🗺️ KMZ Converter - Extracteur de photos

PWA pour extraire et optimiser automatiquement les photos de vos traces de randonnée au format KMZ, et générer un KML avec liens vers GitHub.

## ✨ Fonctionnalités

- 📤 **Upload simple** : Drag & drop ou sélection de fichier
- 🖼️ **Extraction automatique** : Récupère toutes les images du dossier `files/` dans le KMZ
- 🎯 **Optimisation intelligente** : Redimensionne automatiquement les images à 1920px max
- 📦 **Export ZIP** : Génère un dossier prêt pour GitHub Pages
- 🗺️ **Génération KML** : Crée un fichier KML avec liens vers vos photos sur GitHub
- 🌐 **PWA** : Fonctionne offline après la première visite
- 📱 **Responsive** : Compatible mobile, tablette et desktop

## 🚀 Installation

### Sur votre GitHub Pages

1. Créez le dossier `PWA/kmz-photos/` dans votre repository `bernardhoyez.github.io`

2. Copiez tous les fichiers de cette application :
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`

3. Commitez et pushez vers GitHub

4. Accédez à : `https://bernardhoyez.github.io/PWA/kmz-photos/`

### En local (pour tester)

```bash
# Ouvrez simplement index.html dans votre navigateur
# ou utilisez un serveur local :
python -m http.server 8000
# Puis ouvrez http://localhost:8000
```

## 📖 Utilisation

### Étape 1 : Extraire les photos

1. Ouvrez l'application
2. Glissez votre fichier `.kmz` ou cliquez pour le sélectionner
3. Attendez le traitement (automatique)
4. Visualisez les miniatures des photos extraites

### Étape 2 : Télécharger les fichiers

Vous avez maintenant **deux options** :

#### Option A : ZIP avec photos (recommandé en premier)
1. Cliquez sur **"Télécharger le dossier optimisé (ZIP)"**
2. Un fichier `nom-de-votre-trace.zip` sera téléchargé

#### Option B : KML avec liens GitHub
1. Vérifiez/modifiez l'URL de base GitHub (par défaut : `https://bernardhoyez.github.io/PWA/kmz-photos/`)
2. Notez le nom du dossier qui sera créé (affiché sous l'URL)
3. Cliquez sur **"Télécharger le KML avec liens GitHub"**
4. Un fichier `nom-de-votre-trace-github.kml` sera téléchargé

### Étape 3 : Publier sur GitHub

1. **Extrayez le ZIP** téléchargé
2. Vous obtiendrez un dossier `nom-de-votre-trace/` contenant :
   - Toutes vos photos optimisées
   - Un fichier `index.html` pour les visualiser

3. **Copiez ce dossier** dans `PWA/kmz-photos/` de votre repository

4. **Commitez et pushez** :
```bash
git add PWA/kmz-photos/nom-de-votre-trace/
git commit -m "Ajout photos de randonnée"
git push
```

5. **Utilisez le KML** : Une fois les photos en ligne, votre fichier `.kml` pointera automatiquement vers les bonnes URLs !

### Étape 4 : Utiliser le KML

Le fichier KML généré contient des liens directs vers vos photos sur GitHub. Vous pouvez :

- L'ouvrir dans **Google Earth** (desktop ou web)
- L'importer dans **Google Maps My Maps**
- Le partager avec d'autres personnes
- L'utiliser dans n'importe quelle application compatible KML

**Important** : Le KML ne fonctionnera correctement qu'**après** avoir uploadé les photos sur GitHub !

## 🎨 Structure du dossier généré

```
nom-de-votre-trace/
├── index.html          # Galerie photo avec lightbox
├── photo1.jpg          # Photos optimisées
├── photo2.jpg
├── photo3.jpg
└── ...
```

## 🗺️ Fonctionnement du KML

### Avant (KML original avec images intégrées)
```xml
<PhotoOverlay>
  <Icon>
    <href>files/IMG_1234.jpg</href>
  </Icon>
</PhotoOverlay>
```

### Après (KML avec liens GitHub)
```xml
<PhotoOverlay>
  <Icon>
    <href>https://bernardhoyez.github.io/PWA/kmz-photos/ma-randonnee/IMG_1234.jpg</href>
  </Icon>
</PhotoOverlay>
```

**Avantages** :
- ✅ Fichier KML ultra-léger (~10 KB au lieu de plusieurs MB)
- ✅ Facile à partager par email
- ✅ Les photos restent accessibles en ligne
- ✅ Compatible avec tous les logiciels supportant KML

## ⚙️ Optimisation des images

- **Dimension max** : 1920px (plus grande dimension)
- **Format** : JPEG
- **Qualité** : 85%
- **Réduction moyenne** : ~70-80% de la taille originale

### Exemples de réduction :

| Original | Optimisé | Gain |
|----------|----------|------|
| 4 MB     | ~500 KB  | 87%  |
| 3 MB     | ~400 KB  | 86%  |
| 2 MB     | ~300 KB  | 85%  |

## 📊 Limites GitHub Pages

- **Taille du repository** : 1 GB (recommandé)
- **Taille par fichier** : 100 MB max
- **Photos par trace** : ~50-100 (avec optimisation)

Avec l'optimisation à 1920px :
- 1 photo ≈ 400-500 KB
- 50 photos ≈ 20-25 MB par trace
- Vous pouvez héberger **~40 traces** facilement

## 🛠️ Technologies utilisées

- **HTML5** : Structure
- **CSS3** : Design moderne et responsive
- **Vanilla JavaScript** : Logique métier
- **JSZip** : Manipulation des archives ZIP/KMZ
- **Canvas API** : Redimensionnement des images
- **Service Worker** : Fonctionnement offline (PWA)

## 📱 Compatibilité

- ✅ Chrome / Edge (recommandé)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile iOS / Android

## 🐛 Résolution de problèmes

### Le fichier KMZ n'est pas reconnu
- Vérifiez que c'est bien un fichier `.kmz` (pas `.kml`)
- Le fichier doit contenir un dossier `files/` avec des images

### Pas d'images extraites
- Vérifiez que votre KMZ contient bien des photos dans `files/`
- Formats supportés : JPG, JPEG, PNG, GIF, WEBP

### Erreur lors du téléchargement du ZIP
- Vérifiez que votre navigateur autorise les téléchargements
- Essayez de vider le cache et recharger

### L'application ne fonctionne pas offline
- Visitez l'application une première fois avec connexion internet
- Le Service Worker doit être activé (vérifiez dans les DevTools)

### Le KML ne montre pas les photos
- Vérifiez que vous avez bien uploadé le dossier de photos sur GitHub
- Attendez quelques minutes que GitHub Pages se mette à jour
- Vérifiez l'URL de base dans la configuration (doit finir par `/`)
- Testez directement une URL de photo dans votre navigateur

### Les URLs dans le KML sont incorrectes
- Vérifiez l'URL de base avant de télécharger le KML
- Par défaut : `https://bernardhoyez.github.io/PWA/kmz-photos/`
- Le nom du dossier est généré automatiquement à partir du nom du fichier KMZ

## 📝 À faire (idées futures)

- [ ] Support du format KML (non compressé)
- [ ] Choix de la qualité de compression
- [ ] Prévisualisation de la carte GPS
- [ ] Export direct vers Google Drive
- [ ] Batch processing (plusieurs KMZ à la fois)
- [ ] Statistiques de la trace (distance, dénivelé)

## 📄 Licence

Libre d'utilisation pour usage personnel.

## 👤 Auteur

Créé pour Bernard Hoyez
Repository : `bernardhoyez.github.io`

## 🤝 Contribution

N'hésitez pas à suggérer des améliorations ou signaler des bugs !

---

**Note** : Cette application traite vos fichiers localement dans le navigateur. Aucune donnée n'est envoyée sur internet.
