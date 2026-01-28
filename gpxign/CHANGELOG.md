# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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
