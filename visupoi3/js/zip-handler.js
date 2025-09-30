// Inclusion de JSZip via CDN
// Ce fichier peut rester vide si tu inclus directement le CDN dans index.html
// Exemple : <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

// Ici, on ne fait que vérifier que JSZip est bien dispo
if (typeof JSZip === "undefined") {
  console.error("JSZip n'est pas chargé. Vérifie ton index.html");
}
