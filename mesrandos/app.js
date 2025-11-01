const CSV_TRAVAIL = "https://docs.google.com/spreadsheets/d/1ftWywH6hofE7chL5fGpa3_Yt_DETp5GYdQhEqPVOLnk/export?format=csv";
const CSV_OFFICIEL = "https://docs.google.com/spreadsheets/d/1CkaGPvZKbxUewCqfXyDcYLH77XWGMZY3ts_EyZk2OCo/export?format=csv";

async function chargerCSV(url) {
  const res = await fetch(url);
  const txt = await res.text();
  const lignes = txt.trim().split('\n').map(l => l.split(','));
  return lignes;
}

document.addEventListener("DOMContentLoaded", async () => {
  if(document.getElementById("tableMembre")){
    const data = await chargerCSV(CSV_OFFICIEL);
    afficherTable(data, "tableMembre");
  }
  if(document.getElementById("tablePres")){
    const data = await chargerCSV(CSV_TRAVAIL);
    afficherTable(data, "tablePres");
  }
  const form = document.getElementById("randoForm");
  if(form){
    form.addEventListener("submit", e => {
      e.preventDefault();
      document.getElementById("confirmation").innerText = "✅ Proposition enregistrée localement. (à envoyer au président)";
      form.reset();
    });
  }
});

function afficherTable(data, id){
  const table = document.getElementById(id);
  table.innerHTML = "";
  data.forEach((row,i)=>{
    const tr = document.createElement("tr");
    row.forEach(cell=>{
      const td = document.createElement(i===0?'th':'td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}
