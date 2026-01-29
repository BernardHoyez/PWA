# 🔧 Guide de dépannage GPX IGN

## Problèmes fréquents et solutions

### 1. 🚨 Des points ont une altitude à zéro

**Symptôme :** Après traitement, certains points du tracé ont `<ele>0</ele>`

**Causes possibles :**

#### A. Coordonnées trop précises (gpx.studio) ⚠️ CAUSE FRÉQUENTE
- **Points créés sans routage** dans gpx.studio
- Coordonnées avec 14-15 décimales au lieu de 6-8
- L'API IGN ne gère pas cette précision excessive

**Identification :**
```xml
<!-- Point problématique -->
<trkpt lat="43.47139362172626" lon="6.072181682390492">
  <ele>0</ele>  ← 14-15 décimales !
</trkpt>
```

**Solution (version 1.0.3+) :**
✅ L'application arrondit automatiquement à 8 décimales
✅ Plus de problème avec les fichiers gpx.studio

#### B. Points réellement hors couverture
- Points en mer ou sur la côte
- Points hors territoire français
- Zone non couverte par l'IGN

**Solution (version 1.0.2+) :**
L'application conserve maintenant l'altitude originale pour ces points et affiche :
```
456 points corrigés, 78 points conservés (altitude IGN indisponible)
```

**Actions à prendre :**
1. Vérifier votre tracé sur https://www.geoportail.gouv.fr/
2. Supprimer les points aberrants avec un éditeur GPX
3. Accepter que ces points conservent leur altitude d'origine

### 2. 📊 Le compteur "Points conservés" est élevé

**Symptôme :** Beaucoup de points conservent leur altitude originale

**Signification :**
- Votre tracé contient beaucoup de points hors couverture IGN
- Ou les coordonnées GPS sont de mauvaise qualité

**Solutions :**

#### Option A : Nettoyer le tracé GPS
1. Ouvrir le GPX dans un éditeur (GPS Visualizer, GPXSee, etc.)
2. Supprimer les points :
   - Clairement erronés (sauts GPS)
   - En mer
   - Hors de France

#### Option B : Simplifier le tracé
1. Utiliser un outil de simplification
2. Réduire le nombre de points (garder 1 point tous les 10-20 mètres)

#### Option C : Utiliser une autre source d'altitude
Pour les traces hors France :
- **SRTM** (mondiale) : https://www2.jpl.nasa.gov/srtm/
- **OpenTopoData** : https://www.opentopodata.org/
- **Google Elevation API** (payante)

### 3. ⏱️ Le traitement est très long

**Symptôme :** L'application met plusieurs minutes pour traiter le fichier

**Causes :**
- Fichier GPX avec beaucoup de points (>1000)
- Délai de 100ms entre chaque requête API

**Solutions :**

#### Simplifier le fichier GPX
```bash
# Réduire le nombre de points avec gpsbabel
gpsbabel -i gpx -f trace.gpx -x simplify,count=500 -o gpx -F trace_simplifie.gpx
```

#### Attendre patiemment
- 100 points = ~10 secondes
- 500 points = ~50 secondes  
- 1000 points = ~2 minutes
- 5000 points = ~8 minutes

**Note :** Le délai est nécessaire pour ne pas surcharger l'API IGN

### 4. ❌ Erreur "Fichier GPX invalide"

**Symptôme :** L'application refuse le fichier

**Causes possibles :**
- Fichier corrompu
- Format non-GPX (KML, KMZ, TCX...)
- Encodage incorrect

**Solutions :**
1. Vérifier l'extension : doit être `.gpx`
2. Ouvrir dans un éditeur de texte
3. Vérifier que ça commence par `<?xml version="1.0"?>`
4. Convertir depuis un autre format si nécessaire

### 5. 🔄 Le bouton "Corriger" est grisé

**Symptôme :** Impossible de lancer le traitement

**Causes :**
- Aucun fichier chargé
- Fichier GPX sans points de trace
- Traitement déjà en cours

**Solutions :**
1. Charger un fichier GPX valide
2. Vérifier que le fichier contient des points `<trkpt>`
3. Attendre la fin du traitement en cours
4. Rafraîchir la page si bloqué

### 6. 💾 Le fichier téléchargé est vide ou corrompu

**Symptôme :** Le fichier `*_IGN.gpx` ne s'ouvre pas

**Causes :**
- Navigateur ancien
- Bloqueur de téléchargements
- Problème de droits

**Solutions :**
1. Utiliser Chrome, Firefox ou Edge récent
2. Désactiver les bloqueurs de popups
3. Vérifier les paramètres de téléchargement du navigateur

### 7. 🌐 L'application ne se charge pas

**Symptôme :** Page blanche ou erreur 404

**Causes :**
- URL incorrecte
- GitHub Pages non activé
- Cache navigateur

**Solutions :**
1. Vérifier l'URL : `https://BernardHoyez.github.io/PWA/gpxign/`
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier que GitHub Pages est activé dans Settings

### 8. 📱 L'application ne s'installe pas (PWA)

**Symptôme :** Pas d'icône d'installation dans la barre d'adresse

**Causes :**
- Navigateur non compatible
- Pas en HTTPS
- Service Worker non enregistré

**Solutions :**
1. Utiliser Chrome, Edge, ou Safari
2. Vérifier l'URL en HTTPS
3. Ouvrir la console (F12) et vérifier les erreurs

### 9. 🗺️ Les altitudes semblent incorrectes

**Symptôme :** Les altitudes IGN ne correspondent pas à la réalité

**Vérifications :**
1. Comparer avec Geoportail.gouv.fr
2. Vérifier que les coordonnées sont correctes
3. L'IGN a une précision de ±1-5m

**Note :** L'altitude IGN est la référence officielle française (RGF93)

### 10. 🔒 Erreur CORS ou réseau

**Symptôme :** Message d'erreur sur l'API IGN

**Causes :**
- Problème réseau
- API IGN temporairement indisponible
- Bloqueur de publicités trop agressif

**Solutions :**
1. Vérifier votre connexion internet
2. Désactiver les bloqueurs de publicités
3. Réessayer plus tard
4. Vérifier sur https://www.geopf.fr/ si le service est disponible

## 📞 Besoin d'aide ?

### Informations à fournir

Pour un diagnostic efficace, fournissez :
1. Version de l'application (coin inférieur de la page)
2. Navigateur et version
3. Nombre de points dans votre GPX
4. Message d'erreur exact
5. Fichier GPX problématique (ou extrait)

### Vérifier les logs

Ouvrir la console développeur (F12) :
1. Onglet "Console"
2. Chercher les messages en rouge (erreurs)
3. Chercher les messages sur les points ignorés

### Tester avec le fichier exemple

Pour vérifier que l'application fonctionne :
1. Utiliser `test.gpx` fourni
2. Il devrait traiter 10 points en ~2 secondes
3. Tous les points devraient être corrigés (aucun conservé)

## ✅ Checklist de dépannage

- [ ] J'utilise un navigateur récent (Chrome, Firefox, Edge, Safari)
- [ ] Mon fichier est bien au format `.gpx`
- [ ] Mon tracé est en France métropolitaine ou DOM-TOM
- [ ] J'ai une connexion internet stable
- [ ] J'ai attendu la fin du traitement
- [ ] J'ai consulté les statistiques (points corrigés/conservés)
- [ ] J'ai vérifié les logs dans la console (F12)

Si tous les points sont cochés et le problème persiste, il s'agit probablement d'un problème avec votre fichier GPX spécifique ou d'une limitation de l'API IGN pour votre zone.

---

**Dernière mise à jour :** Version 1.0.2  
**Support API IGN :** https://geoservices.ign.fr/
