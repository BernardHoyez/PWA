# villes2csv — PWA

Application web progressive de gestion de villes géolocalisées en CSV.

## Fonctionnalités

- **Chargement CSV** — importe un fichier `.csv` au format `nom,initiale,latitude,longitude,affichage_nominatim`
- **Recherche Nominatim** — saisir un nom de ville lance une recherche OpenStreetMap ; si plusieurs résultats, un sélecteur s'affiche
- **Carte interactive** — affichage sur OpenStreetMap ou IGN Plan V2 (Géoplateforme) avec marqueurs colorés et étiquettes permanentes
- **Validation / Invalidation** — chaque ville peut être validée ✓, invalidée ✗ ou supprimée
- **Sauvegarde CSV** — télécharge le nouveau fichier (villes validées seulement)
- **PWA installable** — fonctionne hors-ligne (assets statiques mis en cache)

## Structure des fichiers

```
villes2csv/
├── index.html          Application principale
├── app.js              Logique JavaScript
├── sw.js               Service Worker (cache / offline)
├── manifest.json       Manifeste PWA
├── villes_exemple.csv  Exemple de fichier CSV
├── icons/
│   ├── icon192.png     Icône PWA 192×192 (placeholder)
│   └── icon512.png     Icône PWA 512×512 (placeholder)
└── .nojekyll           Désactive Jekyll sur GitHub Pages
```

## Déploiement GitHub Pages

1. Dans le dépôt `BernardHoyez.github.io`, placer le dossier sous `PWA/villes2csv/`
2. Activer GitHub Pages sur la branche `main` (racine `/`)
3. L'application sera disponible à :
   `https://BernardHoyez.github.io/PWA/villes2csv/`

> **Note :** le `start_url` et le `scope` dans `manifest.json` sont déjà configurés pour ce chemin.

## Remplacement des icônes placeholder

Remplacer `icons/icon192.png` et `icons/icon512.png` par vos propres icônes (fond sombre recommandé pour correspondre au thème `#0d1b2a`).

## Format CSV attendu

```csv
nom,initiale,latitude,longitude,affichage_nominatim
Le Havre,"L",49.493898,0.107973,"Le Havre, Seine-Maritime, Normandie, France"
```

- `nom` — nom de la ville
- `initiale` — première lettre significative (entre guillemets)
- `latitude` / `longitude` — coordonnées décimales WGS84
- `affichage_nominatim` — libellé complet retourné par Nominatim (entre guillemets)

## Couleurs des marqueurs

| Couleur | Signification |
|---------|--------------|
| 🟢 Vert cyan | Ville nouvellement ajoutée (en attente) |
| 🟢 Vert vif  | Ville validée |
| 🔴 Rouge     | Ville invalidée |
| 🔵 Bleu-gris | Statut inconnu |
