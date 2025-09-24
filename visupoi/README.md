# Déploiement de VisuPOI sur GitHub Pages

Suivez ces étapes pour déployer votre application à l'adresse `https://<VotreNom>.github.io/PWA/visupoi/`.

## 1. Structure des Fichiers

La nouvelle approche de déploiement utilise une version "compilée" de l'application. Cela signifie que tout le code source (`.tsx`, `components`, etc.) a été transformé en un unique fichier `bundle.js`. **Vous n'avez plus besoin de pousser les fichiers source sur GitHub.**

Votre dépôt GitHub, qui doit être nommé `PWA`, doit contenir un dossier `visupoi` avec la structure suivante :

```
PWA/
└── visupoi/
    ├── icons/
    │   ├── icon-192.png  (image à fournir par vous)
    │   └── icon-512.png  (image à fournir par vous)
    ├── index.html        (Version simplifiée)
    ├── bundle.js         (Nouveau fichier compilé)
    ├── manifest.json
    ├── service-worker.js (Version simplifiée)
    └── README.md         (Ce fichier)
```

**Note importante :** Les fichiers `App.tsx`, `index.tsx`, `types.ts` et le dossier `components` ne font plus partie des fichiers à déployer.

## 2. Pousser les fichiers sur GitHub

Placez uniquement les fichiers listés ci-dessus dans votre dossier local `visupoi`, puis poussez l'intégralité du dossier `PWA` sur votre dépôt GitHub.

## 3. Configurer GitHub Pages

1.  Allez sur la page principale de votre dépôt `PWA` sur GitHub.
2.  Cliquez sur l'onglet **Settings**.
3.  Dans le menu de gauche, cliquez sur **Pages**.
4.  Dans la section "Build and deployment", sous "Source", sélectionnez **Deploy from a branch**.
5.  Assurez-vous que la branche est `main` (ou `master`) et que le dossier est **`/root`**.
6.  Cliquez sur **Save**.

Le déploiement peut prendre quelques minutes.

## 4. Accéder à votre application

Une fois le déploiement terminé, votre application sera accessible à l'adresse :

`https://<VotreNomUtilisateur>.github.io/PWA/visupoi/`

(N'oubliez pas de remplacer `<VotreNomUtilisateur>` par votre nom d'utilisateur GitHub).
