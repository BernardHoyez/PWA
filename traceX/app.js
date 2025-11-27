// Charge togeojson immédiatement et expose generateHtml quand c'est prêt
(() => {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/umd/togeojson.min.js';
  script.onload = () => {
    window.generateHtml = async (file) => {
      const text = await file.text();
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      if (dom.querySelector('parsererror')) throw new Error('Fichier invalide');

      const geojson = file.name.toLowerCase().endsWith('.gpx') ? toGeoJSON.gpx(dom) : toGeoJSON.kml(dom);
      if (!geojson.features?.length) throw new Error('Aucune trace');

      const base = file.name.replace(/\.(gpx|kml)$/i, '');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${file.name}</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>body{margin:0;background:#222}#map{height:100vh}.p{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:rgba(0,0,0,.8);padding:15px;border-radius:12px}<button{margin:5px;padding:12px 20px;background:#e74c3c;color:#fff;border:none;border-radius:8px;cursor:pointer}></style></head><body><div id="map"></div><div class="p"><h2>${file.name}</h2><button onclick="d('gpx')">GPX</button><button onclick="d('kml')">KML</button><button onclick="d('geojson')">GeoJSON</button></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://cdn.jsdelivr.net/npm/togpx@0.5.4/togpx.js"></script><script src="https://cdn.jsdelivr.net/npm/tokml@0.4.0/tokml.js"></script><script>const g=${JSON.stringify(geojson)};const m=L.map('map').fitBounds(L.geoJSON(g).getBounds());L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'©OpenStreetMap'}).addTo(m);L.geoJSON(g,{style:{color:'#e74c3c',weight:7}}).addTo(m);function d(f){let x,n='${base}',t;f==='gpx'? (x=togpx(g),n+='.gpx',t='application/gpx+xml') : f==='kml'? (x=tokml(g),n+='.kml',t='application/vnd.google-earth.kml+xml') : (x=JSON.stringify(g,null,2),n+='.geojson',t='application/geo+json');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([x],{type:t}));a.download=n;a.click();}</script></body></html>`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
      a.download = base + '-traceX.html';
      a.click();
    };
  };
  document.head.appendChild(script);
})();