# GPX IGN - Correction d'altitude

Progressive Web App (PWA) pour corriger les altitudes d'un fichier GPX avec les données altimétriques de l'IGN.

## 🚀 Fonctionnalités

- ✅ Import de fichiers GPX (glisser-déposer ou clic)
- ✅ Interrogation de l'API IGN pour chaque point
- ✅ Remplacement des altitudes avec les données IGN
- ✅ Compteur de progression en temps réel
- ✅ Téléchargement du fichier GPX corrigé
- ✅ Interface responsive et moderne
- ✅ Fonctionne hors ligne (PWA)

## 📦 Déploiement sur GitHub Pages

### 1. Créer le repository

```bash
# Créer un nouveau repository sur GitHub nommé "PWA"
# Puis cloner le repository
git clone https://github.com/BernardHoyez/PWA.git
cd PWA
```

### 2. Copier les fichiers

Copiez tous les fichiers de l'application dans un dossier `gpxign` :

```
PWA/
└── gpxign/
    ├── index.html
    ├── app.js
    ├── sw.js
    ├── manifest.json
    ├── icon192.png
    └── icon512.png
```

### 3. Pousser sur GitHub

```bash
git add .
git commit -m "Ajout de l'application GPX IGN"
git push origin main
```

### 4. Activer GitHub Pages

1. Aller dans **Settings** de votre repository
2. Cliquer sur **Pages** dans le menu de gauche
3. Dans **Source**, sélectionner **main** (ou **master**)
4. Cliquer sur **Save**

L'application sera accessible à : **https://BernardHoyez.github.io/PWA/gpxign/**

## 🔧 Utilisation

1. Ouvrir l'application dans votre navigateur
2. Cliquer ou glisser-déposer un fichier GPX
3. Cliquer sur "Corriger les altitudes"
4. Attendre la fin du traitement (la progression s'affiche)
5. Télécharger le fichier GPX corrigé

### ✅ Vérifier les corrections

Ouvrez le fichier `verification.html` dans votre navigateur pour comparer les altitudes :
- Chargez votre fichier GPX original
- Chargez le fichier GPX corrigé (avec suffixe `_IGN`)
- Consultez les statistiques de correction (nombre de points modifiés, différences moyennes et maximales)

## 🐛 Correction du bug d'affichage

**Problème résolu :** Le compteur "Points traités" restait à 0 pendant le traitement.

**Cause :** Conflit de noms de variables entre l'élément DOM et la variable locale.

**Solution :** Renommage de la variable locale de `processedPoints` en `pointsToProcess`.

Maintenant le compteur s'actualise correctement en temps réel pendant le traitement !

## 📡 API utilisée

L'application utilise l'API d'altimétrie de l'IGN :
```
https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=X&lat=Y
```

## 🎨 Technologies

- HTML5
- CSS3 (design moderne et responsive)
- JavaScript (Vanilla JS)
- Service Worker (PWA)
- API IGN

## 📱 PWA

L'application est une Progressive Web App :
- ✅ Installable sur mobile et desktop
- ✅ Fonctionne hors ligne (sauf requêtes API)
- ✅ Icônes personnalisées
- ✅ Interface native

## 📄 Licence

MIT

## 👤 Auteur

Bernard Hoyez

---

**Version :** 1.0.0  
**Dernière mise à jour :** Janvier 2026
