# 🎥 PiloteCam

Application PWA locale permettant de **piloter la caméra d’un smartphone Android** depuis un **PC** via WebRTC, sans cloud externe.

## Installation

1. Installer les dépendances et lancer le serveur :
   ```bash
   npm install ws
   node server.js
   ```

2. Lancer un serveur web local :
   ```bash
   npx serve .
   ```

3. Accéder à :
   - Smartphone : http://<IP_locale>:3000
   - PC : http://<IP_locale>:3000

Les deux doivent être sur le **même réseau Wi-Fi**.

## Utilisation

1. Smartphone → choisir **Caméra** → entrer un code de session.
2. PC → choisir **PC** → entrer le même code.
3. Le flux vidéo s’affiche sur le PC.

Aucune donnée n’est transmise sur Internet.
