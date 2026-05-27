# Mes Randonnées — Cloudflare Pages

Application statique de gestion et consultation des randonnées.

## Structure du projet

```
/
├── index.html            ← application principale (liste + liens)
├── randonnees.json       ← généré automatiquement par build.js
├── build.js              ← script de génération du JSON
├── deploy.sh             ← script build + déploiement en une commande
└── randonnees/
        └── 2026-nom-rando/
                ├── 2026-nom-rando.html   ← viewer
                ├── 2026-nom-rando.kml    ← (optionnel)
                └── photos/
```

## Procédure initiale Cloudflare

### 1. Créer un compte Cloudflare
→ https://dash.cloudflare.com/sign-up (gratuit)

### 2. Installer Node.js (si pas déjà fait)
→ https://nodejs.org (version LTS)

### 3. Installer Wrangler
```bash
npm install -g wrangler
```

### 4. Se connecter à Cloudflare
```bash
npx wrangler login
```
Un navigateur s'ouvre → autoriser l'accès.

### 5. Premier déploiement
```bash
cd /chemin/vers/ce/dossier
chmod +x deploy.sh        # (Linux/Mac uniquement)
./deploy.sh mes-randonnees
```
→ Cloudflare crée automatiquement le projet "mes-randonnees"
→ Une URL est fournie : https://mes-randonnees.pages.dev

## Ajouter une nouvelle randonnée

1. Copier le dossier de rando dans `randonnees/`
2. Lancer le déploiement :
```bash
./deploy.sh mes-randonnees
```
C'est tout.

## Convention de nommage des dossiers

```
AAAA-nom_de_la_rando
```
Exemples :
- `2026-roubier_test_rougiers`
- `2025-mont-ventoux`

Le build.js détecte automatiquement l'année et construit le titre affiché.
