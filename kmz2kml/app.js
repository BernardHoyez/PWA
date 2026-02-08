const kmzInput = document.getElementById("kmzInput");
const processBtn = document.getElementById("processBtn");
const log = document.getElementById("log");
const editor = document.getElementById("editor");

let zipIn, kmlDoc, placemarks = [];

kmzInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  log.textContent = "Chargement KMZ...\n";
  zipIn = await JSZip.loadAsync(file);

  const kmlName = Object.keys(zipIn.files).find(f => f.endsWith(".kml"));
  if (!kmlName) {
    log.textContent += "❌ KML introuvable\n";
    return;
  }

  const kmlText = await zipIn.file(kmlName).async("text");
  kmlDoc = new DOMParser().parseFromString(kmlText, "text/xml");

  loadPlacemarks();
  buildEditor();

  processBtn.disabled = false;
});

function loadPlacemarks() {
  placemarks = [...kmlDoc.querySelectorAll("Placemark")].map(pm => {
    const nameEl = pm.querySelector("name");
    const descEl = pm.querySelector("description");

    return {
      pm,
      nameEl,
      descEl,
      name: nameEl?.textContent || "",
      comment: ""
    };
  });
}

function buildEditor() {
  editor.innerHTML = "";
  placemarks.forEach((p, i) => {
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #ccc";
    div.style.padding = "0.5rem 0";

    div.innerHTML = `
      <b>Waypoint ${i + 1}</b><br>
      Nom (20 car.)<br>
      <input maxlength="20" value="${p.name}"><br>
      Commentaire (60 car.)<br>
      <input maxlength="60">
    `;

    const inputs = div.querySelectorAll("input");
    inputs[0].oninput = e => p.name = e.target.value;
    inputs[1].oninput = e => p.comment = e.target.value;

    editor.appendChild(div);
  });
}

processBtn.addEventListener("click", async () => {
  log.textContent = "Modification du KML...\n";

  placemarks.forEach(p => {
    if (p.nameEl) p.nameEl.textContent = p.name;

    const html = `
<![CDATA[
<b>${p.name}</b><br>
<img src="${guessImageName(p.pm)}" width="240"><br>
<a href="${guessImageName(p.pm)}" target="_blank">Agrandir la photo</a><br>
<i>${p.comment}</i>
]]>
    `.trim();

    if (p.descEl) {
      p.descEl.textContent = html;
    } else {
      const d = kmlDoc.createElement("description");
      d.textContent = html;
      p.pm.appendChild(d);
    }
  });

  const serializer = new XMLSerializer();
  const newKml = serializer.serializeToString(kmlDoc);

  const outZip = new JSZip();

  for (const name in zipIn.files) {
    const f = zipIn.files[name];
    if (f.dir) continue;

    if (name.endsWith(".kml")) {
      outZip.file(name, newKml);
    } else {
      outZip.file(name, await f.async("arraybuffer"));
    }
  }

  const blob = await outZip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kmz2kml_edited.kmz";
  a.click();

  log.textContent += "KMZ généré.\n";
});

/* --- Heuristique simple photo --- */
function guessImageName(pm) {
  const href = pm.querySelector("href");
  if (href) return href.textContent;
  return "photo.jpg";
}

/* --- Service Worker --- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
