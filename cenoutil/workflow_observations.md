# Workflow — Gestion des fiches d'observation

**cenoprepa → cenoutil**  
*Cénomanien des falaises normandes — Le Havre – Étretat*

---

## Vue d'ensemble

```
Terrain          cenoprepa                    GitHub          cenoutil
  │                  │                           │                │
  ├─ Photo annotée   │                           │                │
  ├─ Coords GPS  ──► │ Saisie fiche              │                │
  ├─ Notes géol.     │ Export ZIP            ──► │ Upload data/   │
                     │                           │           ──► │ Affichage
                     │ ◄── Import JSON ──────────┤                │
                     │     (mise à jour)          │                │
```

---

## Partie 1 — Créer une nouvelle fiche d'observation

### 1.1 Préparer la photo sur le terrain

Avant de saisir dans cenoprepa, la photo doit être prête :

- **Format recommandé** : JPEG
- **Taille recommandée** : 800–1200 px de large, qualité 75–80 %  
  (une photo de 3–5 Mo de l'appareil doit être rééchantillonnée avant import)
- **Nom de fichier** : utiliser un nom explicite sans espaces ni accents  
  Exemple : `obs_bruneval_hg1_nord.jpg`
- **Annotations** : si la photo est annotée (labels de niveaux, traits bleus/verts),  
  l'annotation doit être faite avant l'import dans cenoprepa

> **Outil recommandé pour le rééchantillonnage :** IrfanView (Windows), Preview (Mac),  
> ou tout logiciel réduisant la résolution à 800–1200 px sans perte de lisibilité des annotations.

---

### 1.2 Relever les coordonnées GPS

Deux formats sont acceptés par cenoprepa et cenoutil :

| Format | Exemple | Notes |
|--------|---------|-------|
| **DM** — Degrés-Minutes décimaux | `49°38.86N 0°09.26E` | Format GPS de terrain courant |
| **DD** — Degrés décimaux | `49.6477°N 0.1543°E` | Format Google Maps / SIG |

> **Vérification de la zone :** les coordonnées doivent être dans la plage  
> Lat 49°29'N – 49°42'N · Lng 0°04'E – 0°12'E  
> (entre Le Havre et Étretat).

---

### 1.3 Ouvrir cenoprepa

1. Naviguer vers `https://BernardHoyez.github.io/PWA/cenoprepa/`
2. L'application se charge — le tableau de bord affiche les compteurs actuels
3. Cliquer sur **Observations** dans la sidebar gauche

---

### 1.4 Créer la fiche

1. Cliquer sur le bouton **+ Nouvelle observation** (en-tête, haut droite)
2. Une fiche vierge apparaît dans le formulaire à droite

**Remplir les champs dans l'ordre :**

#### Identification

| Champ | Obligatoire | Contenu |
|-------|:-----------:|---------|
| Nom / titre | ✓ | Description courte et localisante · Ex : `Panneau sud — plage de Saint-Jouin` |
| Coordonnées GPS | ✓ | Saisir en format DM ou DD — le badge **DM ✓** ou **DD ✓** confirme la validité |

> Si le badge affiche **Format ?** en rouge, la syntaxe est incorrecte.  
> Exemples valides : `49°38.86N 0°09.26E` · `49°38.86'N 0°09.26'E` · `49.6477°N 0.1543°E`

#### Données géologiques

| Champ | Contenu |
|-------|---------|
| Niveau stratigraphique | Choisir dans la liste déroulante (Ce1 → Turonien) |
| Fossiles observés | Taper le nom de chaque espèce + **Entrée** ou **virgule** pour créer un chip · Ex : `Mantelliceras saxbii` ↵ `Inoceramus crippsi` ↵ |
| Commentaire | Texte libre : description de la coupe, niveaux visibles, intérêt particulier, conditions d'accès au bloc |

> **Retirer un fossile mal saisi :** cliquer sur le **×** dans le chip correspondant,  
> ou utiliser **Backspace** dans le champ vide pour retirer le dernier chip.

#### Photo de terrain

1. Cliquer sur la zone **Choisir une photo**
2. Sélectionner le fichier JPEG rééchantillonné
3. L'aperçu s'affiche immédiatement sous la zone d'upload
4. Le chemin de destination est affiché : `photos/observations/nom_du_fichier.jpg`

> **Important :** cenoprepa enregistre le **chemin** de la photo dans le JSON,  
> mais ne transfère pas le fichier image vers cenoutil automatiquement.  
> Le fichier devra être copié manuellement (voir §3 ci-dessous).

#### Métadonnées

| Champ | Contenu |
|-------|---------|
| Date | Sélectionner dans le calendrier (format AAAA-MM-JJ en interne) |
| Observateurs | Initiales ou noms · Ex : `B. Hoyez, J. Girard` |

---

### 1.5 Sauvegarder la fiche

Cliquer sur **✓ Sauvegarder**.

- La fiche apparaît dans la liste à gauche
- L'indicateur **● Non exporté** s'affiche en bas de la sidebar
- La fiche est stockée en mémoire dans cenoprepa (pas encore dans cenoutil)

---

## Partie 2 — Modifier une fiche existante

### 2.1 Importer les données actuelles

Si les données de cenoutil n'ont pas été modifiées depuis la dernière session :

1. Aller dans le **Tableau de bord**
2. Cliquer sur **📥 observations.json**
3. Sélectionner le fichier `observations.json` issu du dossier `cenoutil/data/` du dépôt GitHub  
   (téléchargé depuis GitHub ou conservé localement)
4. Le compteur d'observations se met à jour

> cenoprepa peut aussi charger automatiquement les données si les deux dossiers  
> `cenoprepa/` et `cenoutil/` sont déployés côte à côte sur GitHub Pages.

---

### 2.2 Retrouver la fiche

Dans le panneau **Observations** :

- **Recherche texte** : taper dans le champ de recherche (filtre sur le nom, la stratigraphie et le commentaire)
- **Parcourir la liste** : les fiches sont listées avec nom + niveau stratigraphique + coordonnées
- Cliquer sur la fiche → le formulaire se charge à droite

---

### 2.3 Modifier et sauvegarder

- Modifier les champs souhaités
- Cliquer sur **✓ Sauvegarder**

**Cas particuliers :**

| Action | Procédure |
|--------|-----------|
| Changer la photo | Cliquer à nouveau sur **Choisir une photo** — l'ancien fichier n'est pas supprimé du serveur automatiquement |
| Corriger les coordonnées | Effacer et ressaisir — le badge de validation se met à jour en temps réel |
| Ajouter un fossile | Cliquer dans le champ fossiles, taper le nom, appuyer sur Entrée |
| Supprimer la fiche | Bouton **Supprimer** (rouge) → confirmation requise → action irréversible dans la session |

---

## Partie 3 — Exporter vers cenoutil

### 3.1 Exporter le bundle de données

1. Cliquer sur **Exporter** dans la sidebar, ou utiliser le bouton **↓ Tout exporter (ZIP)** du tableau de bord
2. Un fichier `cenoutil_data_AAAA-MM-JJ.zip` est téléchargé
3. L'indicateur passe à **✓ À jour**

Le ZIP contient le dossier `data/` avec les 4 fichiers JSON mis à jour :

```
cenoutil_data_2025-06-15/
└── data/
    ├── markers.json       ← 13 accès falaise
    ├── observations.json  ← fiches d'observation (modifiées)
    ├── fossiles.json      ← catalogue fossiles
    └── pages.json         ← pages d'information
```

---

### 3.2 Copier les fichiers JSON sur GitHub

1. Ouvrir le dépôt GitHub `BernardHoyez/BernardHoyez.github.io`
2. Naviguer vers `PWA/cenoutil/data/`
3. Pour chaque fichier modifié :
   - Cliquer sur le fichier existant → **Edit** (crayon) ou **Upload files**
   - Remplacer par le nouveau fichier
   - **Commit changes** avec un message descriptif :  
     `Ajout observation Bruneval panneau nord (obs042)`

> **Méthode alternative (recommandée si plusieurs fichiers) :**  
> Cloner le dépôt localement → remplacer les fichiers dans `PWA/cenoutil/data/` → `git push`

---

### 3.3 Copier les photos manuellement

Les photos ne sont **pas incluses** dans le bundle ZIP — elles doivent être copiées séparément.

Pour chaque nouvelle observation avec photo :

1. Localiser le fichier image sur l'ordinateur  
   (le chemin est affiché dans cenoprepa : `photos/observations/nom_fichier.jpg`)
2. Le copier dans le dépôt GitHub :  
   `PWA/cenoutil/photos/observations/nom_fichier.jpg`
3. Commit

> **Vérification :** une fois déployé, le chemin complet sera  
> `https://BernardHoyez.github.io/PWA/cenoutil/photos/observations/nom_fichier.jpg`  
> Ce chemin peut être testé directement dans un navigateur.

---

### 3.4 Vérifier dans cenoutil

1. Naviguer vers `https://BernardHoyez.github.io/PWA/cenoutil/`
2. GitHub Pages met généralement 1–3 minutes à propager les modifications
3. **Forcer le rechargement du cache :** sur mobile, désinstaller et réinstaller la PWA ;  
   sur navigateur desktop : `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
4. Aller dans **Carte** → le nouveau marqueur ocre doit apparaître à l'emplacement saisi
5. Taper dessus → **Voir la fiche →** → vérifier photo, champs, coordonnées

---

## Récapitulatif des chemins de fichiers

| Type de contenu | Dossier dans cenoutil | Champ JSON |
|-----------------|----------------------|------------|
| Photos observations | `photos/observations/` | `"photo": "photos/observations/fichier.jpg"` |
| Photos accès falaise | `photos/` | `"photo": "photos/site_nom.jpg"` |
| Photos fossiles | `photos/fossiles/` | `"photo": "photos/fossiles/espece.jpg"` |
| Images pages info | `photos/pages/` | `"image_banniere": "photos/pages/image.jpg"` |

---

## Formats GPS — aide-mémoire

```
Format DM (Degrés-Minutes décimaux) :
  49°38.86N 0°09.26E
  ↑↑ ↑↑ ↑↑    ↑ ↑↑ ↑↑
  │  │  │     │  │  └─ hémisphère E/W
  │  │  │     │  └──── minutes décimales
  │  │  │     └─────── degrés longitude
  │  │  └──────────── hémisphère N/S
  │  └─────────────── minutes décimales (0–59.999)
  └────────────────── degrés latitude

Format DD (Degrés Décimaux) :
  49.6477°N 0.1543°E
```

**Conversion rapide DM → DD :**  
`DD = degrés + (minutes / 60)`  
Exemple : 49°38.86N → 49 + (38.86 / 60) = **49.6477°N**

---

## Points d'attention

> ⚠️ **Taille des photos** : une photo non rééchantillonnée de smartphone (4–8 Mo) ralentit  
> le chargement sur le terrain, même en cache. Viser 100–300 Ko après compression.

> ⚠️ **Noms de fichiers** : éviter les espaces, accents et caractères spéciaux.  
> Utiliser uniquement : lettres, chiffres, tirets `-`, underscores `_`, points `.`

> ⚠️ **Cache du service worker** : cenoutil met les données en cache offline au premier chargement.  
> Après une mise à jour du JSON sur GitHub, le cache ne se renouvelle qu'à la prochaine  
> connexion réseau avec une version de `sw.js` incrémentée (`cenoutil-v3`, `cenoutil-v4`…).  
> Pour forcer la mise à jour : changer le numéro de version dans `sw.js` et le pousser sur GitHub.

> ⚠️ **Coordonnées hors zone** : cenoprepa valide la syntaxe GPS mais pas la cohérence  
> géographique. Vérifier visuellement le placement du marqueur dans cenoutil après déploiement.
