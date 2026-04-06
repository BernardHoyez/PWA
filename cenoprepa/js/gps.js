/* gps.js — Module GPS partagé cenoprepa
   Parsing et formatage coordonnées GPS
   Formats : DM (49°38.86N 0°09.26E) et DD (49.6477°N 0.1543°E)
*/

'use strict';

const GPS = (() => {

  /** Parse une chaîne GPS → {lat, lng} ou null */
  function parse(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim().toUpperCase().replace(/['']/g, "'").replace(/\s+/g, ' ');

    // DM : 49°38.86N 0°09.26E ou 49° 38.86 N 0° 09.26 E
    const dm = str.match(
      /(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([NS])\s+(\d+)°\s*(\d+(?:\.\d+)?)['''°]?\s*([EW])/
    );
    if (dm) {
      const lat = (parseFloat(dm[1]) + parseFloat(dm[2]) / 60) * (dm[3] === 'S' ? -1 : 1);
      const lng = (parseFloat(dm[4]) + parseFloat(dm[5]) / 60) * (dm[6] === 'W' ? -1 : 1);
      if (_valid(lat, lng)) return { lat, lng, format: 'DM' };
    }

    // DD : 49.6477°N 0.1543°E ou 49.6477N 0.1543E
    const dd = str.match(
      /(\d+(?:\.\d+)?)°?\s*([NS])\s+(\d+(?:\.\d+)?)°?\s*([EW])/
    );
    if (dd) {
      const lat = parseFloat(dd[1]) * (dd[2] === 'S' ? -1 : 1);
      const lng = parseFloat(dd[3]) * (dd[4] === 'W' ? -1 : 1);
      if (_valid(lat, lng)) return { lat, lng, format: 'DD' };
    }

    return null;
  }

  /** Formate en DM lisible */
  function toDM(lat, lng) {
    const latD = Math.floor(Math.abs(lat));
    const latM = ((Math.abs(lat) - latD) * 60).toFixed(3);
    const lngD = Math.floor(Math.abs(lng));
    const lngM = ((Math.abs(lng) - lngD) * 60).toFixed(3);
    return `${latD}°${latM}${lat >= 0 ? 'N' : 'S'} ${lngD}°${lngM}${lng >= 0 ? 'E' : 'W'}`;
  }

  /** Formate en DD lisible */
  function toDD(lat, lng) {
    return `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`;
  }

  function _valid(lat, lng) {
    return isFinite(lat) && isFinite(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
  }

  /**
   * Attache la validation GPS en temps réel à un <input>.
   * Affiche un badge OK/ERR à droite.
   * Retourne une fonction getCoords() → {lat,lng} | null
   */
  function bindInput(inputEl, statusEl) {
    let coords = null;

    function validate() {
      const val = inputEl.value.trim();
      if (!val) {
        statusEl.className = 'gps-status empty';
        statusEl.textContent = '';
        inputEl.classList.remove('error');
        coords = null;
        return;
      }
      const parsed = parse(val);
      if (parsed) {
        coords = parsed;
        statusEl.className = 'gps-status ok';
        statusEl.textContent = parsed.format + ' ✓';
        inputEl.classList.remove('error');
      } else {
        coords = null;
        statusEl.className = 'gps-status error';
        statusEl.textContent = 'Format ?';
        inputEl.classList.add('error');
      }
    }

    inputEl.addEventListener('input', validate);
    inputEl.addEventListener('blur', validate);

    return {
      getCoords: () => coords,
      validate,
    };
  }

  return { parse, toDM, toDD, bindInput };

})();

window.GPS = GPS;
