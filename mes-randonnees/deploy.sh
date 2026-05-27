#!/bin/bash
# deploy.sh — Génère randonnees.json puis déploie sur Cloudflare Pages
# Usage : ./deploy.sh [nom-du-projet-cloudflare]

PROJECT=${1:-"mes-randonnees"}

echo "🔨  Génération de randonnees.json..."
node build.js

if [ $? -ne 0 ]; then
  echo "❌  Erreur lors de la génération. Déploiement annulé."
  exit 1
fi

echo ""
echo "🚀  Déploiement sur Cloudflare Pages (projet : $PROJECT)..."
npx wrangler pages deploy . --project-name="$PROJECT"
