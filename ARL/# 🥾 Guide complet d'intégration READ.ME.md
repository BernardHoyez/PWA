# 🥾 Guide complet d'intégration - Site ARL

> Guide pour ajouter de nouvelles randonnées sur le site ARL

## 📁 Structure du site

```
bernardhoyez.github.io/
└── PWA/
    └── ARL/
        ├── index.html                    # Page d'accueil
        ├── Parc de Rouelles.html        # Page de randonnée (exemple)
        ├── trace-rouelles.html          # Carte interactive (générée par traceC)
        ├── README.md                    # Ce guide
        └── images/
            └── logoARL.jpg              # Logo de l'association
```

---

## 🚀 Ajouter une nouvelle randonnée

### Étape 1 : Générer la carte interactive

1. **Accédez à traceC** : [https://bernardhoyez.github.io/PWA/traceC/](https://bernardhoyez.github.io/PWA/traceC/)

2. **Choisissez le fond de carte** :
   - 🌍 OpenStreetMap (mondial)
   - 🇫🇷 IGN Plan V2 (France - haute précision)
   - 📸 IGN Orthophoto 20cm (France - satellite)

3. **Glissez-déposez** votre fichier GPX ou KML

4. **Téléchargez** le fichier HTML généré, par exemple :
   ```
   trace-MontagneVerte-12.3km-2025-01-15.html
   ```

5. **Renommez** le fichier (recommandé) :
   ```
   trace-montagne-verte.html
   ```
   ⚠️ Utilisez des noms courts, sans espaces, en minuscules

6. **Copiez** le fichier dans `PWA/ARL/`

---

### Étape 2 : Créer la page de la randonnée

1. **Dupliquez** le fichier `Parc de Rouelles.html`

2. **Renommez-le**, par exemple :
   ```
   Montagne Verte.html
   ```

3. **Modifiez** le contenu de la page :

#### A. Modifier l'en-tête (lignes 88-96)

```html
<div class="header">
  <div class="header-content">
    <a href="index.html" class="back-link">← Retour aux randonnées</a>
    <h1>⛰️ La Montagne Verte</h1>  <!-- Changez le titre et l'emoji -->
    <div class="header-meta">
      <span>📏 Distance : 12 km</span>      <!-- Modifiez -->
      <span>⛰️ Dénivelé : 450m D+</span>   <!-- Modifiez -->
      <span>⏱️ Durée : 4h</span>           <!-- Modifiez -->
      <span>🚶 Difficulté : Moyenne</span> <!-- Modifiez -->
    </div>
  </div>
</div>
```

#### B. Modifier l'iframe de la carte (ligne 103)

```html
<iframe src="trace-montagne-verte.html" loading="lazy"></iframe>
```
⚠️ Utilisez exactement le même nom que le fichier de l'étape 1

#### C. Modifier la description (lignes 111-145)

```html
<div class="description-card">
  <h2>📖 Description de la randonnée</h2>
  <p>
    Décrivez votre randonnée ici. Parlez du paysage, 
    de l'ambiance, de ce qu'on peut voir...
  </p>
  <p>
    Ajoutez des détails sur la difficulté, 
    le public ciblé, etc.
  </p>
  
  <h2 style="margin-top: 30px;">🎯 Points d'intérêt</h2>
  <ul>
    <li>🏔️ Sommet avec table d'orientation</li>
    <li>🌲 Forêt de sapins</li>
    <li>🏰 Ruines médiévales</li>
    <!-- Ajoutez vos points d'intérêt -->
  </ul>
  
  <h2 style="margin-top: 30px;">ℹ️ Informations pratiques</h2>
  <ul>
    <li><strong>Point de départ :</strong> Parking de la Mairie</li>
    <li><strong>Balisage :</strong> Rouge</li>
    <li><strong>Meilleure période :</strong> Avril à Octobre</li>
    <li><strong>Équipement :</strong> Chaussures de montagne, bâtons</li>
    <!-- Modifiez selon votre randonnée -->
  </ul>
</div>
```

---

### Étape 3 : Ajouter la carte sur la page d'accueil

1. **Ouvrez** `index.html`

2. **Trouvez** la section `.randonnees-list` (ligne 118)

3. **Ajoutez** un nouveau bloc de carte **après** la carte existante :

```html
<div class="randonnees-list">
  
  <!-- Carte existante : Parc de Rouelles -->
  <a href="Parc de Rouelles.html" class="randonnee-card">
    ...
  </a>
  
  <!-- NOUVELLE CARTE : Montagne Verte -->
  <a href="Montagne Verte.html" class="randonnee-card">
    <div class="card-image">⛰️</div>  <!-- Choisissez un emoji -->
    <div class="card-content">
      <h3>La Montagne Verte</h3>  <!-- Titre -->
      <p>Une randonnée sportive avec un magnifique panorama au sommet.</p>  <!-- Description courte -->
      <div class="card-meta">
        <span>📏 12 km</span>
        <span>⛰️ 450m D+</span>
        <span>⏱️ 4h</span>
      </div>
      <div class="btn-voir">Voir la carte 🗺️</div>
    </div>
  </a>
  
</div>
```

#### 🎨 Emojis recommandés pour les cartes

- 🌳 Forêt, parc
- ⛰️ Montagne
- 🏔️ Haute montagne
- 🌊 Mer, côte
- 🏞️ Nature, vallée
- 🏰 Patrimoine
- 🌾 Campagne
- 🌄 Lever de soleil
- 🦌 Faune
- 🌸 Fleurs

---

### Étape 4 : Tester localement (optionnel)

#### Option A : Ouvrir directement
Double-cliquez sur `index.html`
⚠️ Certains navigateurs bloquent les iframes en local

#### Option B : Serveur local (recommandé)

**Avec Python 3** :
```bash
cd PWA/ARL
python -m http.server 8000
```
Puis ouvrez : [http://localhost:8000](http://localhost:8000)

**Avec Node.js** :
```bash
cd PWA/ARL
npx http-server -p 8000
```

**Avec VS Code** :
Extension "Live Server" → Clic droit sur `index.html` → "Open with Live Server"

---

### Étape 5 : Déployer sur GitHub Pages

```bash
# 1. Ajouter les fichiers
git add PWA/ARL/

# 2. Committer
git commit -m "Ajout randonnée : Montagne Verte"

# 3. Pousser sur GitHub
git push origin main
```

⏱️ **Attendez 1-2 minutes** que GitHub Pages se mette à jour

🌐 **Visitez** : [https://bernardhoyez.github.io/PWA/ARL/](https://bernardhoyez.github.io/PWA/ARL/)

---

## 📝 Checklist complète

Avant de déployer, vérifiez :

- [ ] Le fichier trace HTML est dans `PWA/ARL/`
- [ ] Le nom du fichier dans l'iframe correspond exactement
- [ ] Les métadonnées sont à jour (distance, dénivelé, durée)
- [ ] La description est personnalisée
- [ ] Les points d'intérêt sont listés
- [ ] La carte est ajoutée sur `index.html`
- [ ] L'emoji de la carte est choisi
- [ ] Le lien vers la page de randonnée est correct
- [ ] Le site fonctionne en local
- [ ] Le commit est fait avec un message clair

---

## 🎨 Personnalisation avancée

### Modifier les couleurs du site

Dans `index.html` et les pages de randonnées, changez les dégradés :

**Dégradé violet actuel** :
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Exemples d'autres dégradés** :
```css
/* Bleu-vert */
background: linear-gradient(135deg, #667eea 0%, #28a745 100%);

/* Orange-rouge */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

/* Vert nature */
background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
```

### Modifier la durée de la bannière

Dans `index.html`, ligne 37 :
```css
animation: fadeOut 1s ease-in-out 3s forwards;
                                  ↑
                           Durée en secondes
```

### Changer la hauteur de la carte

Dans les pages de randonnées, ligne 88 :
```css
height: 700px;  /* Modifiez cette valeur */
```

---

## ⚠️ Problèmes courants et solutions

### La carte ne s'affiche pas

**Problème** : Écran blanc dans l'iframe

**Solutions** :
1. Vérifiez le nom du fichier (respectez majuscules/minuscules)
2. Vérifiez que le fichier est bien dans `PWA/ARL/`
3. Regardez la console (F12) pour voir les erreurs
4. Régénérez la carte avec traceC

---

### La bannière ne disparaît pas

**Problème** : Le logo reste affiché

**Solutions** :
1. Vérifiez que `logoARL.jpg` existe dans `images/`
2. Rechargez la page (Ctrl + F5)
3. Videz le cache du navigateur

---

### Les boutons sont trop petits sur mobile

**Problème** : Boutons illisibles sur smartphone

**Solution** : Les boutons sont déjà optimisés dans la dernière version. Si problème, vérifiez que vous avez bien la dernière version du fichier généré par traceC.

---

### Erreur "Expression non disponible"

**Problème** : La carte ne charge pas, erreur JavaScript

**Solutions** :
1. Régénérez la carte avec la dernière version de traceC
2. Si fichier KML OruxMaps avec waypoints : les descriptions complexes peuvent poser problème
3. Testez avec un fichier GPX simple d'abord

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : contact@arl-rando.fr
- 💬 Issues GitHub : [https://github.com/bernardhoyez/bernardhoyez.github.io/issues](https://github.com/bernardhoyez/bernardhoyez.github.io/issues)

---

## 📚 Ressources utiles

- **traceC** : [https://bernardhoyez.github.io/PWA/traceC/](https://bernardhoyez.github.io/PWA/traceC/)
- **Emojipedia** (pour choisir des emojis) : [https://emojipedia.org/](https://emojipedia.org/)
- **Gradient Generator** : [https://cssgradient.io/](https://cssgradient.io/)
- **Documentation GitHub Pages** : [https://docs.github.com/pages](https://docs.github.com/pages)

---

## 🎓 Exemples de randonnées

### Randonnée facile (famille)
```
Distance : 5-8 km
Dénivelé : 50-150m
Durée : 2-3h
Difficulté : Facile
Emoji : 🌳 ou 🌸
```

### Randonnée moyenne
```
Distance : 10-15 km
Dénivelé : 200-500m
Durée : 3-5h
Difficulté : Moyenne
Emoji : 🏞️ ou ⛰️
```

### Randonnée sportive
```
Distance : 15-25 km
Dénivelé : 500-1000m
Durée : 5-8h
Difficulté : Difficile
Emoji : 🏔️ ou 🥾
```

---

## ✅ Version

- **Version du guide** : 1.0
- **Date** : Janvier 2025
- **Auteur** : ARL
- **Dernière mise à jour** : 2025-01-15

---

**Bon courage pour vos ajouts de randonnées ! 🥾🗺️**