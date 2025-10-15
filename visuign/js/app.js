import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {fromLonLat} from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import {createIGNLayer} from './wmts.js';

const view = new View({
  center: fromLonLat([2.3, 46.5]),
  zoom: 13,
  minZoom: 12,
  maxZoom: 18,
});

const map = new Map({ target: 'map', view });

(async () => {
  const orthoLayer = await createIGNLayer();
  map.addLayer(orthoLayer);
})();

const posSource = new VectorSource();
const posLayer = new VectorLayer({ source: posSource });
map.addLayer(posLayer);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}

navigator.geolocation.watchPosition(
  (pos) => {
    const lon = pos.coords.longitude;
    const lat = pos.coords.latitude;
    const feat = new Feature(new Point(fromLonLat([lon, lat])));
    posSource.clear();
    posSource.addFeature(feat);
    view.setCenter(fromLonLat([lon, lat]));
  },
  (err) => console.error(err),
  { enableHighAccuracy: true }
);

document.getElementById('btnCache').addEventListener('click', async () => {
  const pos = posSource.getFeatures()[0];
  if (!pos) return alert('Position non disponible.');
  const [x, y] = pos.getGeometry().getCoordinates();
  await preCacheTiles(x, y, 5000);
  alert('Tuiles mises en cache !');
});

async function preCacheTiles(x, y, rayon) {
  const cache = await caches.open('visuign-tiles');
  const zoomLevels = [12,13,14,15,16,17,18];
  const baseURL = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg';
  for (const z of zoomLevels) {
    const nbTiles = Math.ceil(rayon / (156543.03 / Math.pow(2, z)));
    const xCenter = Math.floor((x + 20037508.34) / (156543.03 / Math.pow(2, z) * 256));
    const yCenter = Math.floor((20037508.34 - y) / (156543.03 / Math.pow(2, z) * 256));
    for (let dx = -nbTiles; dx <= nbTiles; dx++) {
      for (let dy = -nbTiles; dy <= nbTiles; dy++) {
        const url = `${baseURL}&TILEMATRIX=${z}&TILEROW=${yCenter+dy}&TILECOL=${xCenter+dx}`;
        try { await cache.add(url); } catch {}
      }
    }
  }
}
