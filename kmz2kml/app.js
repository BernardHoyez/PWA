const kmzInput = document.getElementById("kmzInput");
const processBtn = document.getElementById("processBtn");
const log = document.getElementById("log");
const editor = document.getElementById("editor");

let zipIn, kmlDoc, placemarks = [];
let imageBlobs = {};

/* ================================
   Chargement du KMZ
================================ */
kmzInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  log.textContent = "Chargement KMZ...\n";
  zipIn = await JSZip.loadAsync(file);

  await loadImages();

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

/* ================================
   Chargement des images du KMZ
   → stockage par NOM DE FICHIER
================================ */
async function loadImages() {
  imageBlobs = {};

  for (const name in zipIn.files) {
    if (name.match(/\.(jpg|jpeg|png)$/i)) {
      const shortName = name.split("/").pop();
      imageBlobs[shortName] = await zipIn.file(name).async("blob");
    }
  }

  log.textContent += `Images trouvées : ${Object.keys(imageBlobs).length}\n`;
}

/* ================================
   Lecture des Placemarks
   → normalisation du href
================================ */
function loadPlacemarks() {
  placemarks = [...kmlDoc.querySelectorAll("Placemark")].map(pm => {
    const nameEl = pm.querySelector("name");
    const descEl = pm.querySelector("description");
    const hrefRaw = pm.querySelector("href")?.textContent || "";
    const imageName = hrefRaw.split("/").pop();

    return {
      pm,
      nameEl,
      descEl,
      name: nameEl?.textContent || "",
      comment: "",
      imageName
    };
  });
}

/* ================================
   Interface avec miniature
================================ */
function buildEditor() {
  editor.innerHTML = "";

  placemarks.forEach((p, i) => {
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #ccc";
    div.style.padding = "0.5rem 0";

    let imgHTML = "<i>pas de photo</i>";

    if (p.imageName && imageBlobs[p.imageName]) {
      const url = URL.createObjectURL(imageBlobs[p.imageName]);
      imgHTML = `
        <a href="${url}" target="_blank">
          <img src="${url}" style="max-width:160px;display:block">
        </a>
      `;
    }

    div.innerHTML = `
      <b>Waypoint ${i + 1}</b><br>
      ${imgHTML}
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

/* ================================
   Génération du KMZ modifié
================================ */
processBtn.addEventListener("click", async () => {
  log.textContent = "Modification du KML...\n";

  placemarks.forEach(p => {
    if (p.nameEl) p.nameEl.textContent = p.name;

    const html = `
<![CDATA[
<b>${p.name}</b><br>
<img src="${p.imageName}" width="240"><br>
<a href="${p.imageName}" target="_blank">Agrandir la photo</a><br>
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
      outZip.file(name, await f
