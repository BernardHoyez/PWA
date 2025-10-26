# Guide de déploiement ControlCam sur GitHub Pages

## 📦 Fichiers à créer

Vous devez créer les fichiers suivants dans votre dépôt GitHub :

```
BernardHoyez/
└── PWA/
    └── controlcam/
        ├── index.html
        ├── app.js
        ├── sw.js
        ├── manifest.json
        ├── icon-192.png        (à fournir)
        ├── icon-512.png        (à fournir)
        ├── README.md
        ├── .gitignore
        └── DEPLOYMENT.md       (ce fichier)
```

## 🎯 Étapes de déploiement

### 1. Créer le dépôt (si nécessaire)

```bash
# Si le dépôt n'existe pas encore
git init
git remote add origin https://github.com/BernardHoyez/PWA.git
```

### 2. Créer la structure des dossiers

```bash
mkdir -p PWA/controlcam
cd PWA/controlcam
```

### 3. Ajouter les fichiers

Copiez tous les fichiers fournis dans le dossier `PWA/controlcam/` :
- `index.html`
- `app.js`
- `sw.js`
- `manifest.json`
- `README.md`
- `.gitignore`

### 4. Ajouter les icônes

Placez vos fichiers d'icônes à la racine du projet :
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

**Conseil :** Si vous n'avez pas encore d'icônes, vous pouvez :
- Créer des icônes temporaires avec un fond de couleur
- Utiliser un générateur en ligne comme [Favicon.io](https://favicon.io/)
- Créer des icônes avec Photoshop/GIMP/Figma

### 5. Commiter et pousser

```bash
git add .
git commit -m "feat: ajout de ControlCam PWA"
git push origin main
```

### 6. Activer GitHub Pages

1. Allez sur votre dépôt GitHub : `https://github.com/BernardHoyez/PWA`
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Pages**
4. Dans "Source" :
   - Sélectionnez **Deploy from a branch**
   - Branch : **main** (ou **master**)
   - Folder : **/ (root)**
5. Cliquez sur **Save**
6. Attendez quelques minutes (2-5 minutes généralement)

### 7. Vérifier le déploiement

Votre application sera accessible à :
```
https://bernardhoyez.github.io/PWA/controlcam/
```

GitHub affichera l'URL exacte dans la section Pages après le déploiement.

## 🔧 Configuration additionnelle

### Forcer HTTPS (recommandé)

GitHub Pages force automatiquement HTTPS, mais vous pouvez vérifier :
1. Settings > Pages
2. Cochez "Enforce HTTPS" si disponible

### Domaine personnalisé (optionnel)

Si vous avez un domaine personnalisé :
1. Settings > Pages
2. Dans "Custom domain", entrez votre domaine
3. Configurez les DNS chez votre registrar :
   ```
   Type: CNAME
   Host: controlcam (ou www)
   Value: bernardhoyez.github.io
   ```

## 🧪 Tests après déploiement

### Test sur PC
1. Ouvrez `https://bernardhoyez.github.io/PWA/controlcam/`
2. Choisissez "Mode Contrôleur"
3. Vérifiez que l'interface s'affiche correctement

### Test sur smartphone
1. Ouvrez l'URL sur Chrome Android
2. Choisissez "Mode Caméra"
3. Autorisez l'accès à la caméra
4. Vérifiez que la caméra fonctionne
5. Testez l'installation PWA : Menu > "Installer l'application"

### Test de connexion
1. Lancez "Mode Caméra" sur le smartphone
2. Notez l'ID affiché
3. Lancez "Mode Contrôleur" sur le PC
4. Entrez l'ID du smartphone
5. Vérifiez que le flux vidéo s'affiche
6. Testez les commandes (capture, flash, etc.)

## 🐛 Dépannage

### L'application ne se charge pas
- Vérifiez que GitHub Pages est activé
- Attendez quelques minutes après l'activation
- Videz le cache du navigateur (Ctrl+Shift+R)
- Vérifiez l'URL (sensible à la casse)

### Erreur 404
- Vérifiez la structure des dossiers
- Les chemins dans `manifest.json` doivent correspondre
- Le fichier `index.html` doit être à la racine de `controlcam/`

### Service Worker ne fonctionne pas
- HTTPS est obligatoire (GitHub Pages le fournit)
- Ouvrez la console (F12) pour voir les erreurs
- Vérifiez que `sw.js` est accessible
- Les chemins dans `sw.js` doivent correspondre à votre structure

### Les icônes ne s'affichent pas
- Vérifiez que les fichiers PNG existent
- Les noms doivent être exacts : `icon-192.png` et `icon-512.png`
- Vérifiez les dimensions (192x192 et 512x512)
- Videz le cache et réinstallez l'application

## 🔄 Mise à jour de l'application

Pour mettre à jour l'application après modification :

```bash
# 1. Modifiez vos fichiers
# 2. Commitez les changements
git add .
git commit -m "update: description des modifications"
git push origin main

# 3. Attendez le redéploiement (automatique, 1-2 minutes)
# 4. Videz le cache du navigateur pour voir les changements
```

### Forcer la mise à jour du cache

Si les modifications ne s'affichent pas :
1. Modifiez `CACHE_NAME` dans `sw.js` (ex: `'controlcam-v2'`)
2. Les utilisateurs obtiendront automatiquement la nouvelle version

## 📊 Monitoring

### Vérifier les déploiements
- Actions tab sur GitHub pour voir l'historique
- Settings > Pages pour voir le statut actuel

### Analytics (optionnel)
Ajoutez Google Analytics dans `index.html` si vous voulez suivre l'utilisation :
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
```

## 🎉 Félicitations !

Votre application ControlCam est maintenant déployée et accessible publiquement. Partagez l'URL avec vos utilisateurs !

**URL finale :** `https://bernardhoyez.github.io/PWA/controlcam/`

---

Pour toute question, consultez la [documentation GitHub Pages](https://docs.github.com/en/pages).