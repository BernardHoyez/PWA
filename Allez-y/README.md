# Allez-y

"Allez-y" est une Progressive Web App (PWA) simple conçue pour vous aider à naviguer vers une destination géographique spécifique.

Entrez les coordonnées (latitude et longitude) d'un point de référence (Point A), et l'application affichera votre position actuelle (Point B) sur une carte OpenStreetMap. Elle calcule et affiche en temps réel la distance et l'azimut (la direction par rapport au Nord) entre vous et votre destination.

## Fonctionnalités

-   **Définition de la destination** : Saisissez les coordonnées GPS d'un Point A.
-   **Suivi en temps réel** : Utilise l'API de géolocalisation de votre appareil pour afficher votre position (Point B).
-   **Calculs instantanés** : Affiche la distance en mètres et l'azimut en degrés qui vous séparent du Point A.
-   **Carte interactive** : Visualisez les deux points et la ligne qui les relie sur un fond de carte OpenStreetMap.
-   **Progressive Web App (PWA)** : Installez l'application sur votre écran d'accueil et utilisez-la même avec une connexion limitée grâce au Service Worker.

## Déploiement sur GitHub Pages

Ce projet est prêt à être déployé sur GitHub Pages.

1.  **Poussez le code** : Assurez-vous que tous les fichiers (`index.html`, `index.css`, `index.tsx`, `metadata.json`, `sw.js`, `README.md`) se trouvent dans votre dépôt GitHub.
2.  **Activez GitHub Pages** :
    -   Allez dans les `Settings` (Paramètres) de votre dépôt.
    -   Naviguez vers la section `Pages` dans le menu de gauche.
    -   Sous `Build and deployment`, choisissez de déployer depuis une `Branch` (Branche).
    -   Sélectionnez la branche `main` (ou `master`) et le dossier `/(root)`.
    -   Cliquez sur `Save`.
3.  **Accédez à votre site** : Après quelques minutes, votre application sera disponible à l'adresse `https://<votre-username>.github.io/<nom-du-depot>/`.
