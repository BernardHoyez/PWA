# 🥾 Applications PWA pour l'A.R.L.

> **Association Randonnée Loisirs** - Applications web progressives pour gérer et afficher les randonnées

## 📱 Applications

### 1. **ARL** - Liste des randonnées
**URL :** https://BernardHoyez.github.io/PWA/ARL

Application web progressive affichant la liste de toutes les randonnées de l'Association Randonnée Loisirs avec accès direct aux cartes interactives.

**Fonctionnalités :**
- 📋 Liste visuelle des randonnées
- 🗺️ Accès direct aux cartes (nouvel onglet)
- 🎨 Design moderne et responsive
- 📱 Compatible mobile et desktop

---

### 2. **editARL** - Éditeur de randonnées
**URL :** https://BernardHoyez.github.io/PWA/editARL

Application PWA pour gérer facilement la liste des randonnées d'ARL. Interface intuitive pour ajouter, modifier et supprimer des randonnées.

**Fonctionnalités :**
- ➕ Ajouter de nouvelles randonnées
- ✏️ Modifier les randonnées existantes
- 🗑️ Supprimer des randonnées
- 📥 Import automatique depuis ARL
- 💾 Sauvegarde locale automatique
- 📤 Export du fichier HTML pour ARL
- 📱 Installable comme application
- 🔌 Fonctionne hors-ligne

---

## 🚀 Architecture

```
PWA/
├── ARL/
│   ├── index.html           # Liste des randonnées
│   ├── rouelles.html        # Carte de la randonnée Rouelles
│   ├── saint-jouin.html     # Carte de la randonnée Saint-Jouin
│   └── [autres-traces].html # Autres cartes de randonnées
│
├── editARL/
│   ├── index.html           # Application éditeur (tout-en-un)
│   ├── icon-192.png         # Icône PWA 192x192
│   └── icon-512.png         # Icône PWA 512x512
│
└── traceC/
    └── index.html           # Application de création de tracés
```

---

## 📖 Workflow : Ajouter une nouvelle randonnée

### Étape 1 : Créer le tracé
1. Ouvrez **traceC** : https://BernardHoyez.github.io/PWA/traceC
2. Créez/importez votre tracé de randonnée
3. L'application génère un fichier : `trace-Saint-Jouin-Bruneval-12.30km-2025-12-05.html`

### Étape 2 : Renommer le fichier
Simplifiez le nom pour plus de clarté :
```
trace-Saint-Jouin-Bruneval-12.30km-2025-12-05.html
        ↓
saint-jouin.html
```

### Étape 3 : Utiliser editARL
1. Ouvrez **editARL** : https://BernardHoyez.github.io/PWA/editARL
2. **Premier lancement ?** Cliquez sur "📥 Importer depuis ARL"
3. Ajoutez la nouvelle randonnée :
   - **Nom :** `Saint-Jouin-Bruneval`
   - **Fichier :** `saint-jouin` (sans .html)
4. Cliquez sur "➕ Ajouter"
5. Cliquez sur "📥 Télécharger index.html"

### Étape 4 : Déployer sur GitHub
Dans votre dépôt GitHub `PWA/ARL/` :
1. **Remplacez** le fichier `index.html` par le nouveau
2. **Ajoutez** le fichier `saint-jouin.html`
3. Commit et push

✅ **C'est terminé !** Votre nouvelle randonnée apparaît sur ARL

---

## 🛠️ Technologies utilisées

### ARL
- HTML5 / CSS3
- Design responsive
- Gradient backgrounds

### editARL
- React 18 (via CDN)
- Tailwind CSS (via CDN)
- LocalStorage API (sauvegarde automatique)
- Service Worker (mode hors-ligne)
- Manifest (PWA installable)
- Fetch API (import depuis ARL)

---

## 💡 Fonctionnalités techniques

### editARL - Sauvegarde automatique
Les données sont sauvegardées localement dans le navigateur :
```javascript
localStorage.setItem('editarl-randonnees', JSON.stringify(randonnees));
```
Vos randonnées persistent même après fermeture du navigateur.

### editARL - Import automatique
L'application récupère automatiquement les randonnées existantes :
```javascript
fetch('https://BernardHoyez.github.io/PWA/ARL/index.html')
```
Parse le HTML et extrait les noms et fichiers des randonnées.

### editARL - Export HTML
Génère un fichier `index.html` simple et propre pour ARL :
- CSS inline pour performance
- Pas de dépendances externes
- Compatible tous navigateurs
- Optimisé SEO

### Service Worker intégré
Le Service Worker est intégré via Blob pour simplifier le déploiement :
```javascript
const blob = new Blob([swCode], { type: 'application/javascript' });
const swUrl = URL.createObjectURL(blob);
navigator.serviceWorker.register(swUrl);
```

---

## 📱 Installation comme PWA

### Sur mobile (Android/iOS)
1. Ouvrez editARL dans votre navigateur
2. Menu → "Ajouter à l'écran d'accueil"
3. L'application s'installe comme une app native

### Sur desktop (Chrome/Edge)
1. Ouvrez editARL
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. Confirmez l'installation

---

## 🔧 Maintenance

### Modifier une randonnée existante
1. Ouvrez editARL
2. Cliquez sur l'icône ✏️ à côté de la randonnée
3. Modifiez les informations
4. Cliquez sur "Modifier"
5. Téléchargez le nouveau `index.html`
6. Remplacez sur GitHub

### Supprimer une randonnée
1. Ouvrez editARL
2. Cliquez sur l'icône 🗑️ à côté de la randonnée
3. Confirmez la suppression
4. Téléchargez le nouveau `index.html`
5. Remplacez sur GitHub
6. Supprimez aussi le fichier `.html` de la randonnée sur GitHub

### Réinitialiser editARL
Si vous voulez repartir de zéro :
1. Cliquez sur le bouton 🗑️ en haut à droite
2. Confirmez la suppression totale
3. Cliquez sur "📥 Importer depuis ARL" pour recharger

---

## 🎨 Personnalisation

### Modifier les couleurs d'ARL
Dans `ARL/index.html`, section `<style>` :
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Changez les couleurs hexadécimales */
```

### Modifier les couleurs d'editARL
Dans `editARL/index.html`, balise `<meta name="theme-color">` :
```html
<meta name="theme-color" content="#7c3aed">
```

---

## 🐛 Dépannage

### L'import ne fonctionne pas dans editARL
**Cause :** Problème CORS ou connexion internet
**Solution :** 
- Vérifiez votre connexion
- Assurez-vous que ARL est bien déployé sur GitHub Pages
- Essayez de rafraîchir la page

### Mes randonnées ont disparu dans editARL
**Cause :** LocalStorage effacé (navigation privée, nettoyage navigateur)
**Solution :** 
- Cliquez sur "📥 Importer depuis ARL"
- Vos randonnées seront rechargées depuis GitHub

### Le fichier téléchargé ne fonctionne pas
**Cause :** Format de fichier incorrect
**Solution :**
- Vérifiez que vous avez téléchargé `index.html` depuis editARL
- Vérifiez qu'il contient bien du code HTML
- Utilisez "Copier" puis créez le fichier manuellement si besoin

---

## 📄 Licence

Ces applications sont développées pour l'**Association Randonnée Loisirs**.

---

## 👤 Auteur

Développé avec l'assistance de Claude (Anthropic)
Pour l'Association Randonnée Loisirs

---

## 🔗 Liens utiles

- **ARL (Liste)** : https://BernardHoyez.github.io/PWA/ARL
- **editARL (Éditeur)** : https://BernardHoyez.github.io/PWA/editARL
- **traceC (Créateur)** : https://BernardHoyez.github.io/PWA/traceC
- **Dépôt GitHub** : https://github.com/BernardHoyez/PWA

---

## 📝 Notes de version

### v1.0 (Décembre 2024)
- ✅ Application ARL - Liste des randonnées
- ✅ Application editARL - Éditeur complet
- ✅ Import automatique depuis ARL
- ✅ Sauvegarde locale automatique
- ✅ Export HTML simplifié
- ✅ PWA installable avec Service Worker
- ✅ Mode hors-ligne

---

**Bonne randonnée ! 🥾🌲**