# KMZ Converter v2.0

Application Web Progressive (PWA) pour optimiser les traces de randonnée KMZ avec photos.

## Fonctionnalités

### Étape 1 : Traitement automatique
- ✅ Extraction du fichier KMZ
- ✅ Optimisation des photos (1920px max, compression 85%)
- ✅ Détection automatique de la commune via géolocalisation
- ✅ Aperçu des images en miniatures

### Étape 2 : Personnalisation
- ✏️ Renommer chaque waypoint (max 20 caractères)
- 💬 Ajouter un commentaire optionnel (max 60 caractères)
- 📍 Modifier le nom de la commune si besoin

### Étape 3 : Génération des fichiers
1. **KMZ modifié** : Avec noms personnalisés et photos optimisées
2. **KML final** : Avec liens GitHub et boutons "Agrandir l'image"

## Workflow complet

1. **Upload du KMZ** → Extraction et optimisation automatiques
2. **Personnalisation** → Éditer les noms et commentaires
3. **Télécharger KMZ** → Pour upload sur GitHub
4. **Upload sur GitHub** → Dans le dossier `/kmz-photos/{Commune}_{Nom}/`
5. **Télécharger KML** → Version finale avec liens GitHub

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

**Version 2.0** - Février 2026
