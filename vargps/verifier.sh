#!/bin/bash
# Script de vérification pré-déploiement VarGPS

echo "🔍 Vérification de l'application VarGPS..."
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
errors=0
warnings=0

# Vérification des fichiers essentiels
echo "📁 Vérification des fichiers..."

files=("index.html" "manifest.json" "sw.js" "icon192.png" "icon512.png")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file manquant!"
        ((errors++))
    fi
done

echo ""

# Vérification de la taille des icônes
echo "🖼️  Vérification des icônes..."

if [ -f "icon192.png" ]; then
    size=$(identify -format "%wx%h" icon192.png 2>/dev/null)
    if [ "$size" = "192x192" ]; then
        echo -e "${GREEN}✓${NC} icon192.png : 192x192 pixels"
    else
        echo -e "${YELLOW}⚠${NC} icon192.png : $size (devrait être 192x192)"
        ((warnings++))
    fi
fi

if [ -f "icon512.png" ]; then
    size=$(identify -format "%wx%h" icon512.png 2>/dev/null)
    if [ "$size" = "512x512" ]; then
        echo -e "${GREEN}✓${NC} icon512.png : 512x512 pixels"
    else
        echo -e "${YELLOW}⚠${NC} icon512.png : $size (devrait être 512x512)"
        ((warnings++))
    fi
fi

echo ""

# Vérification de la syntaxe JSON
echo "🔧 Vérification de la syntaxe..."

if command -v python3 &> /dev/null; then
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} manifest.json : syntaxe valide"
    else
        echo -e "${RED}✗${NC} manifest.json : erreur de syntaxe!"
        ((errors++))
    fi
fi

echo ""

# Vérification des coordonnées dans index.html
echo "📍 Vérification des coordonnées..."

if grep -q "43.478778" index.html && grep -q "6.18326" index.html; then
    echo -e "${GREEN}✓${NC} Coordonnées du point A présentes (43.478778, 6.18326)"
else
    echo -e "${YELLOW}⚠${NC} Coordonnées du point A introuvables"
    ((warnings++))
fi

echo ""

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ Tout est prêt pour le déploiement !${NC}"
    echo ""
    echo "Prochaines étapes :"
    echo "1. Créez/Accédez à votre repository GitHub"
    echo "2. Copiez les fichiers dans PWA/vargps/"
    echo "3. Activez GitHub Pages"
    echo "4. Accédez à https://BernardHoyez.github.io/PWA/vargps/"
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $warnings avertissement(s) détecté(s)${NC}"
    echo "Vous pouvez déployer, mais vérifiez les avertissements ci-dessus."
else
    echo -e "${RED}❌ $errors erreur(s) détectée(s)${NC}"
    echo "Corrigez les erreurs avant de déployer."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $errors
