# 📘 Guide de déploiement sur GitHub Pages

## Étape 1 : Préparation du repository GitHub

### 1.1 Créer le repository
1. Aller sur https://github.com/BernardHoyez
2. Cliquer sur le bouton **"New"** (nouveau repository)
3. Nommer le repository : **PWA**
4. Cocher **"Public"**
5. Ne pas initialiser avec README (nous allons l'ajouter)
6. Cliquer sur **"Create repository"**

### 1.2 Cloner le repository en local
```bash
git clone https://github.com/BernardHoyez/PWA.git
cd PWA
```

## Étape 2 : Structure des fichiers

Créer la structure suivante dans votre repository :

```
PWA/
└── gpxign/
    ├── index.html          (page principale)
    ├── app.js             (logique applicative)
    ├── sw.js              (service worker)
    ├── manifest.json      (manifest PWA)
    ├── icon192.png        (icône 192x192)
    ├── icon512.png        (icône 512x512)
    └── README.md          (documentation)
```

### Commandes pour créer la structure :
```bash
mkdir -p gpxign
cd gpxign
# Puis copiez tous les fichiers fournis dans ce dossier
```

## Étape 3 : Pousser les fichiers sur GitHub

```bash
# Depuis la racine du repository PWA
git add .
git commit -m "Initial commit - Application GPX IGN"
git push origin main
```

**Note :** Si votre branche par défaut est `master` au lieu de `main`, utilisez :
```bash
git push origin master
```

## Étape 4 : Activer GitHub Pages

1. Aller sur https://github.com/BernardHoyez/PWA
2. Cliquer sur **Settings** (⚙️ en haut à droite)
3. Dans le menu de gauche, cliquer sur **Pages**
4. Dans la section **Source** :
   - Branch : sélectionner **main** (ou **master**)
   - Folder : laisser **/ (root)**
5. Cliquer sur **Save**

⏱️ GitHub Pages prend généralement 1-2 minutes pour déployer.

## Étape 5 : Vérifier le déploiement

L'application sera accessible à l'URL :
```
https://BernardHoyez.github.io/PWA/gpxign/
```

### Vérifications à faire :
- ✅ La page s'affiche correctement
- ✅ Les icônes sont visibles
- ✅ Le drag & drop fonctionne
- ✅ L'application peut être installée (icône PWA dans la barre d'adresse)

## Étape 6 : Installer la PWA

### Sur ordinateur :
1. Ouvrir l'URL dans Chrome, Edge ou Brave
2. Cliquer sur l'icône ➕ dans la barre d'adresse
3. Cliquer sur **"Installer"**

### Sur mobile :
1. Ouvrir l'URL dans Chrome (Android) ou Safari (iOS)
2. Android : Menu → "Ajouter à l'écran d'accueil"
3. iOS : Bouton partage → "Sur l'écran d'accueil"

## 🔄 Mettre à jour l'application

Pour publier une nouvelle version :

```bash
# Modifier les fichiers
# Puis :
git add .
git commit -m "Description des modifications"
git push origin main
```

GitHub Pages se met à jour automatiquement en 1-2 minutes.

## 🐛 Résolution de problèmes

### L'application ne se charge pas
- Vérifier que GitHub Pages est activé
- Vérifier l'URL : doit être `/PWA/gpxign/` (avec les majuscules)
- Attendre 2-3 minutes après le push

### Les icônes ne s'affichent pas
- Vérifier que les fichiers `icon192.png` et `icon512.png` sont bien présents
- Vérifier le chemin dans `manifest.json`

### L'API IGN ne répond pas
- Vérifier la connexion internet
- L'API IGN peut avoir des limitations de taux (100ms entre chaque requête recommandé)

### La PWA ne s'installe pas
- Vérifier que le site est en HTTPS (GitHub Pages l'est automatiquement)
- Vérifier que le fichier `manifest.json` est correct
- Vérifier que le Service Worker est enregistré (console développeur)

## 📊 Test avec un fichier GPX

Pour tester l'application, vous pouvez créer un fichier GPX simple :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <ele>50</ele>
      </trkpt>
      <trkpt lat="48.8576" lon="2.3532">
        <ele>52</ele>
      </trkpt>
      <trkpt lat="48.8586" lon="2.3542">
        <ele>51</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>
```

Enregistrez ce contenu dans un fichier `test.gpx` et testez l'application.

## 🎉 C'est terminé !

Votre application GPX IGN est maintenant déployée et accessible publiquement !

URL finale : **https://BernardHoyez.github.io/PWA/gpxign/**
