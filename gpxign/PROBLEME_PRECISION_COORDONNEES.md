# 🎯 Problème : Coordonnées trop précises (gpx.studio)

## Le problème découvert

### Symptôme
Lors du traitement d'un fichier GPX créé avec **gpx.studio**, certains points (ceux créés **sans routage**) se retrouvent avec une altitude de `0` après traitement.

### Exemple de fichier problématique
```xml
<!-- Points avec routage (OK) -->
<trkpt lat="43.471586" lon="6.071241">
  <ele>320</ele>  ✅ 6 décimales
</trkpt>

<!-- Points sans routage (PROBLÈME) -->
<trkpt lat="43.47139362172626" lon="6.072181682390492">
  <ele>0</ele>  ❌ 14-15 décimales
</trkpt>
```

## 🔬 Analyse technique

### Précision des coordonnées GPS

| Type de point | Décimales latitude | Décimales longitude | Résultat API IGN |
|--------------|-------------------|---------------------|------------------|
| Avec routage | 6 | 6 | ✅ Altitude correcte |
| Sans routage | 14 | 15 | ❌ Retourne `0` |

### Pourquoi gpx.studio fait ça ?

Quand vous créez un tracé dans gpx.studio :
1. **Avec routage** (en suivant les routes) : les points sont simplifiés → 6 décimales
2. **Sans routage** (ligne droite) : les points interpolés sont très précis → 14-15 décimales

### Pourquoi l'API IGN retourne zéro ?

L'API IGN Géoportail ne gère probablement pas bien les coordonnées avec une précision excessive :
- **Attendu** : 6-8 décimales (précision ~1 mètre à 1 mm)
- **Reçu** : 14-15 décimales (précision théorique de 0.00001 mm !)

Cette précision excessive n'a aucun sens en pratique et peut causer des erreurs de parsing ou de calcul côté serveur.

### Référence de précision GPS

| Décimales | Précision | Usage |
|-----------|-----------|-------|
| 0 | 111 km | Pays |
| 1 | 11.1 km | Grande ville |
| 2 | 1.11 km | Village |
| 3 | 111 m | Quartier |
| 4 | 11.1 m | Parcelle |
| 5 | 1.11 m | Arbre |
| 6 | 11.1 cm | **GPS standard** ✅ |
| 7 | 1.11 cm | Géodésie |
| 8 | 1.11 mm | **Maximum utile** ✅ |
| 9-15 | <1 mm | **Inutile/problématique** ❌ |

## ✅ Solution implémentée (version 1.0.3)

### Arrondissement automatique

```javascript
async function getIGNAltitude(lon, lat) {
    // Arrondir à 8 décimales (précision ~1mm)
    const lonRounded = parseFloat(lon.toFixed(8));
    const latRounded = parseFloat(lat.toFixed(8));
    
    const url = `https://data.geopf.fr/altimetrie/.../elevation.json?lon=${lonRounded}&lat=${latRounded}`;
    // ...
}
```

### Avantages
1. ✅ **Compatibilité API IGN** : coordonnées dans le format attendu
2. ✅ **Précision conservée** : 1mm est largement suffisant pour l'altimétrie
3. ✅ **Pas de perte réelle** : la précision GPS réelle est de 3-10m de toute façon
4. ✅ **Transparent** : l'utilisateur n'a rien à faire

### Impact
- Les points créés sans routage dans gpx.studio fonctionnent maintenant correctement
- Pas d'altitude à `0` pour des coordonnées valides
- Tous les points du fichier sont traités avec succès

## 📊 Exemple de résultat

### Avant (v1.0.2)
```
Coordonnée envoyée : lon=6.072181682390492, lat=43.47139362172626
Réponse API IGN : {"elevations": [0]}
Résultat : <ele>0</ele> ❌
```

### Après (v1.0.3)
```
Coordonnée envoyée : lon=6.07218168, lat=43.47139362
Réponse API IGN : {"elevations": [324.75]}
Résultat : <ele>324.75</ele> ✅
```

## 🧪 Comment tester

### Créer un fichier test avec gpx.studio

1. Aller sur https://gpx.studio
2. Créer un tracé en deux parties :
   - **Partie 1** : avec routage (suivre une route)
   - **Partie 2** : sans routage (ligne droite entre 2 points)
3. Exporter le GPX
4. Traiter avec notre application

**Résultat attendu** : Tous les points doivent avoir une altitude valide (pas de `0`)

### Vérifier les décimales dans un GPX

```bash
# Compter les décimales des coordonnées
grep "<trkpt" fichier.gpx | head -20
```

## 🔍 Comment identifier ce problème

### Signes révélateurs

1. ✅ Points avec altitude `0` en **séquence continue**
2. ✅ Ces points ont **14-15 décimales** dans les coordonnées
3. ✅ Le fichier vient de **gpx.studio**
4. ✅ Les sections correspondent à un tracé **sans routage**
5. ✅ Les coordonnées sont **valides** (sur Geoportail, elles affichent bien un relief)

### Différencier des vrais problèmes

| Symptôme | Coordonnées précises | Vraie zone invalide |
|----------|---------------------|---------------------|
| Altitude 0 | ✅ Oui | ✅ Oui |
| Points consécutifs | ✅ Oui (section sans routage) | ❌ Dispersés |
| Décimales | ❌ 14-15 | ✅ 6-8 |
| Sur Geoportail | ✅ Affiche l'altitude | ❌ Hors France/mer |
| Source | ✅ gpx.studio | ✅ Divers |

## 📝 Recommandations

### Pour les utilisateurs de gpx.studio

1. **Utiliser le routage** quand possible pour une meilleure précision
2. **Simplifier les tracés** si beaucoup de points sans routage
3. **Vérifier les exports** avant traitement

### Pour les développeurs

1. **Toujours arrondir** les coordonnées GPS avant d'appeler des API
2. **8 décimales maximum** pour les API altimétriques
3. **6 décimales** suffisent pour la plupart des usages GPS

## 🎯 Résultat final

Avec la version 1.0.3, les fichiers GPX créés avec gpx.studio (avec ou sans routage) sont maintenant **correctement traités**, sans aucune altitude à `0` pour des coordonnées valides !

---

**Version :** 1.0.3  
**Problème :** Coordonnées trop précises (>8 décimales)  
**Solution :** Arrondissement automatique à 8 décimales  
**Impact :** Compatibilité parfaite avec gpx.studio
