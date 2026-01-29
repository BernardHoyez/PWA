# 🏗️ Architecture VarGPS

## 📁 Structure du Projet

```
vargps/
│
├── 🌐 FICHIERS ESSENTIELS (5 fichiers - nécessaires pour PWA)
│   ├── index.html          (8.4 KB)  ← Page principale
│   ├── manifest.json       (662 B)   ← Configuration PWA
│   ├── sw.js              (2.0 KB)  ← Service Worker
│   ├── icon192.png        (1.9 KB)  ← Icône petite
│   └── icon512.png        (5.2 KB)  ← Icône grande
│
├── 📚 DOCUMENTATION (5 fichiers)
│   ├── README.md                    ← Documentation générale
│   ├── DEPLOIEMENT.md              ← Guide détaillé
│   ├── DEMARRAGE-RAPIDE.md         ← Guide express
│   ├── RESUME.md                   ← Récapitulatif complet
│   └── CHECKLIST.txt               ← Liste de vérification
│
└── 🛠️ OUTILS (3 fichiers)
    ├── presentation.html           ← Page de présentation
    ├── test-local.sh              ← Script de test
    └── verifier.sh                ← Script de vérification
```

## 🔄 Flux de l'Application

```
Utilisateur
    │
    ↓
┌───────────────────┐
│   index.html      │ ← Page d'accueil
│   (8.4 KB)        │
└────────┬──────────┘
         │
         ├─→ Charge Leaflet.js (carte interactive)
         │
         ├─→ Charge IGN Scan 25 (tuiles de carte)
         │
         ├─→ Enregistre Service Worker (sw.js)
         │
         └─→ Lit manifest.json (config PWA)
                  │
                  ↓
         ┌────────────────────┐
         │  Service Worker    │
         │      (sw.js)       │ ← Cache pour hors-ligne
         └────────────────────┘
```

## 🎯 Composants Principaux

### 1. index.html
```
┌─────────────────────────────────────┐
│           CARTE IGN                 │
│         (Plein écran)               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Message initial (haut)     │   │
│  └─────────────────────────────┘   │
│                                     │
│           [Clic ici]                │
│              ↓                      │
│           📍 Marqueur               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Coordonnées (bas)          │   │
│  │  • Format DMS               │   │
│  │  • Format DD                │   │
│  │  [📋 Copier]                │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2. manifest.json
```json
{
  "name": "VarGPS",
  "icons": [192, 512],
  "display": "standalone",
  "start_url": "/PWA/vargps/"
}
```

### 3. Service Worker (sw.js)
```
Cache:
  ├── index.html
  ├── manifest.json
  ├── icônes
  └── Leaflet.js

Mode hors-ligne ✅
```

## 🎨 Design des Icônes

```
┌─────────────────────────┐
│     Fond bleu #2196F3   │
│                         │
│    ╔═══════════╗        │
│    ║     |     ║        │
│    ║  ───●───  ║        │
│    ║     |     ║        │
│    ╚═══════════╝        │
│                         │
│  • Croix de visée       │
│  • Point central rouge  │
│  • Points cardinaux     │
└─────────────────────────┘
```

## 📊 Flux de Données

```
Clic sur carte
     ↓
Récupération coordonnées
     ↓
┌────────────────┐
│ Latitude: 43.xx │
│ Longitude: 6.xx │
└────────┬───────┘
         │
         ├──→ Conversion DMS
         │    (43° 28' 43.60" N)
         │
         └──→ Format DD
              (43.478778)
                   ↓
         Affichage à l'utilisateur
                   ↓
         Copie dans presse-papiers
```

## 🔐 Sécurité & Performance

### HTTPS
```
GitHub Pages → Certificat SSL automatique ✅
PWA nécessite HTTPS ✅
Service Worker nécessite HTTPS ✅
```

### Cache
```
Première visite:
  ├── Télécharge tout
  └── Met en cache

Visites suivantes:
  ├── Charge depuis cache (rapide!)
  └── Fonctionne hors-ligne ✅
```

### Performance
```
Chargement initial: < 2 secondes
Taille totale: ~25 KB (sans tuiles)
Mode hors-ligne: Oui
Compatible: Tous navigateurs modernes
```

## 🌍 Déploiement

```
Développement local          GitHub Repository
        │                           │
        ├─→ test-local.sh          │
        │   (Test)                  │
        │                           │
        └─→ verifier.sh             │
            (Vérification)          │
                │                   │
                └──────────────────→│
                     Upload         │
                                    ↓
                            GitHub Pages
                                    │
                                    ↓
                    https://BernardHoyez.github.io
                           /PWA/vargps/
                                    │
                                    ↓
                            Utilisateurs 🎉
```

## 🚀 Installation PWA

```
Navigateur Web
     │
     ├──→ Chrome/Edge: Icône ⊕
     ├──→ Safari: Partager →
     └──→ Firefox: Menu
               ↓
     Installation PWA
               ↓
     Icône sur bureau/écran d'accueil
               ↓
     Lance comme app native
```

## 📱 Compatibilité

```
✅ Chrome Desktop      (Windows/Mac/Linux)
✅ Edge Desktop        (Windows/Mac/Linux)
✅ Firefox Desktop     (Windows/Mac/Linux)
✅ Safari Desktop      (Mac)
✅ Chrome Mobile       (Android)
✅ Samsung Internet    (Android)
✅ Safari Mobile       (iOS 11.3+)
✅ Firefox Mobile      (Android)
```

## 🎯 Points Clés

1. **Carte IGN** : Tuiles officielles Scan 25
2. **Coordonnées** : 2 formats (DMS + DD)
3. **PWA** : Installable + hors-ligne
4. **Responsive** : Mobile et desktop
5. **Léger** : Seulement 25 KB
6. **Rapide** : Cache intelligent
7. **Sécurisé** : HTTPS automatique

---

**Version** : 1.0.0  
**Auteur** : Bernard Hoyez  
**Date** : Janvier 2026
