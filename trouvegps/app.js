function toDecimal(coord, ref) {
  let dec = coord[0] + coord[1]/60 + coord[2]/3600;
  return (ref === "S" || ref === "W") ? -dec : dec;
}

function convertCoords(lat, lon) {
  const dec = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  function toDM(coord) {
    const deg = Math.trunc(coord);
    const min = Math.abs((coord - deg) * 60).toFixed(3);
    return `${deg}°${min}`;
  }

  const dm = `${toDM(lat)}${lat>=0?"N":"S"} ${toDM(lon)}${lon>=0?"E":"W"}`;

  function toDMS(coord) {
    const deg = Math.trunc(coord);
    const minFull = Math.abs((coord - deg) * 60);
    const min = Math.trunc(minFull);
    const sec = ((minFull - min) * 60).toFixed(0);
    return `${deg}°${min}'${sec}"`;
  }

  const dms = `${toDMS(lat)}${lat>=0?"N":"S"} ${toDMS(lon)}${lon>=0?"E":"W"}`;
  return { dec, dm, dms };
}

function showCoords(lat, lon) {
  const { dec, dm, dms } = convertCoords(lat, lon);
  document.getElementById("dec").innerText = `Décimal : ${dec}`;
  document.getElementById("dm").innerText = `Minutes : ${dm}`;
  document.getElementById("dms").innerText = `Sexagésimal : ${dms}`;
}

function showMap(lat, lon) {
  if (window.map) {
    window.map.setView([lat, lon], 15);
    if (window.marker) window.map.removeLayer(window.marker);
    window.marker = L.marker([lat, lon]).addTo(window.map);
  } else {
    window.map = L.map("map").setView([lat, lon], 15);
    const layerIGN = L.tileLayer(
      "https://wxs.ign.fr/essentiels/geoportail/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg",
      { maxZoom: 18, attribution: "© IGN France" }
    );
    layerIGN.addTo(window.map);
    window.marker = L.marker([lat, lon]).addTo(window.map);
  }
}

document.getElementById("photoInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  EXIF.getData(file, function() {
    const lat = EXIF.getTag(this, "GPSLatitude");
    const lon = EXIF.getTag(this, "GPSLongitude");
    const latRef = EXIF.getTag(this, "GPSLatitudeRef") || "N";
    const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || "E";

    if (!lat || !lon) {
      alert("⚠️ Cette photo ne contient pas de coordonnées GPS !");
      return;
    }

    const latitude = toDecimal(lat, latRef);
    const longitude = toDecimal(lon, lonRef);

    showMap(latitude, longitude);
    showCoords(latitude, longitude);
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
