# 🗻 GPX IGN - Application PWA complète

## 📦 Contenu du package

Votre application PWA GPX IGN est prête ! Voici tous les fichiers inclus :

### Fichiers de l'application
1. **index.html** - Interface utilisateur (HTML5 + CSS3)
2. **app.js** - Logique applicative JavaScript
3. **sw.js** - Service Worker pour le mode hors ligne
4. **manifest.json** - Configuration PWA
5. **icon192.png** - Icône 192x192 pixels
6. **icon512.png** - Icône 512x512 pixels

### Fichiers de documentation
7. **README.md** - Documentation principale
8. **GUIDE_DEPLOIEMENT.md** - Guide détaillé de déploiement
9. **test.gpx** - Fichier GPX de test (10 points à Paris)

## ✨ Fonctionnalités implémentées

✅ **Interface moderne et responsive**
   - Design dégradé violet/bleu
   - Drag & drop de fichiers
   - Animations fluides
   - Compatible mobile et desktop

✅ **Traitement GPX complet**
   - Lecture de fichiers GPX
   - Extraction des points de trace (trkpt)
   - Interrogation de l'API IGN pour chaque point
   - Remplacement des altitudes

✅ **Compteur de progression**
   - Pourcentage en temps réel
   - Barre de progression visuelle
   - Nombre de points traités / total

✅ **PWA fonctionnelle**
   - Installable sur tous les appareils
   - Service Worker pour cache
   - Fonctionne hors ligne (interface)
   - Icônes personnalisées

✅ **Export du fichier**
   - Téléchargement automatique
   - Nom de fichier avec suffixe "_IGN"
   - Format GPX valide

## 🚀 Déploiement rapide

### En 3 étapes :

1. **Créer le repository**
   ```bash
   # Sur GitHub : créer un repo "PWA"
   git clone https://github.com/BernardHoyez/PWA.git
   ```

2. **Copier les fichiers**
   ```bash
   cd PWA
   mkdir gpxign
   # Copier tous les fichiers dans PWA/gpxign/
   ```

3. **Pousser et activer**
   ```bash
   git add .
   git commit -m "GPX IGN app"
   git push origin main
   # Puis : Settings → Pages → Activer
   ```

**URL finale :** https://BernardHoyez.github.io/PWA/gpxign/

## 🧪 Tester l'application

1. Ouvrir l'application dans un navigateur
2. Utiliser le fichier **test.gpx** fourni
3. Cliquer sur "Corriger les altitudes"
4. Observer la progression (10 points à traiter)
5. Télécharger le résultat

## 📡 API IGN utilisée

```
https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=X&lat=Y
```

- Renvoie l'altitude précise pour des coordonnées GPS
- Données de référence française (RGF93)
- Gratuit et sans limite stricte
- Délai de 100ms entre requêtes (recommandé)

## 🎨 Design de l'application

### Palette de couleurs
- Dégradé principal : #667eea → #764ba2 (violet/bleu)
- Bouton traitement : #2563eb (bleu)
- Bouton téléchargement : #10b981 (vert)
- Texte : #1e293b (gris foncé)

### Icônes
- Montagnes stylisées blanches
- Tracé GPS en bleu (#3b82f6)
- Texte "GPX" en gras
- Fond dégradé bleu/violet

## 📱 Compatibilité

- ✅ Chrome (desktop & mobile)
- ✅ Firefox
- ✅ Safari (iOS & macOS)
- ✅ Edge
- ✅ Opera

## 🔒 Sécurité et confidentialité

- ✅ Tout le traitement est local (dans le navigateur)
- ✅ Aucune donnée envoyée à un serveur tiers (sauf API IGN)
- ✅ Pas de stockage de données personnelles
- ✅ HTTPS obligatoire (GitHub Pages)

## 📊 Performance

- Traitement : ~10 points/seconde (avec délai API)
- Fichier de 1000 points : ~2 minutes
- Cache des assets : instantané après première visite
- Poids total : <100 KB

## 🔄 Workflow typique

1. Randonnée → enregistrement GPX avec smartphone/GPS
2. Ouvrir GPX IGN sur ordinateur ou mobile
3. Charger le fichier GPX
4. Lancer la correction (automatique)
5. Télécharger le fichier corrigé
6. Utiliser dans logiciel de cartographie (Garmin, etc.)

## 🎯 Cas d'usage

- **Randonneurs** : corriger les altitudes de traces GPS
- **Cyclistes** : profils altimétriques précis
- **Clubs de randonnée** : standardiser les données
- **Cartographes** : données altimétriques françaises de référence

## 📞 Support

Pour toute question :
- Consulter le **GUIDE_DEPLOIEMENT.md**
- Vérifier la section "Résolution de problèmes"
- Tester avec le fichier **test.gpx**

## 📄 Licence

MIT - Libre d'utilisation et de modification

---

**Version :** 1.0.0  
**Date :** Janvier 2026  
**Auteur :** Bernard Hoyez  
**API :** IGN Géoportail
