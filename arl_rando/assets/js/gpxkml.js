// Fonction pour convertir la trace en GPX
function convertToGPX(track) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="arl_rando" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trace de randonnée</name>
    <trkseg>`;
    track.forEach(point => {
        gpx += `
      <trkpt lat="${point.lat}" lon="${point.lng}">
        <time>${point.time.toISOString()}</time>
      </trkpt>`;
    });
    gpx += `
    </trkseg>
  </trk>
</gpx>`;
    return gpx;
}

// Fonction pour convertir la trace en KML
function convertToKML(track) {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Trace de randonnée</name>
    <Placemark>
      <name>Trace</name>
      <LineString>
        <coordinates>`;
    track.forEach(point => {
        kml += `${point.lng},${point.lat},0 `;
    });
    kml += `
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
    return kml;
}
