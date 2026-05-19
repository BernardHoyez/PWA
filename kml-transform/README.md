# KML Transform v1.0

Application Web Progressive (PWA) pour optimiser les traces de randonnée KMZ avec photos.

Déployée sur : https://bernardhoyez.github.io/PWA/kml-transform

## Nouveautés v1.0 (par rapport à KMZ Converter v2.0)

- ✏️ Nom du waypoint : jusqu'à **50 caractères**
- 💬 Commentaire : jusqu'à **500 caractères**
- 🔗 Choix du dépôt GitHub pour les photos (par défaut : `kmz-photos`, ou tout autre dépôt)

## Fonctionnalités

### Étape 1 : Traitement automatique
- ✅ Extraction du fichier KMZ
- ✅ Optimisation des photos (1920px max, compression 85%)
- ✅ Détection automatique de la commune via géolocalisation
- ✅ Aperçu des images en miniatures

### Étape 2 : Personnalisation
- ✏️ Renommer chaque waypoint (max 50 caractères)
- 💬 Ajouter un commentaire optionnel (max 500 caractères)
- 📍 Modifier le nom de la commune si besoin
- 🔗 Choisir le dépôt GitHub pour les photos

### Étape 3 : Génération des fichiers
1. **KMZ modifié** : Avec noms personnalisés et photos optimisées
2. **KML final** : Avec liens GitHub et boutons "Agrandir l'image"

## Workflow complet

1. **Upload du KMZ** → Extraction et optimisation automatiques
2. **Personnalisation** → Éditer les noms et commentaires
3. **Configurer le dépôt** → Par défaut ou dépôt personnalisé
4. **Télécharger KMZ** → Pour upload sur GitHub
5. **Upload sur GitHub** → Dans le dossier choisi
6. **Télécharger KML** → Version finale avec liens GitHub

## Compatibilité

- ✅ OruxMaps v10.6.3 GP
- ✅ Google Earth
- ✅ Tous navigateurs modernes

## Technologies

- HTML5 / CSS3 / Vanilla JavaScript
- JSZip pour manipulation KMZ
- Nominatim API pour géolocalisation
- Canvas API pour optimisation images
- Service Worker pour mode offline

---

**Version 1.0** - Mai 2026
