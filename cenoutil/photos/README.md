# Dossier photos — cenoutil

## Structure

```
photos/
├── README.md
├── pages/                    ← Images pour les pages d'information
│   ├── falaise_panorama.jpg
│   ├── carte_affleurements.jpg
│   ├── sentier_acces.jpg
│   ├── log_stratigraphique.jpg
│   ├── log_ce1_ce2_ce3.jpg
│   └── planche_fossiles.jpg
├── fossiles/                 ← Photos des espèces (une par espèce)
│   ├── mantelliceras_saxbii.jpg
│   ├── mantelliceras_mantelli.jpg
│   ├── acanthoceras_rhotomagense.jpg
│   ├── turrilites_costatus.jpg
│   ├── inoceramus_crippsi.jpg
│   ├── cyclothyris_formosa.jpg
│   ├── discoides_subuculus.jpg
│   └── ... (voir fossiles.json pour la liste complète)
├── site_antifer.jpg          ← Photos des 13 sites d'accès
├── site_bruneval.jpg
├── site_saintjouin.jpg
├── site_cauville.jpg
├── site_otan.jpg
├── site_laheve.jpg
└── ... (voir markers.json pour la liste complète)
```

## Format recommandé

- **Format** : JPEG
- **Photos de sites** : 800×600 px max, qualité 75–80 %
- **Photos de fossiles** : 1000×800 px max, fond sombre si possible, qualité 80 %
- **Photos de pages** : 1200×400 px max (format panoramique), qualité 75 %

## Note

Les photos absentes sont gérées silencieusement par l'application
(balise `onerror` sur les `<img>`). L'app fonctionne sans photos.
