# 🚨 Problème : Altitudes à zéro dans le fichier GPX

## Symptôme observé

Dans le fichier `tracebidon2_IGN.gpx`, une partie importante du tracé (environ 80 points) avait une altitude de **0** (zéro).

**Exemple (lignes 181-261) :**
```xml
<trkpt lat="43.471498" lon="6.071579">
  <ele>0</ele>
</trkpt>
<trkpt lat="43.47139362172626" lon="6.072181682390492">
  <ele>0</ele>
</trkpt>
```

## 🔍 Cause du problème

### L'API IGN retourne `0` pour certaines coordonnées

L'API IGN Géoportail retourne une altitude de **0** (au lieu de `null` ou d'une erreur) dans les cas suivants :

1. **Coordonnées en mer** 🌊
   - Points au large des côtes
   - Zones marines

2. **Coordonnées hors couverture France** 🗺️
   - L'API IGN ne couvre que le territoire français
   - Points à l'étranger (même proche)

3. **Zones sans données altimétriques** 
   - Certaines zones non cartographiées
   - Îles lointaines

4. **Coordonnées GPS imprécises**
   - Dérive GPS importante
   - Points aberrants

### Votre tracé spécifique

En analysant les coordonnées problématiques :
- Zone : **Correns (Var, 83)** - près de Brignoles
- Coordonnées : `lat ~43.47, lon ~6.07-6.08`

Ces points sont probablement :
- **Soit en limite de zone couverte**
- **Soit des points GPS avec dérive** (coordonnées trop imprécises)
- **Soit dans une zone non cartographiée** par l'IGN

## ⚠️ Comportement de la version 1.0.1

### Problème identifié dans le code

```javascript
if (altitude !== null) {
    eleElement.textContent = altitude.toFixed(2);
}
```

Ce code vérifie seulement si `altitude !== null`, mais **l'API retourne `0` qui n'est pas `null`** !

Résultat : **les altitudes à zéro sont écrites dans le fichier** 😱

## ✅ Solution apportée (version 1.0.2)

### Nouveau code

```javascript
// Ne mettre à jour que si l'altitude est valide (non null et non zéro)
if (altitude !== null && altitude !== 0) {
    eleElement.textContent = altitude.toFixed(2);
    updated++;
} else {
    skipped++;
    console.log(`Point ignoré - altitude invalide`);
}
```

### Comportement amélioré

1. ✅ **Les altitudes à zéro sont ignorées**
2. ✅ **L'altitude originale est conservée**
3. ✅ **Un compteur affiche les points conservés**
4. ✅ **Un message informe l'utilisateur**

## 📊 Nouvelle interface

### Statistiques affichées

| Statistique | Description |
|-------------|-------------|
| **Points totaux** | Nombre total de points dans le GPX |
| **Points traités** | Progression du traitement (0 → total) |
| **Points corrigés** | Nombre de points avec altitude IGN valide |
| **Points conservés** | Nombre de points avec altitude originale conservée |

### Exemple de message

```
456 points corrigés, 78 points conservés (altitude IGN indisponible)
```

## 🎯 Recommandations pour l'utilisateur

### Si vous avez beaucoup de points conservés

1. **Vérifier votre tracé GPS**
   - Assurez-vous que le tracé est bien en France
   - Vérifiez qu'il n'y a pas de points aberrants (dérive GPS)

2. **Nettoyer le tracé dans un éditeur GPX**
   - Supprimer les points manifestement erronés
   - Simplifier le tracé si trop de points

3. **Utiliser un autre service**
   - Pour les traces hors France, utiliser d'autres API
   - SRTM (mondiale) : https://www2.jpl.nasa.gov/srtm/
   - OpenTopoData : https://www.opentopodata.org/

### Si vous voulez forcer le remplacement

Dans ce cas, vous pouvez :
1. Éditer manuellement le fichier GPX
2. Remplacer les `<ele>0</ele>` par des valeurs interpolées
3. Ou accepter que ces zones n'ont pas de données IGN

## 🔬 Comment vérifier vos coordonnées

### Test manuel d'une coordonnée

```bash
curl "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=6.071579&lat=43.471498"
```

**Réponse si valide :**
```json
{"elevations": [325.43]}
```

**Réponse si invalide :**
```json
{"elevations": [0]}
```

### Visualiser sur une carte

1. Ouvrir https://www.geoportail.gouv.fr/
2. Entrer les coordonnées : `43.471498, 6.071579`
3. Activer la couche "Altimétrie"
4. Vérifier si la zone est bien couverte

## 📝 Conclusion

### Version 1.0.2 corrige ce problème

- ✅ Les altitudes à zéro ne sont plus écrites
- ✅ L'altitude originale est conservée
- ✅ L'utilisateur est informé du nombre de points conservés
- ✅ Les logs indiquent quels points sont problématiques

### Votre fichier sera maintenant correct

Au lieu d'avoir :
```xml
<ele>0</ele>  <!-- ❌ Mauvais -->
```

Vous aurez :
```xml
<ele>320</ele>  <!-- ✅ Altitude originale conservée -->
```

---

**Version corrigée :** 1.0.2  
**Problème :** Altitudes à zéro écrites dans le fichier  
**Solution :** Filtrage des altitudes invalides (0 ou null)
