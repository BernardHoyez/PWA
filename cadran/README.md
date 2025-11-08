# 🧭 PWA "Cadran Solaire" — Version complète

Cette version ajoute la partie *Détermination et traçage de l'axe Nord–Sud* : calcul et suivi du **midi solaire vrai** (passage au méridien) en utilisant :
- la longitude fournie par le GPS,
- l'équation du temps (approx. NOAA),
- le fuseau horaire et l'heure d'été via l'heure locale du smartphone.

## Déploiement GitHub Pages
Dépose le dossier `cadran` dans le dépôt `BernardHoyez.github.io/PWA/` et publie. L'URL cible :
`https://BernardHoyez.github.io/PWA/cadran`

## Utilisation (sur le terrain)
1. Ouvre la PWA sur ton smartphone.
2. "Obtenir ma position" — autorise le GPS.
3. "Calculer midi solaire" — l'application affiche l'heure locale exacte du passage au méridien (midi solaire vrai), l'équation du temps et le méridien du fuseau horaire.
4. Clique sur "Démarrer le suivi du midi solaire" : le téléphone vibrera / affichera une notification lorsque tu seras ±10 secondes du midi solaire (si supporté).
5. Au moment du midi solaire : marque l'extrémité de l'ombre du piquet et trace la ligne passant par la base du piquet et la marque — ceci est l'axe Nord–Sud. La perpendiculaire est l'axe Est–Ouest.
6. Utilise ensuite la section Cadran analemmatique pour tracer l'ellipse et placer les heures.

## Remarques techniques
- L'équation du temps est une approximation analytique suffisante pour des tracés de terrain (précision minutes).
- Le calcul prend en compte l'heure d'été via `Date.getTimezoneOffset()` du navigateur.
- Le suivi déclenche une notification et une vibration; les notifications nécessitent l'autorisation de l'utilisateur.

## Fichiers
- index.html, style.css, app.js, manifest.json, service-worker.js, README.md
- icon192.png, icon512.png (à ajouter manuellement à la racine)

© 2025 — Bernard Hoyez
