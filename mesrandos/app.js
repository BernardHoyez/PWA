const URL_PROPOSITIONS = "https://script.google.com/macros/s/AKfycbzBeE5r3TkmKgDGk_NimHNDGe4fv5pjMzbNUU0AMfQiPleKJTDSh38T0a6CStQ9SkLR/exec";
const URL_VALIDES = "https://script.google.com/macros/s/AKfycbwSG75du_6FFZxFuGx4_Sfj2u9PLOdOOP38WnMPGqLoc6uqvbpKHTzyKQ1tWORTZesj/exec";

async function chargerDonnees(url) {
  const res = await fetch(url);
  return await res.json();
}

async function envoyerDonnees(url, obj) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if(document.getElementById("randoForm")) initAnimateur();
  if(document.getElementById("tablePres")) initPresident();
  if(document.getElementById("tableMembre")) initMembre();
});

function initAnimateur() {
  const form = document.getElementById("randoForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const rando = {
      date: form.date.value,
      intitule: form.intitule.value,
      difficulte: form.difficulte.value,
      distance: form.distance.value,
      denivele: form.denivele.value,
      points: form.points.value,
      hParking: form.hParking.value,
      hRando: form.hRando.value,
      depart: form.depart.value,
      distanceAR: form.distanceAR.value,
      covoiturage: form.covoiturage.value,
      animateur: form.animateur.value,
      telephone: form.telephone.value
    };
    await envoyerDonnees(URL_PROPOSITIONS, rando);
    document.getElementById("confirmation").innerText = "✅ Proposition envoyée.";
    form.reset();
  });
}

async function initPresident() {
  const data = await chargerDonnees(URL_PROPOSITIONS);
  const table = document.getElementById("tablePres");
  table.innerHTML = "";
  const headers = data[0];
  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  const thVal = document.createElement("th");
  thVal.textContent = "Validation";
  headerRow.appendChild(thVal);
  table.appendChild(headerRow);

  for(let i=1; i<data.length; i++) {
    const tr = document.createElement("tr");
    data[i].forEach(c => {
      const td = document.createElement("td");
      td.textContent = c;
      tr.appendChild(td);
    });
    const btn = document.createElement("button");
    btn.textContent = "Valider";
    btn.onclick = async () => {
      await envoyerDonnees(URL_VALIDES, Object.fromEntries(headers.map((h, idx) => [h, data[i][idx]])));
      document.getElementById("message").innerText = "✅ Randonnée validée et transférée.";
    };
    const tdVal = document.createElement("td");
    tdVal.appendChild(btn);
    tr.appendChild(tdVal);
    table.appendChild(tr);
  }
}

async function initMembre() {
  const data = await chargerDonnees(URL_VALIDES);
  afficherTable(data, "tableMembre");
}

function afficherTable(data, id) {
  const table = document.getElementById(id);
  table.innerHTML = "";
  data.forEach((row,i) => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement(i===0?'th':'td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}
