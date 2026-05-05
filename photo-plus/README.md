# Photo+ · Focus Stacking PWA

> Application web progressive de focus stacking par carte de netteté Laplacienne

**URL de déploiement :** https://BernardHoyez.github.io/PWA/photo+

---

## Fonctionnalités

| Fonction | Détail |
|---|---|
| **Focus stacking** | Fusion par carte de netteté Laplacienne (pixel-wise best-focus selection) |
| **Alignement automatique** | Corrélation croisée normalisée (translation) |
| **Formats d'entrée** | PNG, JPEG (2 à 20 images) |
| **Formats d'export** | PNG haute qualité, JPEG 97% |
| **Support EXIF** | Lecture Make, Model, DateTime, ExposureTime, FNumber, ISO, FocalLength |
| **Interface drag & drop** | Avec prévisualisation et suppression individuelle |
| **Offline** | Service Worker + cache-first strategy |
| **Installable** | Manifest PWA complet |

---

## Architecture technique

```
photo+/
├── index.html          # App shell (3 étapes : drop → process → résultat)
├── style.css           # Design système (dark, Syne + DM Mono)
├── app.js              # Logique complète (Laplacian, align, stack, EXIF)
├── sw.js               # Service Worker (cache-first PWA)
├── manifest.json       # Manifest PWA
├── icons/
│   ├── icon192.png     # Icône PWA 192×192
│   └── icon512.png     # Icône PWA 512×512
└── .github/
    └── workflows/
        └── deploy.yml  # Déploiement GitHub Pages automatique
```

### Pipeline de traitement

1. **Chargement** — `FileReader` + `URL.createObjectURL`
2. **EXIF** — Parser binaire inline (DataView, APP1 marker, IFD0)
3. **Alignement** — Downscale 1/4 → corrélation croisée normalisée (fenêtre ±32px) → translation sub-pixel
4. **Laplacien** — Kernel 3×3 `[0,-1,0,-1,4,-1,0,-1,0]` sur luminance Y=0.299R+0.587G+0.114B
5. **Lissage** — Blur gaussien σ=2.5 sur la carte de netteté (rayon 5)
6. **Fusion** — Sélection pixel-par-pixel de l'image de netteté maximale
7. **Export** — `canvas.toBlob()` PNG lossless ou JPEG 97%

---

## Déploiement GitHub Pages

### Option A — GitHub Actions (recommandé)

1. Créer le dépôt `PWA` sous le compte `BernardHoyez`
2. Pousser ce dossier `photo+` à la racine (ou dans un sous-dossier `photo+/`)
3. Dans les Settings du dépôt → Pages → Source : **GitHub Actions**
4. Le workflow `.github/workflows/deploy.yml` déploie automatiquement à chaque push sur `main`

### Option B — Branche `gh-pages` manuelle

```bash
git init
git add .
git commit -m "Photo+ initial"
git branch -M main
git remote add origin https://github.com/BernardHoyez/PWA.git
git push -u origin main
```

Puis activer Pages dans Settings → Pages → Branch: `main` / root `/`.

> **Note :** Si l'app est dans un sous-dossier `photo+/`, l'URL sera automatiquement
> `https://bernardhoyez.github.io/PWA/photo+/`

---

## Développement local

```bash
# Serveur statique simple (Python)
python3 -m http.server 8080

# Ou avec Node
npx serve .
```

Ouvrir : http://localhost:8080

---

## Limites connues

- Alignement **translation uniquement** (pas de rotation ni homographie)
- Traitement **CPU/canvas** — pour de très grandes images (>24MP) le traitement peut prendre 10–30s
- Aucune dépendance externe — tout est natif Canvas API + JS

---

*Photo+ · BernardHoyez · MIT License*
