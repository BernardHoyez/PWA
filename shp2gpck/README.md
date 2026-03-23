# shp2gpck — Déploiement GitHub Pages

## Structure des fichiers

```
shp2gpck/
├── index.html       ← Application PWA principale
├── manifest.json    ← Manifeste PWA
├── sw.js            ← Service Worker (cache hors-ligne)
├── icon192.png      ← Icône PWA 192×192 (placeholder SVG renommé)
├── icon512.png      ← Icône PWA 512×512 (placeholder SVG renommé)
└── README.md        ← Ce fichier
```

## Déploiement sur GitHub Pages

1. **Créer / utiliser le dépôt** `BernardHoyez/PWA`
2. Copier le dossier `shp2gpck/` dans le dépôt, sous `PWA/shp2gpck/`
3. Activer GitHub Pages sur la branche `main` (ou `gh-pages`), dossier racine `/`
4. L'application sera accessible à :
   `https://BernardHoyez.github.io/PWA/shp2gpck/`

> **Important** : si le dépôt est un *project site* (et non un *user/org site*), vérifier que le champ `start_url` et `scope` dans `manifest.json` correspondent bien au chemin `/PWA/shp2gpck/`.

## Icônes

Les fichiers `icon192.png` et `icon512.png` sont des **placeholders SVG** renommés en `.png`.  
Pour la production, les remplacer par de vrais PNG aux dimensions correspondantes.  
Outil suggéré : [realfavicongenerator.net](https://realfavicongenerator.net) ou Inkscape (export PNG depuis le SVG).

## Fonctionnement technique

| Étape | Technologie |
|-------|-------------|
| Lecture ZIP | [JSZip 3.10](https://stuk.github.io/jszip/) via CDN Cloudflare |
| Parser SHP/DBF/PRJ | Code natif embarqué (pas de dépendance externe) |
| Encodage WKB | Pur JavaScript (ArrayBuffer / DataView) |
| GeoPackage (SQLite) | [sql.js 1.10](https://sql-js.github.io/sql.js/) via CDN Cloudflare |
| Mode hors-ligne | Service Worker (cache stratégie cache-first + CDN network-first) |

## Champs de notation supportés (détection auto)

Par ordre de priorité : `NOTATION`, `CODE`, `SYMBOL`, `SYMBOLE`, `LEGENDE`, `LEGEND`, `CODE_GEOL`, `CODEGEOL`, puis premier champ texte.

## Limitations connues

- Les géométries MultiPolygon (anneaux intérieurs complexes) sont gérées via les `parts` du SHP standard.
- Les fichiers `.cpg` (encodage DBF) ne sont pas lus : l'encodage ISO-8859-1 (Latin-1) est supposé (standard BRGM).
- Les très gros fichiers (> 500 Mo) peuvent saturer la mémoire du navigateur selon les appareils.
