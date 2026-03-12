/**
 * exif.js — Minimal EXIF reader
 * Extracts GPS (latitude, longitude) and DateTimeOriginal from JPEG files.
 * No external dependencies.
 */

const ExifReader = (() => {
  // ---- Helpers ----
  function readUint16(view, offset, littleEndian) {
    return view.getUint16(offset, littleEndian);
  }
  function readUint32(view, offset, littleEndian) {
    return view.getUint32(offset, littleEndian);
  }

  function getRational(view, offset, littleEndian) {
    const num = view.getUint32(offset, littleEndian);
    const den = view.getUint32(offset + 4, littleEndian);
    return den === 0 ? 0 : num / den;
  }

  function getString(view, offset, length) {
    let s = '';
    for (let i = 0; i < length; i++) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function findExifOffset(view) {
    // JPEG starts FF D8
    if (view.getUint16(0) !== 0xFFD8) return -1;
    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      offset += 2;
      if (marker === 0xFFE1) { // APP1 = EXIF
        return offset + 2; // skip length field
      }
      if ((marker & 0xFF00) !== 0xFF00) break; // not a marker
      const segLen = view.getUint16(offset);
      offset += segLen;
    }
    return -1;
  }

  function parseTIFF(view, tiffStart) {
    const byteOrder = view.getUint16(tiffStart);
    const le = byteOrder === 0x4949; // 'II' = little-endian

    const ifd0Offset = tiffStart + readUint32(view, tiffStart + 4, le);
    const tags = readIFD(view, ifd0Offset, tiffStart, le);
    return tags;
  }

  function readIFD(view, ifdOffset, tiffStart, le) {
    const result = {};
    const count = readUint16(view, ifdOffset, le);
    let off = ifdOffset + 2;

    for (let i = 0; i < count; i++) {
      const tag = readUint16(view, off, le);
      const type = readUint16(view, off + 2, le);
      const num = readUint32(view, off + 4, le);
      const valOff = off + 8;
      result[tag] = { type, count: num, valOff, tiffStart, le };
      off += 12;
    }
    return result;
  }

  function getTagValue(view, entry) {
    const { type, count, valOff, tiffStart, le } = entry;
    // If value > 4 bytes, valOff holds offset from TIFF start
    const dataOffset = (type === 5 || type === 10 || (type === 2 && count > 4) || (type === 4 && count > 1))
      ? tiffStart + view.getUint32(valOff, le)
      : valOff;

    switch (type) {
      case 1: // BYTE
        return view.getUint8(dataOffset);
      case 2: // ASCII
        return getString(view, dataOffset, count);
      case 3: // SHORT
        return view.getUint16(dataOffset, le);
      case 4: // LONG
        return view.getUint32(dataOffset, le);
      case 5: { // RATIONAL
        const vals = [];
        for (let i = 0; i < count; i++) {
          vals.push(getRational(view, dataOffset + i * 8, le));
        }
        return vals.length === 1 ? vals[0] : vals;
      }
      default:
        return null;
    }
  }

  // ---- GPS Decoding ----
  function dmsToDecimal(dms) {
    if (!Array.isArray(dms) || dms.length < 3) return null;
    return dms[0] + dms[1] / 60 + dms[2] / 3600;
  }

  // Convert decimal degrees → "DD°MM.MM'[N/S/E/W]"
  function decimalToDMS(decimal, isLat) {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minDec = (abs - deg) * 60;
    const dir = isLat
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    return `${String(deg).padStart(2, '0')}°${minDec.toFixed(2).padStart(5, '0')}'${dir}`;
  }

  // ---- Main parse function ----
  async function parse(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;
          const view = new DataView(buffer);
          const exifStart = findExifOffset(view);
          if (exifStart < 0) return resolve(null);

          // Check "Exif\0\0" header
          const header = getString(view, exifStart, 4);
          if (header !== 'Exif') return resolve(null);

          const tiffStart = exifStart + 6;
          const ifdTags = parseTIFF(view, tiffStart);

          // ExifIFD offset = tag 0x8769
          let gpsData = null;
          let dateStr = null;

          // Read DateTimeOriginal from ExifIFD (tag 0x9003) or DateTime from IFD0 (tag 0x0132)
          if (ifdTags[0x8769]) {
            const exifIFDOffset = tiffStart + getTagValue(view, ifdTags[0x8769]);
            const exifTags = readIFD(view, exifIFDOffset, tiffStart, view.getUint16(tiffStart) === 0x4949);
            if (exifTags[0x9003]) {
              dateStr = getTagValue(view, exifTags[0x9003]);
            }
          }
          // Fallback to DateTime
          if (!dateStr && ifdTags[0x0132]) {
            dateStr = getTagValue(view, ifdTags[0x0132]);
          }

          // GPS IFD offset = tag 0x8825
          if (ifdTags[0x8825]) {
            const le = view.getUint16(tiffStart) === 0x4949;
            const gpsIFDOffset = tiffStart + getTagValue(view, ifdTags[0x8825]);
            const gpsTags = readIFD(view, gpsIFDOffset, tiffStart, le);

            const latRef = gpsTags[0x0001] ? getTagValue(view, gpsTags[0x0001]) : 'N';
            const latVal = gpsTags[0x0002] ? getTagValue(view, gpsTags[0x0002]) : null;
            const lonRef = gpsTags[0x0003] ? getTagValue(view, gpsTags[0x0003]) : 'E';
            const lonVal = gpsTags[0x0004] ? getTagValue(view, gpsTags[0x0004]) : null;

            if (latVal && lonVal) {
              let lat = dmsToDecimal(Array.isArray(latVal) ? latVal : [latVal]);
              let lon = dmsToDecimal(Array.isArray(lonVal) ? lonVal : [lonVal]);
              if (lat !== null && lon !== null) {
                if (latRef && latRef.trim() === 'S') lat = -lat;
                if (lonRef && lonRef.trim() === 'W') lon = -lon;
                gpsData = { lat, lon };
              }
            }
          }

          if (!gpsData && !dateStr) return resolve(null);

          // Format date: "YYYY:MM:DD HH:MM:SS" → "YYYY/MM/DD"
          let formattedDate = null;
          if (dateStr) {
            const m = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})/);
            if (m) formattedDate = `${m[1]}/${m[2]}/${m[3]}`;
          }

          // Format coords
          let latStr = null, lonStr = null;
          if (gpsData) {
            latStr = decimalToDMS(gpsData.lat, true);
            lonStr = decimalToDMS(gpsData.lon, false);
          }

          resolve({
            lat: gpsData ? gpsData.lat : null,
            lon: gpsData ? gpsData.lon : null,
            latStr,
            lonStr,
            date: formattedDate,
            tag: buildTag(latStr, lonStr, formattedDate),
          });
        } catch (err) {
          console.warn('EXIF parse error:', err);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  }

  function buildTag(latStr, lonStr, date) {
    const parts = [];
    if (latStr && lonStr) parts.push(`${latStr} ${lonStr}`);
    if (date) parts.push(date);
    return parts.join(' ');
  }

  return { parse };
})();
