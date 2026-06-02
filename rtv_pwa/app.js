async function loadStations(){
 const res=await fetch('stations.json');
 const stations=await res.json();
 const container=document.getElementById('stations');

 function render(filter=''){
  container.innerHTML='';
  stations.filter(s=>s.name.toLowerCase().includes(filter.toLowerCase()))
  .forEach(s=>{
   const div=document.createElement('div');
   div.className='station';
   div.innerHTML=`<h3>${s.name}</h3><p>${s.type}</p>
   <button onclick="window.open('${s.url}','_blank')">Ouvrir</button>`;
   container.appendChild(div);
  });
 }
 render();
 document.getElementById('search').addEventListener('input',e=>render(e.target.value));
}
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js');}
loadStations();