# FocusBrk PWA

**Contrôleur de focus bracketing pour Xiaomi 14T Pro**  
Déployé sur : `https://BernardHoyez.github.io/PWA/focusbrk/`

---

## Structure du dépôt

Votre dépôt GitHub doit être organisé ainsi :

```
BernardHoyez.github.io/          ← dépôt racine (ou dépôt "PWA" avec Pages)
└── PWA/
    └── focusbrk/
        ├── index.html
        ├── manifest.json
        ├── sw.js
        ├── icon-192.png
        ├── icon-512.png
        └── ANDROID_SETUP.md
```

## Déploiement

### Option A — Dépôt `BernardHoyez.github.io` (User Pages)

```bash
git clone https://github.com/BernardHoyez/BernardHoyez.github.io
cd BernardHoyez.github.io
mkdir -p PWA/focusbrk
# Copier tous les fichiers ici
git add PWA/focusbrk/
git commit -m "feat: add FocusBrk PWA"
git push
```

GitHub Pages publie automatiquement la branche `main`.  
URL : `https://BernardHoyez.github.io/PWA/focusbrk/`

### Option B — Dépôt séparé `PWA`

```bash
git clone https://github.com/BernardHoyez/PWA
cd PWA
mkdir -p focusbrk
# Copier les fichiers dans focusbrk/
git add focusbrk/
git commit -m "feat: add FocusBrk PWA"
git push
```

Activer GitHub Pages : Settings → Pages → Source: `main` branch `/` (root).  
URL : `https://BernardHoyez.github.io/PWA/focusbrk/`

---

## Installation comme PWA

1. Ouvrir `https://BernardHoyez.github.io/PWA/focusbrk/` dans Chrome/Edge sur PC
2. Cliquer l'icône **Installer** dans la barre d'adresse (⊕)
3. L'app s'installe et fonctionne hors-ligne

---

## Utilisation

1. Lancer l'app serveur sur le **Xiaomi 14T Pro** (voir `ANDROID_SETUP.md`)
2. S'assurer que PC et téléphone sont sur le **même réseau Wi-Fi**
3. Entrer l'IP locale du téléphone dans FocusBrk (ex: `ws://192.168.1.42:8765`)
4. Cliquer **Connecter**
5. Régler les paramètres de bracketing
6. Cliquer **Lancer la séquence**

---

## Paramètres disponibles

| Paramètre | Plage | Description |
|-----------|-------|-------------|
| Nombre de clichés | 2–20 | Total de photos dans la séquence |
| Mise au point min. | 0.0–0.9 | Distance focale minimale (0 = macro) |
| Mise au point max. | 0.1–1.0 | Distance focale maximale (1 = infini) |
| Délai entre clichés | 200–5000 ms | Attente entre chaque déclenchement |
| Courbe | linéaire / proche→loin / lointain→proche / centre→bords | Ordre de progression |
| ISO | AUTO / 100–1600 | Sensibilité capteur |

## Protocole WebSocket

```json
// PC → Android
{ "cmd": "capture", "focus": 0.45, "iso": "auto" }
{ "cmd": "ping" }

// Android → PC
{ "status": "ok", "shot": 3 }
{ "status": "error", "msg": "..." }
```

La valeur `focus` va de `0.0` (macro, distance minimale) à `1.0` (infini).
