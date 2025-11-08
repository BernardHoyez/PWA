```markdown
# marche — PWA randonnée (utilise Plan IGN via GéoPlateforme)

Ce dépôt contient la PWA "marche" — application pour randonnée avec pré-téléchargement de tuiles et mode hors-ligne.

Principales caractéristiques :
- Fond par défaut : Plan IGN v2 via WMTS public GéoPlateforme (data.geopf.fr).
- Option basculable : Orthophoto IGN (WMTS).
- Téléchargement des dalles dans un rayon de 10 km autour du point de départ, pour les zooms 13→18.
- Mise en cache des tuiles (Cache Storage). Option d'écriture dans un dossier utilisateur via File System Access API si le navigateur le supporte.
- Enregistrement de la trace GPS (Start/Stop), prise de photo géolocalisée (coordonnées sur l'image), enregistrement audio, export GPX & KML.
- Déployable sur GitHub Pages (ex : https://BernardHoyez.github.io/PWA/marche).

Remarques :
- Les URLs WMTS utilisées sont publiques et proviennent de GéoPlateforme (data.geopf.fr). Vérifiez la politique d'usage et CORS sur votre navigateur si vous rencontrez des problèmes.
- Ajoutez les fichiers icon192.png et icon512.png à la racine pour que le manifest et l'installation PWA fonctionnent correctement.
- Le service worker (sw.js) met en cache l'app shell et intercepte les images (tuiles) pour les mettre en cache tile-by-tile.

Déploiement :
- Publiez le contenu du dossier sur GitHub Pages (branche main ou gh-pages selon configuration).
- Assurez-vous que les chemins sont corrects (sw.js enregistré à la racine du site).
```