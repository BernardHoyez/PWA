# 🚀 pc2phone - Transfert de Fichiers Sans Fil

Une Progressive Web App (PWA) moderne pour transférer des fichiers sans fil entre PC et smartphone via WebRTC.

## 🌐 Démo en ligne

**[https://BernardHoyez.github.io/PWA/pc2phone](https://BernardHoyez.github.io/PWA/pc2phone)**

## ✨ Fonctionnalités

- 📱 **Transfert P2P** - Connexion directe entre appareils via WebRTC
- 🔒 **Sécurisé** - Aucune donnée ne transite par un serveur tiers
- ⚡ **Rapide** - Transfert de fichiers en temps réel
- 📊 **Suivi en direct** - Barres de progression pour chaque transfert
- 💾 **Multi-fichiers** - Envoyez plusieurs fichiers simultanément
- 📱 **Responsive** - Fonctionne sur PC, tablette et smartphone
- 🔌 **Hors ligne** - Fonctionne sans connexion internet après installation

## 🎯 Comment utiliser

### Étape 1 : Créer la connexion
1. Ouvrez l'application sur l'appareil 1
2. Cliquez sur **"Créer une connexion"**
3. Copiez le code généré

### Étape 2 : Établir la liaison
1. Envoyez le code à l'appareil 2 (par email, SMS, WhatsApp, etc.)
2. Sur l'appareil 2, collez le code et cliquez **"Répondre"**
3. Copiez la réponse générée

### Étape 3 : Finaliser
1. Retournez sur l'appareil 1
2. Collez la réponse reçue
3. Cliquez sur **"Se connecter"**

### Étape 4 : Transférer
✅ Vous êtes connectés ! Sélectionnez des fichiers et transférez-les instantanément.

## 🛠️ Technologies

- **WebRTC** - Communication peer-to-peer
- **React 18** - Interface utilisateur
- **Tailwind CSS** - Styling moderne
- **Service Worker** - Fonctionnement hors ligne
- **Lucide Icons** - Icônes élégantes

## 📦 Installation locale
```bash
# Cloner le repository
git clone https://github.com/BernardHoyez/PWA.git

# Aller dans le dossier
cd PWA/pc2phone

# Ouvrir avec un serveur local (par exemple avec Python)
python -m http.server 8000

# Ou avec Node.js
npx serve
```

Ensuite, ouvrez votre navigateur à `http://localhost:8000`

## 📱 Installer comme application

### Sur Android/iOS :
1. Ouvrez l'application dans votre navigateur
2. Appuyez sur le menu (⋮) 
3. Sélectionnez **"Ajouter à l'écran d'accueil"** ou **"Installer l'application"**

### Sur PC (Chrome/Edge) :
1. Cliquez sur l'icône d'installation dans la barre d'adresse
2. Ou Menu > **"Installer pc2phone..."**

## 🔧 Déploiement sur GitHub Pages

1. **Créer la structure** dans votre repository GitHub :