self.addEventListener("install", e => {
  console.log("Service Worker installé");
});

self.addEventListener("fetch", e => {
  // Laisser passer toutes les requêtes (mode développement)
});
