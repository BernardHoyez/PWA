// === Gestion GPS ===
async function checkGeoPermission() {
  if (!('permissions' in navigator)) return 'inconnu';
  try {
    const perm = await navigator.permissions.query({ name: 'geolocation' });
    return perm.state;
  } catch {
    return 'inconnu';
  }
}

let latitude, longitude;

document.getElementById('getPosition').addEventListener('click', async () => {
  if (!('geolocation' in navigator)) {
    alert('⛔ Ce navigateur ne supporte pas la géolocalisation.');
    return;
  }
  const permState = await checkGeoPermission();
  if (permState === 'denied') {
    alert('⚠️ Localisation désactivée. Active-la dans les paramètres du navigateur.');
    return;
  }

  document.getElementById('position').textContent = 'Recherche de la position GPS...';

  navigator.geolocation.getCurrentPosition(pos => {
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;
    document.getElementById('position').textContent =
      `Latitude : ${latitude.toFixed(6)}°, Longitude : ${longitude.toFixed(6)}°`;
  }, err => {
    alert('Erreur GPS : ' + err.message);
    document.getElementById('position').textContent = 'Position non obtenue.';
  }, { enableHighAccuracy: true, timeout: 10000 });
});

// === Calcul du midi solaire ===
function jourAnnee(d){ const start = new Date(d.getFullYear(),0,0); return Math.floor((d - start)/(1000*60*60*24)); }
function equationDuTemps(date){ const doy = jourAnnee(date); const B = 2*Math.PI*(doy-81)/365; return 9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B); }
function timezoneMeridianFromOffset(offsetHours){ return offsetHours*15; }
function formatTime(d){ return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}); }

let solarNoonDate = null, monitorInterval = null;
const midiResult = document.getElementById('midi-result');
const startMonitorBtn = document.getElementById('startMonitor');
const monitorStatus = document.getElementById('monitor-status');
const instructions = document.getElementById('instructions');

document.getElementById('calcNoon').addEventListener('click', () => {
  if(latitude===undefined){ alert('Obtiens d\'abord la position GPS.'); return; }
  const now = new Date();
  const tzOffsetMin = -now.getTimezoneOffset();
  const tzOffsetH = tzOffsetMin/60;
  const tzMeridian = timezoneMeridianFromOffset(tzOffsetH);
  const EoT = equationDuTemps(now);
  const timeDiffHours = (longitude - tzMeridian)/15;
  const localSolarNoonHours = 12 - timeDiffHours - (EoT/60);
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const hours = Math.floor(localSolarNoonHours);
  const minutes = Math.floor((localSolarNoonHours - hours)*60);
  const seconds = Math.round(((localSolarNoonHours - hours)*60 - minutes)*60);
  noon.setHours(hours, minutes, seconds, 0);
  solarNoonDate = noon;
  midiResult.innerHTML = `Midi solaire vrai : <strong>${formatTime(solarNoonDate)}</strong><br>
Longitude GPS = ${longitude.toFixed(6)}°, Méridien du fuseau = ${tzMeridian}°<br>
Équation du temps = ${EoT.toFixed(2)} minutes`;
  startMonitorBtn.disabled = false;
  instructions.innerHTML = `<ol>
<li>Plante un piquet vertical au centre du futur cadran.</li>
<li>Au moment affiché du <b>midi solaire vrai</b>, marque l’extrémité de l’ombre.</li>
<li>La ligne entre la base du piquet et la marque = axe Nord–Sud.</li>
<li>Trace la perpendiculaire pour l’axe Est–Ouest.</li>
</ol>`;
});

startMonitorBtn.addEventListener('click', () => {
  if(!solarNoonDate){ alert('Calcule d\'abord le midi solaire.'); return; }
  if(monitorInterval){ clearInterval(monitorInterval); monitorInterval=null; startMonitorBtn.textContent='🔔 Démarrer le suivi'; return; }
  startMonitorBtn.textContent='⏳ Suivi en cours...';
  monitorInterval=setInterval(()=>{
    const now=new Date();
    const delta=(solarNoonDate-now)/1000;
    monitorStatus.textContent=`Temps restant : ${Math.round(delta)} s`;
    if(Math.abs(delta)<=10){
      if(navigator.vibrate) navigator.vibrate([200,100,200]);
      alert('☀️ Midi solaire maintenant ! Marque l’ombre du piquet.');
      clearInterval(monitorInterval); monitorInterval=null;
      startMonitorBtn.textContent='🔔 Démarrer le suivi';
      monitorStatus.textContent='Midi solaire atteint.';
    }
  },1000);
});

// === Cadran analemmatique ===
document.getElementById('calculer').addEventListener('click', () => {
  if(latitude===undefined){ alert('Obtiens d\'abord la position GPS.'); return; }
  const a=parseFloat(document.getElementById('grandAxe').value);
  const rad=Math.PI/180;
  const b=a*Math.sin(latitude*rad);
  const c=Math.sqrt(Math.max(0,a*a-b*b));
  const L=2*a;
  let res=`Latitude : ${latitude.toFixed(6)}°\n`;
  res+=`a=${a.toFixed(2)} m, b=${b.toFixed(2)} m, 2c=${(2*c).toFixed(2)} m, corde=${L.toFixed(2)} m\n\n`;
  res+='Heure | x (m) | y (m) | Angle°\n';
  
  const svg=document.getElementById('cadran-svg');
  svg.innerHTML='';
  const ellipse=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
  ellipse.setAttribute('cx',0); ellipse.setAttribute('cy',0);
  ellipse.setAttribute('rx',a); ellipse.setAttribute('ry',b);
  ellipse.setAttribute('stroke','black'); ellipse.setAttribute('fill','none');
  svg.appendChild(ellipse);

  for(let H=6;H<=18;H++){
    const Ha=15*(H-12)*rad;
    const x=a*Math.sin(Ha);
    const y=b*Math.cos(Ha);
    const ang=(Math.atan2(x,y)/rad+360)%360;
    res+=`${H}h | ${x.toFixed(2)} | ${y.toFixed(2)} | ${ang.toFixed(1)}°\n`;
    const pt=document.createElementNS('http://www.w3.org/2000/svg','circle');
    pt.setAttribute('cx',x); pt.setAttribute('cy',-y);
    pt.setAttribute('r',0.03); pt.setAttribute('fill','red');
    svg.appendChild(pt);
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',x+0.1); txt.setAttribute('y',-y);
    txt.setAttribute('font-size','0.15');
    txt.textContent=H;
    svg.appendChild(txt);
  }
  document.getElementById('resultat').textContent=res;
});

if('serviceWorker' in navigator){navigator.serviceWorker.register('service-worker.js');}
