<H1>Projets PWA</H1>

On trouve ici plusieurs applications :

<BR><H2>tagmoi</H2><BR>
<A href="https://bernardhoyez.github.io/PWA/tagmoi/">tagmoi</A>
<BR>Cette application tague les images en bas à gauche avec les coordonnées GPS.
________________________________________________

<BR><H2>Allez-y</H2><BR>
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
<B><H2>editpoih<B></H2><BR>
<A HREF="https://bernardhoyez.github.io/PWA/editpoih/">editpoih</A>
<BR>Cet éditeur de visite est le plus avancé des projets de ce genre
<HR>
Visualiseur de visite<BR>
<B>visupoi</B><BR>
<A HREF="https://bernardhoyez.github.io/PWA/visupoi/">visupoi</A>
<BR>Le plus avancé des guides de visite
<BR>Fonctionne bien avec l'éditeur editpoih

______________________________________________________________________

Visualiseur de visite<BR>
<B><H2>visupoicd</H2></B><BR>
<A HREF="https://bernardhoyez.github.io/PWA/visupoicd/">visupoicd</A>
<BR>Le plus avancé des guides de visite
<BR>Fonctionne bien avec l'éditeur editpoih, avec en plus une lightbox (un clic sur l'image ouvre une lightbox zoomable)

________________________________
<p>&nbsp;Les POI (Points Of Interest) ou Points d'intérêt sont les petits "cailloux blancs" qu'on laisse sur un trajet pour se souvenir, bien après, de certains lieux marquants.</p><p>Ce trajet peut être une excursion touristique ou géologique, une randonnée pédestre, la visite d'un musée.<br /><br />Une visite est un ensemble structuré de POIs.</p><p>Un POI comporte ou peut comporter différents objets :</p><p></p><ul style="text-align: left;"><li>un ID ou identificateur</li><li>un titre (obligatoire)</li><li>une géolocalisation GPS (obligatoire)</li><li>un commentaire textuel (facultatif)</li><li>une image ou une photo (facultatif)</li><li>un commentaire audio (facultatif)</li><li>une vidéo (facultative).</li></ul><div>Puisqu'il est obligatoirement géolocalisé, chaque POI d'une visite peut être représenté par un marqueur sur un fond de carte. Par exemple, une épingle sur un fond de carte Open Street Map.</div><div><br /></div><div>Il y a deux aspects dans une visite :</div><div><ul style="text-align: left;"><li>sa construction</li><li>sa visualisation<br /><br /></li></ul><div><b>Construire une visite</b> consiste à décrire une succession de POIs, en fournissant pour chaque POI le maximum des objets qu'on vient de nommer. On peut par exemple choisir une photo ou une vidéo captée avec son smartphone,ou encore enregistrer un commentaire vocal descriptif du POI.</div></div><div><br /></div><div><b>Visualiser une visite</b> consiste à suivre des POIs sur une carte. Cette carte, de manière élémentaire, peut être une carte OSM (OpenStreet Map) sur laquelle les POIs sont représentés par des marqueurs. Un clic sur ces marqueurs entraîne l'ouverture de popups (petites fenêtres flottantes) montant les données attachées au POI.<br />La visualisation des POIs peut se faire dans deux situations :</div><div><span>&nbsp; &nbsp; - en chambre, avec un ordinateur, c'est une visite virtuelle,</span><br /></div><div><span><span>&nbsp; &nbsp; - sur le terrain, avec un smartphone géolocalisé, c'est une visite guidée.</span><br /></span></div><div><span><span><br /></span></span></div><div><span><span>Entre la construction et la visualisation se fait un passage de données, par le truchement d'un fichier.<br />Ce fichier est en fait une archive (un zip) qui comporte les données brutes&nbsp; (dossier "data") et la structure qui lie les données (fichier visit.json).</span></span></div><div><span><span><br /></span></span></div><div><span><span>La traduction informatique de cette visite guidée va être réalisée par l'écriture de plusieurs applications qui ont en commun le fait d'être des PWA (Progressive Web Applications). Rappelons en quelques phrases l'intérêt du choix des PWA.</span></span></div><div><span><span><span>&nbsp; &nbsp; -&nbsp;</span></span></span><b>Code unique :</b> Une PWA utilise une seule base de code (HTML, CSS, JavaScript) pour toutes les plateformes (web, mobile, desktop).<br /><span>&nbsp; &nbsp; -&nbsp;</span><b>Pas de store d'applications obligatoire :</b> L'utilisateur peut installer la PWA directement depuis le navigateur, sans passer par l'App Store ou Google Play, simplifiant le processus d'adoption.<br /><span>&nbsp; &nbsp; -&nbsp;</span><b>Légèreté :</b> Les PWA sont souvent beaucoup plus légères que les applications natives.</div><div><span>&nbsp; &nbsp; -&nbsp;</span><b>Vitesse et performance :</b> Les PWA sont conçues pour être rapides et réactives.<br /><span>&nbsp; &nbsp; -&nbsp;</span><b>Fonctionnement hors ligne (ou avec connexion limitée) :</b> Grâce aux <i>Service Workers</i>, elles peuvent mettre en cache du contenu et fonctionner même sans connexion Internet ou avec une connexion instable.</div><div><span>&nbsp; &nbsp; -&nbsp;</span><b>Partage facilité :</b> Elles peuvent être lancées et partagées via un simple lien URL.</div><div><br /></div><div>Pour bâtir les applications, les robots générateurs de code sont essentiels (ChatGPT, Claude, Gemini, Grok, Github Copilot, Perplexity ...). Leur rôle a été déterminant.</div><div><br /></div><div>La construction de la visite à partir des POIs est basée sur 3 applications accessibles sur le dépôt Github :<br /><span>&nbsp; &nbsp;<span style="font-size: medium;"> - <a href="https://bernardhoyez.github.io/PWA/editpoih/" target="_blank">editpoih</a>&nbsp;: construction des POI</span></span></div><div><span><span style="font-size: medium;">&nbsp; &nbsp; - <a href="https://bernardhoyez.github.io/PWA/modifpoi/" target="_blank">modifpoi</a>&nbsp;: correction et déplacement des POIs</span></span></div><div><span><span style="font-size: medium;">&nbsp; &nbsp; - <a href="https://bernardhoyez.github.io/PWA/ordonnepoi/" target="_blank">ordonnepoi</a>&nbsp;: tri les POI selon la latitude ou la longitude</span></span></div><div><br />La visualisation de la visite est réalisée par :</div><div><span>&nbsp; &nbsp;<span style="font-size: medium;"> - <a href="https://bernardhoyez.github.io/PWA/visupoicd/" target="_blank">visupoicd</a>&nbsp;: visite virtuelle ou visite guidée</span></span><br /></div><div><span><br /></span></div><div><span>Une fois que l'application est lancée dans le navigateur (Chrome, Firefox, Safari ...), il est possible de l'installer. Selon le navigateur et le type de plateforme, le processus d'installation est différent. Il peut s'agir d'une icône particulière à côté de la barre d'URL ou d'une option accessible par l'icône "trois points" ou hamburger. L'application apparaît avec son icône sur la page d'accueil et dans la liste des applications installées.</span></div><div><span><br /></span></div><div>Comment utiliser&nbsp;<a href="https://bernardhoyez.github.io/PWA/editpoih/" style="font-size: large;" target="_blank">editpoih</a></div><div>1) Donner un nom à la visite renfermant les POIs.</div><div>Remarquer tout de suite qu'il est possible de reprendre une visite déjà commencée et pour laquelle on ajoute des POIs supplémentaire. Cette visite préliminaire est un fichier .zip.</div><div>2) Donner un titre au POI sur lequel on va travailler.</div><div>3) Deux champs d'entrée qui permettent de fixer la latitude et la longitude du POI. Ces champs peuvent être remplis de 3 manières :</div><div><span>&nbsp; &nbsp; - automatiquement par importation d'une photogéolocalisée (métadonnées EXIF)</span><br /></div><div><span><span>&nbsp; &nbsp; - par positionnement manuel d'un marqueur sur la carte OSM</span><br /></span></div><div><span><span><span>&nbsp; &nbsp; - par remplissage manuel (format degrés décimaux, avec point décimal).</span><br /></span></span></div><div>La géolocalisation est obligatoire de quelque manière que ce soit.</div><div>4) Remplissage d'un commentaire textuel.</div><div>5) Importation d'un fichier audio MP3.</div><div>6) Importation d'une vidéo MP4</div><div>7) Quand toutes les données sont introduites, on clique sur le bouton "Ajouter ce POI".</div><div>Ce POI apparaît alors dans la liste des POIs validés, dans la colonne de droite.</div><div>8) On recommence avec l'introduction d'un nouveau POI, autant de fois qu'il y a de POIs prévus.<br />9) Quand&nbsp; tous les POIs sont validés, on sauvegarde la visite sous la forme d'un fichier Zip.</div><div><br /></div><div>Les POIs apparaissent dans la liste dans l'ordre dans lequel ils ont été introduits.</div><div>Par glisser/déposer, on peut modifier cet ordre.<br />On peut également éditer de nouveau un POI de la liste ou le supprimer.</div><div><br /></div><div>Comment utiliser&nbsp;<a href="https://bernardhoyez.github.io/PWA/modifpoi/" style="font-size: large;" target="_blank">modifpoi</a></div><div>Il est fréquent qu'une photo ait été mal géolocalisée par le GPS inetrne du smartphone. Le marqueur du POI se trouve positionné sur la carte au maivais endroit.</div><div>A l'aide de la carte, on déplace le marqueut fautif au bon enfroit. On sauvegarde le fichier modifié.</div><div><br /></div><div>Comment utiliser&nbsp;<a href="https://bernardhoyez.github.io/PWA/ordonnepoi/" style="font-size: large;" target="_blank">ordonnepoi</a></div><div>Les POIs sont souvent entrés dans un ordre indifférent à leur ordonnancement géographique.<br />Si la visite est linéaire, il est possible de réorganiser les POIs selon la latitude ou selon la longitude.<br />Comme les marqueurs sont numérotés, il est alors plus facile de suivre la progression sur le terrain.</div><div><br /></div><div>Comment utiliser&nbsp;<a href="https://bernardhoyez.github.io/PWA/visupoicd/" style="font-size: large;" target="_blank">visupoicd</a></div><div><br /></div><div>Alors que la construction des POIs se prépare essentiellement sur Desktop (ordinateur), la visualisation des POIs est intrinséquement plus adaptée aux situations de mobilité externe et donc au smartphone. Visupoicd peut fonctionner sur PC ou sur Mac, mais on reste dans la virtualité.</div><div>On insistera donc sur les propriétés de l'application installée sur un smartphone (Android ou iOS).</div><div><br /></div><div>A l'ouverture de l'application, il n'est demandé que de charger un fichier .zip.</div><div>Ce fichier .zip qui peut atteindre des dizaines ou des centaines de mégaoctets aura été précédemment sauvegardé dans un dossier facilement accessible. Sa taille interdit généralement d'être transmis par mél. On utilisera à cet effet des plateformes de transfert de fichiers lourds ou un Drive dans le cloud.</div><div>Si la visite comporte de nombreux POIs et des fichiers média lourds, alors l'importation peut demander un certain temps.</div><div><br /></div><div>Une carte s'affiche présentant une suite numérotée de marqueurs de POIs. Normalement, tous les POIs sont représentés et correspondent à une certaine échelle. Il est possible de zoomer pour grossir et mieux distinguer individuellement les POIs..</div><div>Un clic sur un marqueur de POI enttraîne l'ouverture d'une popup (petite fenêtre attachée au point).</div><div>Si vous déplacez la carte (glisser), vous constatez que votre position géographique actuelle est figurée par un gros marqueur rouge pulsant. En zoomant dessus, vous verrez les détails de topographie ou d'architecture apparaître.</div><div>Dans la popup sont figurés :</div><div><span>&nbsp; &nbsp; - le titre du POI,</span><br /></div><div><span><span>&nbsp; &nbsp; - sa latitude et sa longitude</span><br /></span></div><div><span><span><span>&nbsp; &nbsp; - un commentaire (facultatif)</span><br /></span></span></div><div><span><span><span>&nbsp; &nbsp; - une photo (facultative)</span><br /></span></span></div><div><span><span><span><span>&nbsp; &nbsp; - un lecteur audio (facultatif)</span><br /></span></span></span></div><div><span>&nbsp; &nbsp; - un lecteur vidéo (facultatif)</span><br /></div><div><span><span>&nbsp; &nbsp; - une distance en mètres vous séparant du POI</span><br /></span></div><div><span><span><span>&nbsp; &nbsp; - un azimut en degrés par rapport au Nord vers le POI sélectionné.<br /></span>La distance et l'azimut sont mis à jour à mesure que vous vous déplacez. On peut ainsi se rapprocher progressivement du POI en tenant compte de l'évolution de la distance.</span></span></div><div><span><span><span><br /></span></span></span></div><div><span><span><span>Si une photo est présente dans la popup, un simple clic sur cette photo ouvre une "lightbox" zoomable.</span></span></span></div><div><span><span><span>Ceci permet d'observer des détails précis à l'intérieur de la photo. Une croix de fermeture permet de faire disparaître la lightbox.</span></span></span></div><div><span><span><span><br /></span></span></span></div><div><br /></div><div><br /></div><p></p>
___________________________________________________________

Application <B><H2>trouvecoord</H2></B> <P>
Cette application permet de sélectionner une photo géolocalisée (hors galerie), d'afficher ses coordonnées géographiques sous 3 formats et d'afficher sa position sur une carte IGN. <BR>
TrouveCoord est maintenant pleinement opérationnelle sur :

URL : https://bernardhoyez.github.io/PWA/trouvecoord/
Fond de carte : Plan IGN via la Géoplateforme ✅
Extraction GPS : Métadonnées EXIF des photos ✅
3 formats de coordonnées : Degrés décimaux, minutes décimales, degrés sexagésimaux ✅
PWA : Installable et fonctionne hors ligne ✅

___________________________________________


Application <H2>mesips</H2>
https://bernardhoyez.github.io/PWA/mesips/

Permet d'obtenir mes IP publique (V4 et V6) et privée
URL : https://bernardhoyez.github.io/PWA/mesips/
____________________________________

Application <H2>marche</H2>
https://bernardhoyez.github.io/PWA/marche/

Une application PWA de randonnée, intitulée "marche".


1) Téléchargement anticipé (accès internet serveur Geoplateforme WMTS on-line) d'un fond de carte "Plan IGN" (public, pas de clé API)

2) Sélection des coordonnées GPS du point de départ de la randonnée. Mise en mémoire.

3) Téléchargement des dalles comprises dans un rayon de 10 kilomètres autour du point de départ, pour des niveaux de zoom de 13 à 18.
Sauvegarde dans un dossier accessible.


4) Au départ de la randonnée. En Off-line. Ouverture et positionnement du point de départ enregistré sur fond Plan IGN, zoom 13.

5) Affichage de 4 boutons : Départ, Photo, Audio, Arrêt

Départ : débute la visualisation du point GPS (marqueur) et l'enregistrement de la trace du déplacement

Photo : capture de la photogéolocalisée, inscription des coordonnées GPS sur la photo (format degrés décimaux), sauvegarde du fichier image.
(nom de fichier = coordonnées GPS avec 6 chiffres significatifs). Marquage d'un waypoint sur la trace.

Audio : enregistrement d'un commentaire vocal (nom de fichier = coordonnées GPS avec 6 chiffres significatifs). 
Marquage d'un waypoint sur la trace.

Arrêt : arrêt d'enregistrement et sauvegarde de la trace sous deux fichiers (un en GPX et l'autre en KML).

_____________________________________________________
mestiles

_____________________

icongene
**icongene**
icongene est une PWA qui fabrique deux icones destinées à l'écriture de PWA (icon512 et icon192)
Un texte choisi apparaît au centre de l'icône

(Bernardhoyez.github.io/PWA/icongene)

