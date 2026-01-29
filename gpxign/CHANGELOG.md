# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.2] - 2026-01-28

### 🐛 Correction critique
- **Filtrage des altitudes invalides** : L'application n'écrit plus les altitudes à zéro
  - Problème : L'API IGN retourne `0` pour les coordonnées hors couverture (mer, étranger, zones non cartographiées)
  - Ancien comportement : Les altitudes à `0` étaient écrites dans le fichier → tracés erronés
  - Nouveau comportement : Les altitudes à `0` ou `null` sont ignorées, l'altitude originale est conservée
  - Impact : Les fichiers GPX restent cohérents même avec des points hors couverture IGN

### ✨ Améliorations
- Ajout de statistiques détaillées dans l'interface :
  - **Points corrigés** : nombre de points avec altitude IGN valide
  - **Points conservés** : nombre de points avec altitude originale (IGN indisponible)
- Message informatif si des points sont conservés
- Logs dans la console pour identifier les points problématiques
- Interface responsive avec grille 4 colonnes sur desktop

### 📚 Documentation
- Nouveau fichier `PROBLEME_ALTITUDE_ZERO.md` expliquant le problème et la solution
- Documentation sur les cas où l'API IGN retourne zéro
- Recommandations pour les utilisateurs

## [1.0.1] - 2026-01-28

### 🐛 Corrections
- **Correction critique** : Le compteur "Points traités" s'affiche maintenant correctement pendant le traitement
  - Problème : Conflit de noms de variables entre l'élément DOM `processedPoints` et la variable locale
  - Solution: Renommage de la variable locale en `pointsToProcess`
  - Impact: Le compteur se met à jour en temps réel (0 → nombre total de points)

### ✨ Ajouts
- Ajout d'un outil de vérification (`verification.html`) pour comparer les fichiers GPX avant/après
  - Affiche les altitudes côte à côte
  - Calcule les statistiques de correction
  - Permet de valider que les corrections ont bien été appliquées

## [1.0.0] - 2026-01-28

### 🎉 Version initiale

#### Fonctionnalités principales
- Interface de téléchargement de fichiers GPX (drag & drop + clic)
- Interrogation de l'API IGN pour chaque point de trace
- Remplacement des altitudes avec les données officielles IGN
- Barre de progression avec pourcentage
- Téléchargement du fichier GPX corrigé
- PWA installable avec Service Worker

#### Design
- Interface moderne et responsive
- Dégradé violet/bleu
- Icônes personnalisées (montagnes + tracé GPS)
- Compatible mobile et desktop

#### Technique
- Vanilla JavaScript (pas de framework)
- API IGN Géoportail
- Service Worker pour cache
- Délai de 100ms entre requêtes API
- Format GPX 1.1 compatible

#### Documentation
- README.md complet
- Guide de déploiement GitHub Pages
- Fichier GPX de test (10 points à Paris)
- Fichier de présentation

---

## Types de modifications

- **✨ Ajouts** : Nouvelles fonctionnalités
- **🐛 Corrections** : Corrections de bugs
- **🔧 Améliorations** : Améliorations de fonctionnalités existantes
- **📚 Documentation** : Modifications de la documentation
- **🎨 Style** : Modifications esthétiques
- **⚡ Performance** : Améliorations de performance
- **♻️ Refactoring** : Refonte du code sans changement de fonctionnalité
