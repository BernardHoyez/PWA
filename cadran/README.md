# 🧭 PWA "Cadran Solaire"

Application web progressive pour construire un **cadran solaire analemmatique** sur le terrain.

## 🚀 Déploiement
Déployée sur GitHub Pages :  
https://BernardHoyez.github.io/PWA/cadran

### Arborescence
```
cadran/
├── index.html
├── app.js
├── style.css
├── manifest.json
├── service-worker.js
├── icon192.png
├── icon512.png
```

## ⚙️ Fonctionnalités principales
- Récupère la position GPS (latitude, longitude)
- Calcule :
  - Le petit axe de l’ellipse selon la latitude
  - La distance entre foyers et la corde nécessaire
  - Les coordonnées des repères horaires (6h à 18h)
- Interface responsive, utilisable sur le terrain
- Fonctionne hors ligne (PWA)

## 🧩 Utilisation
1. Cliquer sur **Obtenir ma position**
2. Entrer la longueur du **grand axe (en mètres)**
3. Cliquer sur **Calculer cadran**
4. Les données de construction s’affichent

## 📱 Installation
Sur mobile : "Ajouter à l’écran d’accueil"  
Compatible Android, iOS, et navigateur desktop.

---
© 2025 - Bernard Hoyez — Application "Cadran"
