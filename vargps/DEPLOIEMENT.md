# 📘 Guide de Déploiement VarGPS sur GitHub Pages

## ✅ Prérequis

- Compte GitHub
- Git installé sur votre ordinateur
- Les fichiers de l'application VarGPS

## 🚀 Étapes de Déploiement

### Étape 1 : Créer ou accéder au repository

#### Si le repository n'existe pas encore :

1. Allez sur https://github.com
2. Cliquez sur le bouton **"New"** (ou "+") pour créer un nouveau repository
3. Nommez-le exactement : `BernardHoyez.github.io`
4. Cochez **"Public"**
5. Cliquez sur **"Create repository"**

#### Si le repository existe déjà :

1. Allez sur https://github.com/BernardHoyez/BernardHoyez.github.io

### Étape 2 : Cloner le repository localement

Ouvrez un terminal et exécutez :

```bash
git clone https://github.com/BernardHoyez/BernardHoyez.github.io.git
cd BernardHoyez.github.io
```

### Étape 3 : Créer la structure de dossiers

```bash
mkdir -p PWA/vargps
```

### Étape 4 : Copier les fichiers

Copiez tous les fichiers de l'application dans le dossier `PWA/vargps/` :

```bash
cp /chemin/vers/vargps/* PWA/vargps/
```

Ou manuellement, copiez ces fichiers :
- `index.html`
- `manifest.json`
- `sw.js`
- `icon192.png`
- `icon512.png`
- `README.md`
- `.gitignore`

### Étape 5 : Vérifier les fichiers

```bash
ls -la PWA/vargps/
```

Vous devriez voir :
```
.gitignore
README.md
icon192.png
icon512.png
index.html
manifest.json
sw.js
```

### Étape 6 : Commiter et pousser

```bash
git add PWA/vargps/
git commit -m "Ajout de l'application VarGPS PWA"
git push origin main
```

Note : Si votre branche principale s'appelle `master`, remplacez `main` par `master`.

### Étape 7 : Activer GitHub Pages

1. Allez sur votre repository : https://github.com/BernardHoyez/BernardHoyez.github.io
2. Cliquez sur **"Settings"** (⚙️)
3. Dans le menu de gauche, cliquez sur **"Pages"**
4. Sous **"Source"**, sélectionnez :
   - Branch : `main` (ou `master`)
   - Folder : `/ (root)`
5. Cliquez sur **"Save"**

### Étape 8 : Attendre le déploiement

GitHub Pages va maintenant déployer votre site. Cela peut prendre 1-5 minutes.

Vous verrez un message vert : 
> ✅ Your site is published at https://bernardhoyez.github.io/

### Étape 9 : Accéder à l'application

Votre application est maintenant accessible à :

```
https://BernardHoyez.github.io/PWA/vargps/
```

## 📱 Installation de la PWA

### Sur Android :

1. Ouvrez l'URL dans Chrome
2. Appuyez sur les trois points (⋮) en haut à droite
3. Sélectionnez **"Ajouter à l'écran d'accueil"**
4. Confirmez

### Sur iOS :

1. Ouvrez l'URL dans Safari
2. Appuyez sur le bouton Partager (□↑)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Confirmez

### Sur Windows/Mac :

1. Ouvrez l'URL dans Chrome ou Edge
2. Cliquez sur l'icône **"Installer"** (⊕) dans la barre d'adresse
3. Confirmez l'installation

## 🔧 Mise à jour de l'application

Pour mettre à jour l'application après modifications :

```bash
cd BernardHoyez.github.io
# Modifiez les fichiers nécessaires dans PWA/vargps/
git add PWA/vargps/
git commit -m "Mise à jour de VarGPS"
git push origin main
```

Attendez 1-2 minutes, puis rafraîchissez votre navigateur (Ctrl+F5).

## 🐛 Résolution des problèmes

### L'application ne se charge pas

1. Vérifiez que GitHub Pages est bien activé
2. Assurez-vous que l'URL est exacte : `/PWA/vargps/` (majuscules importantes)
3. Videz le cache du navigateur (Ctrl+Shift+Del)

### La carte ne s'affiche pas

1. Vérifiez votre connexion internet
2. Ouvrez la console développeur (F12) pour voir les erreurs
3. Assurez-vous que Leaflet.js se charge correctement

### Le service worker ne fonctionne pas

1. Le service worker ne fonctionne qu'en HTTPS (ou localhost)
2. GitHub Pages utilise automatiquement HTTPS ✅
3. Vérifiez dans Chrome DevTools → Application → Service Workers

## 📞 Support

Pour toute question :
- Consultez la documentation GitHub Pages : https://docs.github.com/pages
- Vérifiez les Issues du projet

## ✨ Fonctionnalités

✅ Carte IGN Scan 25 interactive  
✅ Affichage des coordonnées au clic  
✅ Format sexagésimal (DMS)  
✅ Format degré décimal (DD)  
✅ Copie dans le presse-papiers  
✅ Installation PWA  
✅ Mode hors-ligne  

Bon déploiement ! 🚀
