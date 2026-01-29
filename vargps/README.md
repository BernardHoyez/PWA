# VarGPS - Application PWA de Coordonnées GPS

Application Progressive Web App pour afficher les coordonnées GPS sur la carte IGN Scan 25.

## 🌟 Fonctionnalités

- 🗺️ Carte IGN Scan 25 interactive
- 📍 Clic sur la carte pour obtenir les coordonnées
- 📐 Affichage en format sexagésimal (DMS)
- 🌐 Affichage en format degré décimal (DD)
- 📋 Copie des coordonnées en un clic
- 📱 Application installable (PWA)
- 🔌 Fonctionne hors-ligne après installation

## 🚀 Déploiement sur GitHub Pages

### 1. Créer le repository

1. Créez un repository nommé `BernardHoyez.github.io` (si ce n'est pas déjà fait)
2. Créez un dossier `PWA/vargps` à la racine

### 2. Structure des fichiers

```
BernardHoyez.github.io/
└── PWA/
    └── vargps/
        ├── index.html
        ├── manifest.json
        ├── sw.js
        ├── icon192.png
        └── icon512.png
```

### 3. Déployer les fichiers

```bash
# Cloner votre repository
git clone https://github.com/BernardHoyez/BernardHoyez.github.io.git
cd BernardHoyez.github.io

# Créer la structure
mkdir -p PWA/vargps

# Copier les fichiers de l'application
cp /path/to/vargps/* PWA/vargps/

# Commiter et pousser
git add PWA/vargps/
git commit -m "Ajout de l'application VarGPS"
git push origin main
```

### 4. Activer GitHub Pages

1. Allez dans **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **root**
4. Cliquez sur **Save**

### 5. Accéder à l'application

L'application sera accessible à l'URL :
```
https://BernardHoyez.github.io/PWA/vargps/
```

## 📱 Installation PWA

### Sur mobile :
1. Ouvrez l'URL dans votre navigateur
2. Appuyez sur le bouton "Partager" ou menu
3. Sélectionnez "Ajouter à l'écran d'accueil"

### Sur desktop :
1. Ouvrez l'URL dans Chrome/Edge
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. Confirmez l'installation

## 🎯 Utilisation

1. L'application s'ouvre sur la carte IGN centrée sur les coordonnées initiales
2. Cliquez n'importe où sur la carte
3. Les coordonnées s'affichent en bas de l'écran :
   - Format sexagésimal (DMS)
   - Format degré décimal (DD)
4. Cliquez sur "Copier les coordonnées" pour copier les deux formats

## 🛠️ Technologies utilisées

- **Leaflet.js** - Bibliothèque de cartes interactive
- **IGN Géoportail** - Carte Scan 25
- **Service Worker** - Mode hors-ligne
- **Manifest.json** - Configuration PWA

## 📄 License

Libre d'utilisation

## 👤 Auteur

Bernard Hoyez
