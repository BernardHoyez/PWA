import Map from 'https://cdn.jsdelivr.net/npm/ol@latest/Map.js';
import View from 'https://cdn.jsdelivr.net/npm/ol@latest/View.js';
import {fromLonLat} from 'https://cdn.jsdelivr.net/npm/ol@latest/proj.js';
import VectorSource from 'https://cdn.jsdelivr.net/npm/ol@latest/source/Vector.js';
import VectorLayer from 'https://cdn.jsdelivr.net/npm/ol@latest/layer/Vector.js';
import Feature from 'https://cdn.jsdelivr.net/npm/ol@latest/Feature.js';
import Point from 'https://cdn.jsdelivr.net/npm/ol@latest/geom/Point.js';
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
  navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('SW rejeté', err));
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
  const features = posSource.getFeatures();
  if (!features || features.length===0) return alert('Position non disponible.');
  const geom = features[0].getGeometry().getCoordinates();
  // geom is in EPSG:3857 because fromLonLat returns that
  const [x, y] = geom;
  await preCacheTiles(x, y, 5000);
  alert('Tuiles mises en cache !');
});

// helper: convert EPSG:3857 coords to WMTS tile indices (approximation)
// NOTE: This uses WebMercator spherical mercator math for tile calculation
async function preCacheTiles(xMerc, yMerc, rayon) {
  const cache = await caches.open('visuign-tiles');
  const zoomLevels = [12,13,14,15,16,17,18];
  const baseURL = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg';
  for (const z of zoomLevels) {
    // resolution (meters per pixel) at zoom z for WebMercator: initialResolution / 2^z ; initialResolution ~ 156543.03392804097
    const metersPerPixel = 156543.03392804097 / Math.pow(2, z);
    const tileSize = 256;
    const metersPerTile = metersPerPixel * tileSize;
    const nbTiles = Math.ceil(rayon / metersPerTile);
    // convert mercator x,y to tile col/row
    const worldSize = 2 * Math.PI * 6378137; // circumference
    const origin = -worldSize/2;
    const xTile = Math.floor((xMerc - origin) / metersPerTile);
    const yTile = Math.floor((worldSize/2 - yMerc) / metersPerTile);
    for (let dx = -nbTiles; dx <= nbTiles; dx++) {
      for (let dy = -nbTiles; dy <= nbTiles; dy++) {
        const tileCol = xTile + dx;
        const tileRow = yTile + dy;
        const url = `${baseURL}&TILEMATRIX=${z}&TILEROW=${tileRow}&TILECOL=${tileCol}`;
        try { await cache.add(new Request(url, {mode:'no-cors'})); } catch(e){ /* ignore */ }
      }
    }
  }
}
