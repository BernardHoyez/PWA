
# Déploiement de VisuPOI sur GitHub Pages

Suivez ces étapes pour déployer votre application à l'adresse `https://<VotreNom>.github.io/PWA/visupoi/`.

## 1. Structure des Fichiers

Votre dépôt GitHub, qui doit être nommé `PWA`, doit contenir un unique dossier `visupoi` à sa racine. L'organisation des fichiers à l'intérieur du dossier `visupoi` doit être la suivante :

```
PWA/
└── visupoi/
    ├── components/
    │   ├── FileUpload.tsx
    │   └── MapDisplay.tsx
    ├── icons/
    │   ├── icon-192.png  (image à fournir par vous)
    │   └── icon-512.png  (image à fournir par vous)
    ├── App.tsx
    ├── index.html
    ├── index.tsx
    ├── manifest.json
    ├── metadata.json
    ├── README.md
    ├── service-worker.js
    └── types.ts
```

**Note importante :** Les fichiers `manifest.json` et `service-worker.js` sont maintenant à la racine du dossier `visupoi`, et non plus dans un dossier `public`.

## 2. Pousser les fichiers sur GitHub

Placez tous les fichiers listés ci-dessus dans votre dossier local `visupoi`, puis poussez l'intégralité du dossier `PWA` sur votre dépôt GitHub.

## 3. Configurer GitHub Pages

1.  Allez sur la page principale de votre dépôt `PWA` sur GitHub.
2.  Cliquez sur l'onglet **Settings**.
3.  Dans le menu de gauche, cliquez sur **Pages**.
4.  Dans la section "Build and deployment", sous "Source", sélectionnez **Deploy from a branch**.
5.  Dans la section "Branch", assurez-vous que la branche sélectionnée est `main` (ou `master`) et que le dossier est bien **`/root`**.
6.  Cliquez sur **Save**.

GitHub va maintenant construire et déployer votre site. Cela peut prendre quelques minutes.

## 4. Accéder à votre application

Une fois le déploiement terminé, votre application sera accessible à l'adresse :

`https://<VotreNomUtilisateur>.github.io/PWA/visupoi/`

(N'oubliez pas de remplacer `<VotreNomUtilisateur>` par votre propre nom d'utilisateur GitHub).
