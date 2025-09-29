<H1>Projets PWA</H1>

On trouve ici plusieurs applications :

<BR>tagmoi<BR>
<A href="https://bernardhoyez.github.io/PWA/tagmoi/">tagmoi</A>
<BR>Cette application tague les images en bas à gauche avec les coordonnées GPS.
________________________________________________

<BR>Allez-y<BR>
<A href="https://bernardhoyez.github.io/PWA/Allez-y/">Allez-y</A>
<BR>Cette application prend en entrée un point de destination. 
Elle affiche sur une carte OSM la position actuelle de l'utilisateur du smartphone.
Elle affiche la distance en mètres au point de destination,
ainsi que l'azimut à suivre pour l'atteindre.
_________________________________________________

<BR>editeur_V7G<BR>
<A href="https://bernardhoyez.github.io/PWA/editeur_V7G">Editeur de visite</A>

<BR>C'est un editeur de visite. 
Elle construit un certain nombre de point d'intérêt (POI).
Ces POI comportent des photos JPEG, des vidéos MP4, des commentaires audio MP3,
ainsi qu'un titre, une géolocalisation et un commentaire textuel.
Elle accepte également des photos de détail.
Elle produit en sortie un fichier Zip avec une structure qui pourra être utilisée
par une application de visualisation cartographique.
__________________________________________________
<BR>
editgrok<BR>
 <A href="https://bernardhoyez.github.io/PWA/editgrok">Editeur de visite Grok</A>
<P></P>
Cette appli d'édition de visite fonctionne et génère un fichier zip en sortie
<HR>


<BR>suivons le guide_V8G<BR>
Guide de terrain<BR>
<A href="https://bernardhoyez.github.io/PWA/suivons le guide_V8G">Visualiseur de visite</A>
<BR>
Le fichier Zip produit par l'éditeur sert à guider l'utilisateur sur le terrain. 
Elle affiche les POI avec tous les médias associés sur une carte OSM.
La position de l'utilisateur est symbolisée par un marqueur mobile avec l'utilisateur.
La distance en mètres et l'azimut pour l'atteindre sont affichés.<P>
________________________________________
GuideClaude2
<A HREF="https://bernardhoyez.github.io/PWA/GuideClaude2/">GuideClaude2</A>
<BR>
Guide de terrain, version Claude<BR>
1. Chargement des données ZIP

Interface pour sélectionner un fichier ZIP depuis le smartphone.
Lecture automatique du fichier visit.json et des dossiers de données.
Parsing intelligent des fichiers texte (Titre, Commentaire, Localisation).
Support des médias (JPEG, MP4, MP3).

2. Carte interactive avec OpenStreetMap

Affichage des points d'intérêt sur une carte OSM avec Leaflet.
Marqueurs numérotés selon les IDs des points.
Zoom automatique pour englober tous les points.
Interface responsive adaptée aux mobiles.

3. Géolocalisation temps réel

Marqueur GPS en temps réel (rouge, pulsant).
Indicateur visuel du statut GPS avec animation.
Précision de la position affichée.
Gestion des erreurs de géolocalisation.

4. Interaction avancée

Distance calculée entre la position réelle et chaque point d'intérêt.
Azimut affiché au format "Nord XXX°".
Popups riches avec toutes les données :
Largeur : 85% de l'écran
Marges réduites : padding de 0.5rem 
Responsive : padding  réduit (0.25rem) sur mobile
Styles personnalisés : coins arrondis et ombre portée améliorée.
Avec :
Titre du point
Coordonnées GPS
Commentaires détaillés
Images, vidéos et audio intégrés

5. PWA (Progressive Web App)

Installable sur l'écran d'accueil.
Fonctionne hors ligne (cache intelligent).
Design natif mobile.
Service Worker intégré.

<HR>

Editeur de visite<BR>
<B>editpoih<B>
<A HREF="https://bernardhoyez.github.io/PWA/ediipoih/">editpoih</A>
Cet éditeur de visite est le plus avancé des projets de ce genre
<HR>
Visualiseur de visite<BR>
<B>visupoi</B>
<A HREF="https://bernardhoyez.github.io/PWA/visupoi/">visupoi</A>
<BR>Le plus avancé des guides de visite
<BR>Fonctionne bien avec l'éditeur editpoih
