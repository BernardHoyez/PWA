function generateKML(waypoints, images) {
  let placemarks = "";

  waypoints.forEach((wp, i) => {
    const img = images[i] || "";
    placemarks += `
    <Placemark>
      <name>WP ${String(i + 1).padStart(2, "0")}</name>
      <description><![CDATA[
        ${img ? `<img src="${img}" width="400"/>` : ""}
      ]]></description>
      <Point>
        <coordinates>${wp.lon},${wp.lat},0</coordinates>
      </Point>
    </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
${placemarks}
</Document>
</kml>`;
}
