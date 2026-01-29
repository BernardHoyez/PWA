#!/bin/bash
# Script pour tester l'application localement

echo "🚀 Démarrage du serveur de test VarGPS..."
echo ""
echo "📍 L'application sera accessible à : http://localhost:8000"
echo ""
echo "Pour installer la PWA en local :"
echo "  1. Ouvrez http://localhost:8000 dans Chrome/Edge"
echo "  2. Cliquez sur l'icône d'installation dans la barre d'adresse"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
