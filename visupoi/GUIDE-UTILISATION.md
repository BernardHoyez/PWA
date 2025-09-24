# Guide d'Utilisation - Carte Interactive POI

## 📦 Préparation de votre Fichier ZIP

### Structure Requise

Votre fichier ZIP doit contenir **exactement** cette structure :

```
ma-visite.zip
├── visit.json          ← Fichier JSON avec les données des POI (OBLIGATOIRE)
└── data/              ← Dossier contenant tous les médias (OBLIGATOIRE)
    ├── 1/             ← Sous-dossier pour POI ID 1
    │   ├── photo1.jpg
    │   ├── audio1.mp3
    │   └── video1.mp4
    ├── 2/             ← Sous-dossier pour POI ID 2
    │   └── image2.png
    ├── 3/             ← Sous-dossier pour POI ID 3
    │   └── son3.wav
    └── 4/             ← etc...
        ├── vue4.jpg
        └── explication4.mp3
```

## 📝 Format du Fichier visit.json

Créez un fichier texte nommé **exactement** `visit.json` avec cette structure :

```json
{
  "name": "Nom de votre visite",
  "pois": [
    {
      "id": 1,
      "title": "Premier Point d'Intérêt",
      "location": "50.04525N, 1.32983E",
      "comment": "Description de ce point",
      "image": true,
      "video": false,
      "audio": true,
      "details": 0
    },
    {
      "id": 2,
      "title": "Deuxième Point",
      "location": "50.08298N, 1.42903E",
      "comment": "Autre description",
      "image": false,
      "video": true,
      "audio": false,
      "details": 0
    }
  ]
}
```

### Explications des Champs :

- **name** : Nom de votre visite (sera affiché en haut de l'application)
- **id** : Numéro unique pour chaque POI (1, 2, 3, etc.)
- **title** : Nom du point d'intérêt
- **location** : Coordonnées GPS au format "LatitudeN/S, LongitudeE/W"
  - Exemples : "50.04525N, 1.32983E" ou "45.123S, 2.456W"
- **comment** : Description du POI (peut être vide : "")
- **image** : `true` si vous avez des photos, `false` sinon
- **video** : `true` si vous avez des vidéos, `false` sinon  
- **audio** : `true` si vous avez de l'audio, `false` sinon
- **details** : Laissez à 0 (non utilisé)

## 🎬 Médias Supportés

### 📸 Images
- **Formats** : JPG, JPEG, PNG, GIF, WebP
- **Nommage** : libre (ex: `photo.jpg`, `vue1.png`, `image-site.jpeg`)

### 🎥 Vidéos  
- **Formats** : MP4, WebM, MOV, AVI
- **Nommage** : libre (ex: `video.mp4`, `presentation.webm`)
- **Recommandation** : MP4 pour meilleure compatibilité

### 🔊 Audio
- **Formats** : MP3, WAV, OGG, M4A
- **Nommage** : libre (ex: `explication.mp3`, `ambiance.wav`)
- **Recommandation** : MP3 pour meilleure compatibilité

## 📍 Comment Obtenir les Coordonnées GPS

### Méthode 1 : Google Maps
1. Ouvrez Google Maps
2. Cliquez droit sur votre point d'intérêt
3. Copiez les coordonnées qui s'affichent
4. Convertissez au format requis : "DDN/S, DDN/S"

### Méthode 2 : Applications GPS
- Utilisez votre smartphone avec une app GPS
- Notez latitude et longitude
- Ajoutez N/S et E/W selon l'hémisphère

### Exemples de Conversion :
- `50.04525, 1.32983` → `50.04525N, 1.32983E`
- `-45.123, -2.456` → `45.123S, 2.456W`

## 🗂️ Étapes de Création

### Étape 1 : Organiser vos Médias
1. Créez un dossier `data` sur votre ordinateur
2. Pour chaque POI, créez un sous-dossier avec son numéro ID
3. Placez les médias correspondants dans chaque sous-dossier

### Étape 2 : Créer le visit.json
1. Ouvrez un éditeur de texte (Bloc-notes, TextEdit, etc.)
2. Copiez l'exemple ci-dessus
3. Modifiez avec vos propres données
4. Sauvegardez sous le nom **exact** `visit.json`

### Étape 3 : Créer le ZIP
1. Sélectionnez votre fichier `visit.json` ET votre dossier `data`
2. Clic droit → "Compresser" ou "Ajouter à l'archive"
3. Choisissez format ZIP
4. Nommez votre archive (ex: `ma-visite.zip`)

## ✅ Vérifications Avant Upload

### Checklist :
- [ ] Le fichier ZIP contient `visit.json` à la racine
- [ ] Le fichier ZIP contient un dossier `data` à la racine  
- [ ] Chaque POI a son dossier dans `data` (ex: `data/1/`, `data/2/`)
- [ ] Les médias sont dans les bons dossiers selon leur POI
- [ ] Les coordonnées GPS sont au bon format
- [ ] Les flags image/video/audio correspondent aux médias présents

### Test Rapide :
1. Ouvrez votre fichier ZIP
2. Vérifiez que vous voyez directement `visit.json` et `data/`
3. Dans `data/`, vérifiez vos dossiers numérotés
4. Chaque dossier doit contenir les médias du POI correspondant

## 🚀 Utilisation de l'Application

1. **Chargement** : Glissez-déposez ou sélectionnez votre fichier ZIP
2. **Patience** : Attendez l'extraction (barre de progression)
3. **Navigation** : La carte s'affiche avec tous vos POI
4. **Interaction** : Cliquez sur les markers ou utilisez la liste des POI

## ❌ Erreurs Communes

### "visit.json non trouvé"
- Le fichier n'est pas à la racine du ZIP
- Le nom n'est pas exact (sensible à la casse)

### "Format de données invalide"
- Erreur de syntaxe JSON (virgule manquante, guillemets, etc.)
- Utilisez un validateur JSON en ligne

### "Médias non chargés"
- Vérifiez que les dossiers dans `data/` correspondent aux ID des POI
- Vérifiez les extensions de fichiers supportées

### Problème de Coordonnées
- Format incorrect (utilisez N/S et E/W)
- Coordonnées invalides (en dehors de -90/+90 et -180/+180)

## 💡 Conseils Pratiques

- **Taille des médias** : Optimisez vos images/vidéos pour le web
- **Noms de fichiers** : Évitez les caractères spéciaux et espaces
- **Organisation** : Gardez une structure claire et logique
- **Sauvegarde** : Conservez vos sources avant compression

---

**Besoin d'aide ?** Suivez exactement cette structure et votre carte fonctionnera parfaitement ! 🎯