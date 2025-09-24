#!/bin/bash

# Script de déploiement pour GitHub Pages
# Usage: ./deploy-github-pages.sh [votre-username]

USERNAME=${1:-"MonNom"}
REPO_URL="https://github.com/$USERNAME/$USERNAME.github.io.git"
APP_NAME="carte-interactive-poi"

echo "🚀 Déploiement GitHub Pages pour $USERNAME"
echo "📦 Application: $APP_NAME"
echo "🔗 Repository: $REPO_URL"
echo ""

# Vérifier si le dossier existe
if [ -d "$USERNAME.github.io" ]; then
    echo "📂 Mise à jour du repository existant..."
    cd "$USERNAME.github.io"
    git pull origin main
else
    echo "📥 Clonage du repository..."
    git clone "$REPO_URL"
    cd "$USERNAME.github.io"
fi

# Créer la structure PWA si nécessaire
echo "📁 Création de la structure PWA..."
mkdir -p PWA/$APP_NAME

# Copier les fichiers de l'application
echo "📋 Copie des fichiers de l'application..."

# Fichiers principaux
cp ../index.html PWA/$APP_NAME/
cp ../manifest.json PWA/$APP_NAME/
cp ../service-worker.js PWA/$APP_NAME/
cp ../browserconfig.xml PWA/$APP_NAME/

# Dossiers
cp -r ../css PWA/$APP_NAME/
cp -r ../js PWA/$APP_NAME/
cp -r ../icons PWA/$APP_NAME/
cp -r ../.github PWA/$APP_NAME/

# Documentation
cp ../README.md PWA/$APP_NAME/
cp ../GUIDE-UTILISATION.md PWA/$APP_NAME/
cp ../INSTALLATION-PWA.md PWA/$APP_NAME/
cp ../CONTRIBUTING.md PWA/$APP_NAME/
cp ../LICENSE PWA/$APP_NAME/

# Fichiers d'exemple
cp ../exemple-visit.json PWA/$APP_NAME/
cp ../generate-icons.html PWA/$APP_NAME/

# Créer page d'accueil si elle n'existe pas
if [ ! -f "index.html" ]; then
    echo "🏠 Création de la page d'accueil..."
    cp ../index-racine.html index.html
    # Remplacer MonNom par le vrai nom d'utilisateur
    sed -i "s/MonNom/$USERNAME/g" index.html
fi

# Créer README principal si il n'existe pas
if [ ! -f "README.md" ]; then
    echo "📝 Création du README principal..."
    cp ../README-github-pages.md README.md
    # Remplacer MonNom par le vrai nom d'utilisateur
    sed -i "s/MonNom/$USERNAME/g" README.md
fi

# Commit et push
echo "💾 Commit des changements..."
git add .
git commit -m "🚀 Deploy PWA Carte Interactive POI - $(date '+%Y-%m-%d %H:%M:%S')"

echo "📤 Push vers GitHub..."
git push origin main

echo ""
echo "✅ Déploiement terminé !"
echo "🌐 Votre application sera disponible à :"
echo "   https://$USERNAME.github.io/PWA/$APP_NAME/"
echo ""
echo "⏰ Attendez 1-2 minutes pour que GitHub Pages traite les changements."
echo "📱 N'oubliez pas de tester l'installation PWA !"

# Ouvrir dans le navigateur (optionnel)
read -p "🔗 Ouvrir dans le navigateur ? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open "https://$USERNAME.github.io/PWA/$APP_NAME/"
    elif command -v open > /dev/null; then
        open "https://$USERNAME.github.io/PWA/$APP_NAME/"
    else
        echo "Ouvrez manuellement: https://$USERNAME.github.io/PWA/$APP_NAME/"
    fi
fi