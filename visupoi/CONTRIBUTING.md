# Guide de Contribution

Merci de votre intérêt pour contribuer à **Carte Interactive POI** ! 🎉

## 🚀 Démarrage Rapide

### Prérequis
- Navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Éditeur de code (VS Code recommandé)
- Git installé localement

### Installation Locale
```bash
# Cloner le repository
git clone https://github.com/votre-username/carte-interactive-poi-zip.git
cd carte-interactive-poi-zip

# Ouvrir dans votre navigateur
# Pas de build nécessaire - application purement frontend !
```

### Serveur Local (Optionnel)
Pour éviter les restrictions CORS lors du développement :
```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# VS Code Live Server Extension
# Clic droit sur index.html → "Open with Live Server"
```

## 🛠️ Structure du Projet

```
carte-interactive-poi-zip/
├── index.html              # Page principale
├── css/
│   └── style.css          # Styles (CSS Grid/Flexbox)
├── js/
│   └── main.js            # Logique principale
├── README.md              # Documentation
├── GUIDE-UTILISATION.md   # Guide utilisateur
├── exemple-visit.json     # Fichier d'exemple
├── LICENSE                # Licence MIT
└── .gitignore            # Exclusions Git
```

## 🎯 Types de Contributions

### 🐛 Correction de Bugs
1. Vérifiez qu'une [Issue](../../issues) n'existe pas déjà
2. Si non, créez une nouvelle Issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Capture d'écran si pertinente

### ✨ Nouvelles Fonctionnalités
1. Ouvrez une [Discussion](../../discussions) pour proposer l'idée
2. Attendez les retours de la communauté
3. Créez une Issue détaillée une fois validée

### 📝 Documentation
- Amélioration du README
- Correction de typos
- Traductions (bientôt supportées)
- Exemples supplémentaires

## 🔄 Processus de Pull Request

### 1. Fork & Clone
```bash
# Fork sur GitHub, puis :
git clone https://github.com/VOTRE-USERNAME/carte-interactive-poi-zip.git
cd carte-interactive-poi-zip
git remote add upstream https://github.com/USERNAME-ORIGINAL/carte-interactive-poi-zip.git
```

### 2. Créer une Branche
```bash
# Pour une nouvelle fonctionnalité
git checkout -b feature/nom-de-la-fonctionnalite

# Pour un bug
git checkout -b fix/description-du-bug

# Pour la documentation
git checkout -b doc/amélioration-documentation
```

### 3. Développer
- Respectez le style de code existant
- Testez dans plusieurs navigateurs
- Vérifiez la compatibilité mobile
- Ajoutez des commentaires si nécessaire

### 4. Tester
```bash
# Tests manuels recommandés :
# ✅ Upload d'un fichier ZIP valide
# ✅ Upload d'un fichier invalide (gestion d'erreur)
# ✅ Navigation sur la carte
# ✅ Interaction avec les popups
# ✅ Responsive design (mobile/tablette)
# ✅ Différents formats de médias
```

### 5. Commit & Push
```bash
# Commits atomiques avec messages clairs
git add .
git commit -m "feat: ajout de la fonction de recherche POI"

# Ou pour un bug :
git commit -m "fix: correction du parsing des coordonnées négatives"

# Push vers votre fork
git push origin feature/nom-de-la-fonctionnalite
```

### 6. Créer la Pull Request
- **Titre** clair et descriptif
- **Description** détaillée des changements
- **Captures d'écran** si changements visuels
- **Tests** effectués mentionnés

## 📋 Standards de Code

### JavaScript
- **ES6+** moderne (const/let, arrow functions, async/await)
- **Fonctions nommées** pour la lisibilité
- **Gestion d'erreurs** avec try/catch
- **Commentaires** pour logique complexe

### CSS
- **Variables CSS** (`:root`) pour la cohérence
- **Responsive design** (mobile-first)
- **Classes BEM** pour la maintenabilité
- **Animations** fluides avec `transition`

### HTML
- **Sémantique** correcte (header, main, nav, etc.)
- **Accessibilité** (alt, aria-labels, headings)
- **Performance** (lazy loading si ajouté)

## 🎨 Idées de Fonctionnalités

### Court Terme
- [ ] 🎨 Thèmes de couleurs personnalisables
- [ ] 🔍 Recherche/filtrage des POI
- [ ] 📊 Statistiques de la visite
- [ ] 🌐 Géolocalisation utilisateur

### Moyen Terme  
- [ ] 📱 Mode hors-ligne (Service Worker)
- [ ] 🗂️ Gestion de plusieurs visites
- [ ] 📈 Analytics des interactions
- [ ] 🔗 Partage social des POI

### Long Terme
- [ ] 🌍 Support multilingue
- [ ] 🗄️ Base de données intégrée
- [ ] 🤖 IA pour suggestions de POI
- [ ] 🎮 Mode gamification

## 🧪 Tests Suggérés

### Navigateurs
- [x] Chrome/Chromium (>= 90)
- [x] Firefox (>= 88)  
- [x] Safari (>= 14)
- [x] Edge (>= 90)

### Appareils
- [x] Desktop (1920x1080, 1366x768)
- [x] Tablette (768x1024, paysage/portrait)
- [x] Mobile (375x667, 414x896)

### Formats de Fichiers
- [x] Images : JPG, PNG, GIF, WebP
- [x] Vidéos : MP4, WebM, MOV
- [x] Audio : MP3, WAV, OGG

## 📞 Contact & Support

- 💬 **Discussions** : Questions générales, idées
- 🐛 **Issues** : Bugs, problèmes techniques  
- 📧 **Email** : votre-email@exemple.com
- 🐦 **Twitter** : @VotreCompte (optionnel)

## 🙏 Remerciements

Merci à tous les contributeurs qui rendent ce projet possible :
- Auteurs des bibliothèques utilisées (Leaflet, JSZip)
- Communauté OpenStreetMap pour les données cartographiques
- Tous les utilisateurs qui testent et remontent des bugs

---

**Ensemble, créons la meilleure application de visualisation POI !** 🚀