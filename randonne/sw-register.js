if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      console.log('Service Worker enregistré avec succès:', registration.scope);
    }, function(err) {
      console.log('Erreur d'enregistrement du Service Worker:', err);
    });
  });
}