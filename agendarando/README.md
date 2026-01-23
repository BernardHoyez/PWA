# AgendaRando - Application PWA

Application web progressive pour afficher un calendrier interactif des randonnées du club.

## Fonctionnalités

✅ Importation de fichier Excel (.xlsx, .xls)
✅ Affichage calendrier avec jours de randonnée en rouge
✅ Détails de chaque randonnée au clic
✅ Navigation entre les mois
✅ Installation sur mobile et desktop
✅ Fonctionne hors ligne après première visite
✅ Design responsive

## Installation locale pour tests

1. Cloner ou télécharger les fichiers
2. Ouvrir `index.html` dans un navigateur moderne
3. Uploader un fichier Excel avec au minimum une colonne "Date"

## Déploiement sur GitHub Pages

1. Créer un dépôt `BernardHoyez.github.io` (si pas existant)
2. Créer la structure : `PWA/agendarando/`
3. Copier tous les fichiers dans ce dossier
4. Activer GitHub Pages dans Settings > Pages
5. Accéder à : `https://bernardhoyez.github.io/PWA/agendarando/`

## Format du fichier Excel

Le fichier Excel doit contenir :
- **Une colonne "Date"** (obligatoire) au format date Excel
- D'autres colonnes selon vos besoins (Destination, Lieu de départ, Heure, Distance, etc.)

Exemple de colonnes :
- Date
- Destination
- Lieu de départ
- Heure
- Distance
- Dénivelé
- Difficulté
- Organisateur
- Remarques

## Création des icônes

### Recommandations
- **icon-192.png** : 192x192 pixels
- **icon-512.png** : 512x512 pixels
- Fond : rouge #ef4444
- Logo : montagne ou randonneur en blanc
- Format : PNG avec transparence

### Outils en ligne gratuits
- Canva : https://www.canva.com/
- Figma : https://www.figma.com/
- GIMP : https://www.gimp.org/

## Installation de l'application

### Sur mobile (Android/iOS)
1. Ouvrir l'URL dans le navigateur
2. Menu du navigateur > "Ajouter à l'écran d'accueil"
3. L'icône apparaît sur l'écran d'accueil

### Sur desktop (Chrome/Edge)
1. Ouvrir l'URL
2. Cliquer sur l'icône d'installation (➕) dans la barre d'adresse
3. Confirmer l'installation

## Technologies utilisées

- HTML5
- CSS3 (Grid, Flexbox)
- JavaScript (Vanilla)
- SheetJS (lecture Excel)
- Service Worker (mode hors ligne)
- Web App Manifest (PWA)

## Support navigateurs

✅ Chrome/Edge (recommandé)
✅ Firefox
✅ Safari
✅ Opera

## Licence

Libre d'utilisation et de modification

## Auteur

Créé pour le club de randonnée