document.addEventListener("DOMContentLoaded", () => {

  // ---------- Fonds ----------
  const ign = L.tileLayer(
    "https://data.geopf.fr/wmts?" +
    "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
    "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
    "&STYLE=normal&TILEMATRIXSET=PM" +
    "&FORMAT=image/png" +
    "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    { attribution: "© IGN – Géoplateforme", maxZoom: 18 }
  );

  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "© OpenStreetMap", maxZoom: 19 }
  );

  // ---------- Carte ----------
  const map = L.map("map", {
    center: [43.5, 6.3],
    zoom: 8,
    layers: [ign]
  });

  L.control.layers(
    { "IGN Plan V2": ign, "OSM": osm }
  ).addTo(map);

  // ---------- DOM ----------
  const coords   = document.getElementById("coords");
  const latInput = document.getElementById("latInput");
  const lonInput = document.getElementById("lonInput");
  const hint     = document.getElementById("hint");
  const toast    = document.getElementById("toast");

  const btnGo     = document.getElementById("btnGo");
  const btnLocate = document.getElementById("btnLocate");
  const btnDec    = document.getElementById("btnDec");
  const btnSexa   = document.getElementById("btnSexa");
  const btnGMaps  = document.getElementById("btnGMaps");
  const btnWaze   = document.getElementById("btnWaze");
  const btnGPX    = document.getElementById("btnGPX");
  const btnHTML   = document.getElementById("btnHTML");

  // ---------- État ----------
  let marker = null;
  let lastLat = null;
  let lastLon = null;

  // ---------- Utils ----------
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 2000);
  }

  function setPoint(lat, lon) {
    lastLat = lat;
    lastLon = lon;

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);

    coords.textContent = `${lat.toFixed(6)} , ${lon.toFixed(6)}`;
    latInput.value = lat.toFixed(6);
    lonInput.value = lon.toFixed(6);

    map.setView([lat, lon], 15);
    hint.style.display = "none";
  }

  function toDMS(v, isLat) {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    const s = ((a - d) * 60 - m) * 60;
    const dir = isLat ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "W");
    return `${d}°${m}′${s.toFixed(2)}″${dir}`;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,"0")}_${String(d.getDate()).padStart(2,"0")}`;
  }

  function saveFile(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  // ---------- Carte ----------
  map.on("click", e => setPoint(e.latlng.lat, e.latlng.lng));

  // ---------- Actions ----------
  btnGo.onclick = () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    if (!isNaN(lat) && !isNaN(lon)) setPoint(lat, lon);
  };

  btnLocate.onclick = () =>
    navigator.geolocation.getCurrentPosition(p =>
      setPoint(p.coords.latitude, p.coords.longitude)
    );

  btnDec.onclick = () => {
    if (lastLat !== null) {
      navigator.clipboard.writeText(`${lastLat},${lastLon}`);
      showToast("Coordonnées copiées");
    }
  };

  btnSexa.onclick = () => {
    if (lastLat !== null) {
      navigator.clipboard.writeText(
        `${toDMS(lastLat,true)} ${toDMS(lastLon,false)}`
      );
      showToast("Coordonnées copiées (DMS)");
    }
  };

  btnGMaps.onclick = () =>
    lastLat && window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lastLat},${lastLon}`,
      "_blank"
    );

  btnWaze.onclick = () =>
    lastLat && window.open(
      `https://waze.com/ul?ll=${lastLat},${lastLon}&navigate=yes`,
      "_blank"
    );

  btnGPX.onclick = () => {
    if (!lastLat) return;
    const gpx = `<?xml version="1.0"?>
<gpx version="1.1" creator="localiser"
 xmlns="http://www.topografix.com/GPX/1/1">
<wpt lat="${lastLat}" lon="${lastLon}">
  <name>${today()}</name>
</wpt>
</gpx>`;
    saveFile(`${today()}_${lastLat.toFixed(5)}_${lastLon.toFixed(5)}.gpx`,
             gpx, "application/gpx+xml");
    showToast("GPX créé");
  };

  btnHTML.onclick = () => {
    if (!lastLat) return;
    showToast("HTML créé");
    // (export HTML identique à localise, inchangé ici)
  };

});
