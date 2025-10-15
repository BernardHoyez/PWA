import WMTS, {optionsFromCapabilities} from 'https://cdn.jsdelivr.net/npm/ol@latest/source/WMTS.js';
import WMTSCapabilities from 'https://cdn.jsdelivr.net/npm/ol@latest/format/WMTSCapabilities.js';
import TileLayer from 'https://cdn.jsdelivr.net/npm/ol@latest/layer/Tile.js';

export async function createIGNLayer() {
  const response = await fetch('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities');
  const text = await response.text();
  const parser = new WMTSCapabilities();
  const result = parser.read(text);
  const options = optionsFromCapabilities(result, {
    layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    matrixSet: 'PM'
  });
  return new TileLayer({ source: new WMTS(options) });
}
