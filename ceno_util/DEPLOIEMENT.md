# Déploiement cenoutil — Instructions

## ⚠️ Préserver vos données JSON

Le dossier `data/` contient des données d'exemple.
Si vous avez des données enrichies (observations, fossiles…),
**ne pas écraser** vos fichiers existants sur GitHub.

### Mise à jour partielle (recommandée)

Copier sur GitHub uniquement les fichiers modifiés :
- `index.html`, `sw.js`, `manifest.json`
- `css/style.css`
- `js/*.js`
- `map.mbtiles`

**Ne PAS copier** `data/*.json` si vous avez des données personnalisées.

### Mise à jour complète (première installation)

Copier tout le dossier cenoutil/ sur GitHub Pages.
Puis importer vos fichiers JSON via cenoprepa.

## Structure

```
PWA/cenoutil/
├── map.mbtiles          ← fond IGN (chargé automatiquement)
├── index.html
├── sw.js                ← incrémenter VERSION à chaque déploiement
├── manifest.json
├── css/style.css
├── js/
│   ├── app.js
│   ├── carte.js
│   ├── mbtiles.js       ← schéma TMS corrigé
│   ├── fossiles.js
│   └── infos.js
├── data/
│   ├── markers.json     ← 13 accès (à préserver si modifiés)
│   ├── observations.json← vos observations (à préserver !)
│   ├── fossiles.json    ← votre catalogue (à préserver !)
│   └── pages.json       ← vos pages info (à préserver !)
└── photos/
    ├── observations/
    ├── fossiles/
    └── pages/
```

## Correction v8

- **MBTiles** : schéma TMS corrigé (litto2mbtiles génère en TMS)
- **SW** : version cenoutil-v8 pour forcer le rechargement du cache
