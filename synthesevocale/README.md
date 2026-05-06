# 🎙️ Synthèse Vocale PWA

> Progressive Web App de synthèse vocale avec génération et sauvegarde audio

🔗 **Déploiement** : [BernardHoyez.github.io/PWA/synthesevocale](https://BernardHoyez.github.io/PWA/synthesevocale)

## ✨ Fonctionnalités

- ✅ Synthèse vocale via Web Speech API (natif navigateur)
- 🔊 Sélection de voix, vitesse et ton
- ⏯️ Contrôle lecture/pause/stop
- 💾 Sauvegarde audio via MediaRecorder (expérimental)
- 📱 Installation PWA (mobile & desktop)
- 🔄 Fonctionnement hors ligne
- 🎨 Interface responsive & mode sombre

## 🚀 Déploiement sur GitHub Pages

```bash
# 1. Créer le dépôt
git init
git add .
git commit -m "Initial commit - Synthèse Vocale PWA"

# 2. Pousser vers GitHub
git remote add origin https://github.com/BernardHoyez/PWA.git
git checkout -b gh-pages
git push -u origin gh-pages --force

# 3. Activer GitHub Pages
# Settings → Pages → Source: gh-pages branch → Save