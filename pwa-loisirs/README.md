# Loisirs Proches — PWA

Application web progressive listant les festivités et événements locaux,
déployée sur GitHub Pages à l'adresse :
**https://BernardHoyez.github.io/PWA/loisirs**

---

## Structure des fichiers

```
loisirs/
├── index.html        ← Page principale
├── style.css         ← Feuille de styles
├── app.js            ← Logique applicative + appels API
├── sw.js             ← Service Worker (stratégie brise-caches)
├── manifest.json     ← Manifest PWA
├── offline.html      ← Page hors-ligne
├── icons/
│   ├── icon192.png   ← Icône PWA 192×192 (à placer manuellement)
│   └── icon512.png   ← Icône PWA 512×512 (à placer manuellement)
└── README.md
```

---

## Configuration requise

### 1. Clé API OpenAgenda

L'application utilise l'API publique d'OpenAgenda (https://openagenda.com).

1. Créez un compte gratuit sur https://openagenda.com
2. Allez dans **Paramètres → Clés API**
3. Copiez votre clé publique
4. Dans `app.js`, remplacez :
   ```javascript
   OA_KEY: 'VOTRE_CLE_OPENAGENDA',
   ```
   par votre vraie clé.

> La clé publique OpenAgenda est safe à exposer côté client (lecture seule).

### 2. Icônes personnalisées

Placez vos fichiers dans le dossier `icons/` :
- `icon192.png` — 192×192 pixels
- `icon512.png` — 512×512 pixels

---

## Déploiement sur GitHub Pages

### Option A — Dépôt dédié

```bash
git init
git remote add origin https://github.com/BernardHoyez/PWA.git
git checkout -b gh-pages
git add .
git commit -m "init PWA loisirs"
git push -u origin gh-pages
```

Activez GitHub Pages sur la branche `gh-pages` dans les settings du dépôt.
L'URL sera : `https://BernardHoyez.github.io/PWA/loisirs/`

### Option B — Sous-dossier d'un dépôt existant

Copiez le dossier `loisirs/` à la racine de votre dépôt `PWA` :
```
PWA/
└── loisirs/
    ├── index.html
    ├── ...
```

---

## Service Worker — Stratégie "Brise-caches"

Le SW utilise une stratégie **Network-first** :

1. Il tente toujours le réseau en priorité
2. En cas de succès, il met à jour silencieusement le cache
3. En cas d'échec réseau, il sert le cache existant
4. `skipWaiting()` + `clients.claim()` : le nouveau SW s'active
   **immédiatement** sans attendre la fermeture des onglets

Pour forcer une mise à jour, incrémentez `CACHE_VERSION` dans `sw.js` :
```javascript
const CACHE_VERSION = 'loisirs-v2'; // ← changer à chaque déploiement
```

---

## Sources de données

| Source | Type | Couverture |
|--------|------|------------|
| OpenAgenda API v2 | REST JSON gratuite | ~200 000 événements FR |
| Nominatim (OSM) | Reverse geocoding | Monde entier |

---

## Fonctionnalités

- 📍 Géolocalisation automatique avec affichage de la commune
- 🔭 Rayon configurable : 1 à 25 km
- 📅 Horizon configurable : 1 à 15 jours
- 🎟 Filtre par tarif : Tous / Gratuit / Payant
- 📲 Installable comme application native (PWA)
- 📦 Cache offline via Service Worker
- 🌐 Page hors-ligne dédiée
- 🔗 Lien vers la fiche complète sur OpenAgenda

---

## Compatibilité

| Navigateur | Support PWA |
|------------|-------------|
| Chrome / Edge | ✅ Complet |
| Firefox | ✅ SW + offline |
| Safari iOS 16.4+ | ✅ Installable |
| Samsung Internet | ✅ Complet |
