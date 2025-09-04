
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
<link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GeoPhoto CSV pour Google Earth</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script src="https://apis.google.com/js/api.js" async defer></script>
<script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "react": "https://aistudiocdn.com/react@^19.1.1",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/"
  }
}
</script>
<link rel="stylesheet" href="/index.css">
</head>
<body class="bg-gray-900 text-white">
  <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker enregistré avec succès: ', registration.scope);
        })
        .catch(error => {
          console.log('Échec de l\'enregistrement du ServiceWorker: ', error);
        });
    });
  }
</script>
</body>
</html>
