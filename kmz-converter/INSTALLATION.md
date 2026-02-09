# 📦 Installation de KMZ Converter PWA

## 🚀 Installation rapide

### 1. Décompressez l'archive
```bash
unzip kmz-converter-pwa.zip
```

### 2. Uploadez sur GitHub Pages

#### Via Git :
```bash
cd votre-repo
mkdir -p PWA
cp -r kmz-converter PWA/
git add PWA/kmz-converter/
git commit -m "Ajout KMZ Converter PWA"
git push
```

#### Via l'interface web GitHub :
1. Allez sur votre repo `bernardhoyez.github.io`
2. Créez le dossier `PWA/kmz-converter/`
3. Uploadez tous les fichiers :
   - index.html
   - style.css
   - app.js
   - manifest.json
   - sw.js
   - README.md

### 3. Accédez à votre PWA

Visitez : `https://bernardhoyez.github.io/PWA/kmz-converter/`

## 📱 Installation sur mobile/desktop

### Sur Chrome/Edge :
1. Visitez l'URL de la PWA
2. Cliquez sur l'icône d'installation dans la barre d'adresse (➕)
3. Ou Menu > "Installer KMZ Converter"

### Sur Safari (iOS) :
1. Visitez l'URL
2. Appuyez sur le bouton de partage
3. "Sur l'écran d'accueil"

### Sur Firefox :
1. Visitez l'URL
2. Menu > "Installer"

## 🔧 Fichiers inclus

```
kmz-converter/
├── index.html         # Interface principale
├── style.css          # Styles responsive
├── app.js             # Logique JavaScript
├── manifest.json      # Configuration PWA
├── sw.js              # Service Worker (offline)
└── README.md          # Documentation complète
```

## ✨ Fonctionnalités

- ✅ Mode offline après première visite
- ✅ Extraction automatique des photos KMZ
- ✅ Optimisation à 1920px max
- ✅ Génération KML avec liens GitHub
- ✅ Interface responsive (mobile/tablet/desktop)
- ✅ Icônes personnalisées
- ✅ Cache intelligent

## 🐛 Résolution de problèmes

### Le chargement du KMZ échoue au premier essai
- **Normal** : Le navigateur met parfois du temps à charger JSZip
- **Solution** : Réessayez simplement, ça devrait fonctionner
- Le Service Worker améliore cela après la première visite

### La PWA ne s'installe pas
- Vérifiez que vous utilisez **HTTPS** (GitHub Pages le fait automatiquement)
- Le navigateur doit supporter les PWA (Chrome, Edge, Safari récents)
- Vérifiez que le Service Worker est bien enregistré (DevTools > Application)

### Le mode offline ne fonctionne pas
1. Visitez la PWA au moins une fois en ligne
2. Ouvrez DevTools > Application > Service Workers
3. Vérifiez que le SW est "activé"
4. Rechargez la page

### Les photos ne s'affichent pas dans le KML
- Uploadez d'abord le dossier de photos sur GitHub
- Attendez 1-2 minutes que GitHub Pages se mette à jour
- Vérifiez l'URL de base dans la configuration

## 📊 Performance

- **Taille de l'app** : ~21 KB (compressée)
- **Première visite** : ~100-200 KB téléchargés
- **Visites suivantes** : Quasi-instantané (cache)
- **Mode offline** : Fonctionne complètement

## 🔄 Mise à jour

Pour mettre à jour la PWA :

1. Modifiez la version dans `sw.js` :
   ```javascript
   const CACHE_NAME = 'kmz-converter-v1.2'; // Incrémentez
   ```

2. Uploadez les fichiers modifiés sur GitHub

3. Les utilisateurs obtiendront automatiquement la mise à jour lors de leur prochaine visite

## 💡 Conseils d'utilisation

1. **Bookmarkez** l'URL pour un accès rapide
2. **Installez** la PWA pour une expérience app native
3. **Partagez** simplement l'URL avec d'autres randonneurs
4. **Organisez** vos traces par dossiers sur GitHub

## 📞 Support

Pour toute question ou problème :
- Consultez le README.md complet
- Vérifiez la console du navigateur (F12) pour les erreurs
- GitHub Issues du projet

---

**Créé pour Bernard Hoyez**
Repository : `bernardhoyez.github.io`
