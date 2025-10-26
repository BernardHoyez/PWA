# ControlCam 📸

Application PWA (Progressive Web App) permettant de contrôler la caméra de votre smartphone Android depuis votre PC via une connexion réseau.

## 🌟 Fonctionnalités

### Mode Caméra (Smartphone)
- 📹 Flux vidéo en direct
- 🎯 ID unique pour connexion sécurisée
- 🔗 Partage facile de l'URL de connexion
- 📱 Réception des commandes à distance en temps réel
- ⚡ Support du flash/torche
- 📐 Grille de composition
- 🎥 Mode enregistrement

### Mode Contrôleur (PC)
- 🖥️ Aperçu du flux vidéo en direct
- 📸 Capture de photos à distance
- 🔄 Basculement caméra avant/arrière
- ⚡ Contrôle du flash
- 📐 Activation de la grille
- 🎥 Démarrage d'enregistrement
- 📥 Téléchargement des photos capturées
- 🖼️ Galerie des photos prises

## 🚀 Installation

### Déploiement sur GitHub Pages

1. **Créez la structure du dossier dans votre dépôt GitHub :**
   ```
   BernardHoyez/
   └── PWA/
       └── controlcam/
           ├── index.html
           ├── app.js
           ├── sw.js
           ├── manifest.json
           ├── icon-192.png
           ├── icon-512.png
           └── README.md
   ```

2. **Activez GitHub Pages :**
   - Allez dans Settings > Pages
   - Source : Deploy from a branch
   - Branch : main (ou master) / root
   - Sauvegardez et attendez le déploiement

3. **Accédez à l'application :**
   ```
   https://bernardhoyez.github.io/PWA/controlcam/
   ```

### Installation sur mobile (PWA)

1. Ouvrez l'URL de l'application dans Chrome/Safari
2. Cliquez sur le menu (⋮) puis "Ajouter à l'écran d'accueil"
3. L'application sera installée comme une app native

## 📱 Utilisation

### Configuration initiale

**Sur le smartphone Android :**
1. Ouvrez l'application ControlCam
2. Choisissez "Mode Caméra"
3. Autorisez l'accès à la caméra
4. Notez l'**ID affiché** (ex: A3B7C9D2)
5. OU cliquez sur "Copier URL" pour partager le lien complet

**Sur le PC :**
1. Ouvrez l'application ControlCam
2. Choisissez "Mode Contrôleur"
3. Entrez l'ID du smartphone
4. OU collez l'URL complète dans votre navigateur

### Contrôles disponibles

| Bouton | Action |
|--------|--------|
| 📸 Capturer | Prendre une photo |
| 🔄 Basculer | Changer de caméra (avant/arrière) |
| ⚡ Flash | Activer/désactiver le flash |
| 📐 Grille | Afficher la grille de composition |
| 🎥 Enreg. | Démarrer/arrêter l'enregistrement |

## 🛠️ Technologies utilisées

- **React 18** - Framework UI
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icônes
- **MediaDevices API** - Accès caméra
- **Canvas API** - Capture d'images
- **Service Worker** - Fonctionnement hors ligne
- **Web Storage API** - Communication entre appareils

## 📋 Prérequis

- Navigateur moderne supportant les PWA (Chrome, Edge, Safari)
- HTTPS obligatoire (fourni par GitHub Pages)
- Autorisation d'accès à la caméra
- Connexion Internet pour la synchronisation

## 🔒 Sécurité et confidentialité

- ✅ Aucune donnée n'est envoyée à un serveur externe
- ✅ Les flux vidéo restent entre vos appareils
- ✅ ID de connexion unique généré aléatoirement
- ✅ Les photos sont stockées localement
- ⚠️ Le stockage partagé utilise le système de Claude (environnement de démo)

**Note importante :** Pour une utilisation en production avec plusieurs utilisateurs, vous devriez implémenter un backend avec WebRTC ou WebSocket pour une communication peer-to-peer sécurisée.

## 🎨 Personnalisation des icônes

Les icônes doivent être placées à la racine du projet :

- **icon-192.png** : 192x192 pixels
- **icon-512.png** : 512x512 pixels

Format recommandé : PNG avec fond opaque ou transparent selon vos préférences.

### Générer vos icônes

Vous pouvez utiliser des outils en ligne comme :
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Photoshop, GIMP, ou Figma pour créer des icônes personnalisées

## 📂 Structure du projet

```
controlcam/
├── index.html          # Page principale
├── app.js              # Application React
├── sw.js               # Service Worker (cache & offline)
├── manifest.json       # Manifeste PWA
├── icon-192.png        # Icône 192x192
├── icon-512.png        # Icône 512x512
└── README.md           # Documentation
```

## 🐛 Résolution des problèmes

### La caméra ne fonctionne pas
- Vérifiez que vous avez autorisé l'accès à la caméra
- Assurez-vous que l'URL est en HTTPS
- Essayez de recharger la page
- Vérifiez qu'aucune autre application n'utilise la caméra

### Le contrôleur ne reçoit pas le flux
- Vérifiez que les deux appareils sont connectés
- Attendez quelques secondes pour la synchronisation
- L'ID doit être exact (sensible à la casse)
- Rafraîchissez la page du contrôleur

### L'application ne s'installe pas
- Vérifiez que vous utilisez HTTPS
- Chrome Android : Menu > "Installer l'application"
- Safari iOS : Partager > "Sur l'écran d'accueil"

### Le flash ne fonctionne pas
- Le flash n'est supporté que sur la caméra arrière
- Certains appareils ne supportent pas le contrôle du flash via navigateur
- Essayez de basculer vers la caméra arrière

## 🚀 Améliorations futures

- [ ] Support de l'enregistrement vidéo réel
- [ ] Filtres et effets en temps réel
- [ ] Mode rafale (plusieurs photos)
- [ ] Minuteur de prise de vue
- [ ] Zoom numérique
- [ ] Historique des sessions
- [ ] Partage direct sur les réseaux sociaux
- [ ] Mode portrait avec flou d'arrière-plan
- [ ] Support multi-caméra simultané

## 📄 Licence

MIT License - Utilisez librement ce projet pour vos besoins personnels ou commerciaux.

## 👤 Auteur

Bernard Hoyez

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer de nouvelles fonctionnalités
- Soumettre des pull requests
- Améliorer la documentation

## 📞 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation
- Vérifiez les problèmes connus

---

⭐ Si vous aimez ce projet, n'oubliez pas de lui donner une étoile sur GitHub !