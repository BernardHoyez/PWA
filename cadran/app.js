// Fonctions utilitaires
function jourAnnee(d) {
  const start = new Date(d.getFullYear(),0,0);
  const diff = d - start;
  const oneDay = 1000*60*60*24;
  return Math.floor(diff/oneDay);
}

// Equation of Time approximation (minutes) - NOAA
function equationDuTemps(date) {
  const doy = jourAnnee(date);
  const B = 2*Math.PI*(doy-81)/365;
  return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B); // en minutes
}

// Convert minutes offset to timezone meridian (degrees)
function timezoneMeridianFromOffset(offsetHours) {
  return offsetHours * 15;
}

// Format time
function formatTime(d) {
  return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

// Variables
let latitude, longitude;
let solarNoonDate = null;
let monitorInterval = null;

// DOM
const posP = document.getElementById('position');
const midiInfo = document.getElementById('midi-info');
const midiResult = document.getElementById('midi-result');
const startMonitorBtn = document.getElementById('startMonitor');
const monitorStatus = document.getElementById('monitor-status');
const instructions = document.getElementById('instructions');

// Récupérer position GPS
document.getElementById('getPosition').addEventListener('click', () => {
  if(!navigator.geolocation) return alert('GPS non disponible dans ce navigateur.');
  navigator.geolocation.getCurrentPosition(p => {
    latitude = p.coords.latitude;
    longitude = p.coords.longitude;
    posP.textContent = `Latitude : ${latitude.toFixed(6)}° | Longitude : ${longitude.toFixed(6)}°`;
    midiInfo.textContent = 'Position acquise — calculez maintenant le midi solaire.';
  }, err => {
    alert('Erreur GPS : ' + err.message);
  }, {enableHighAccuracy:true, maximumAge:60000});
});

// Calcul du midi solaire vrai
document.getElementById('calcNoon').addEventListener('click', () => {
  if(latitude===undefined) return alert('Obtiens d'abord la position GPS.');

  const now = new Date();
  // timezone offset en heures (inclut heure d'été si applicable)
  const tzOffsetMin = -now.getTimezoneOffset(); // minutes, positive si fuseau en avance sur UTC
  const tzOffsetH = tzOffsetMin/60;
  const tzMeridian = timezoneMeridianFromOffset(tzOffsetH);

  const EoT = equationDuTemps(now); // minutes

  // Calcul local du midi solaire (heure locale)
  // Formule : localClockSolarNoon = 12 - (longitude - tzMeridian)/15 - EoT/60
  const timeDiffHours = (longitude - tzMeridian)/15;
  const localSolarNoonHours = 12 - timeDiffHours - (EoT/60);

  // Construire la Date pour ce midi solaire (aujourd'hui)
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const hours = Math.floor(localSolarNoonHours);
  const minutes = Math.floor((localSolarNoonHours - hours)*60);
  const seconds = Math.round(((localSolarNoonHours - hours)*60 - minutes)*60);
  noon.setHours(hours, minutes, seconds, 0);

  solarNoonDate = noon;
  midiResult.innerHTML = `Midi solaire vrai : <strong>${formatTime(solarNoonDate)}</strong><br>
Longitude GPS = ${longitude.toFixed(6)}°, Méridien du fuseau = ${tzMeridian}°<br>
Équation du temps = ${EoT.toFixed(2)} minutes<br>
(Heure locale prise en compte avec l'heure d'été si applicable.)`;

  startMonitorBtn.disabled = false;

  // Instructions for field work
  instructions.innerHTML = `Instructions pour tracer l'axe Nord–Sud au moment du midi solaire vrai :<ol>
<li>Plante un piquet vertical (bien droit) au centre prévu du cadran.</li>
<li>Au moment affiché du <strong>midi solaire</strong>, observe l'ombre du piquet : marque précisément l'extrémité de l'ombre avec un caillou ou un marqueur.</li>
<li>Trace une ligne passant par la base du piquet et par la marque — c'est l'axe Est–Ouest (l'ombre pointe approximativement vers le Nord ou le Sud selon l'heure, mais la ligne joignant la base du piquet et la pointe de l'ombre au midi solaire est Nord–Sud).</li>
<li>Pour être précis : au midi solaire l'ombre est alignée sur l'axe Nord–Sud ; la droite perpendiculaire à l'ombre (passant par la base du piquet) est l'axe Est–Ouest.</li>
<li>Utilise la corde pour tracer ensuite l'ellipse selon les étapes du module 'Cadran analemmatique'.</li>
</ol>`;
});

// Démarrer/arrêter le suivi pour signaler le midi solaire (vibration + alerte)
// Le suivi vérifie toutes les secondes et sonne quand on est dans ±10 secondes du midi solaire.
startMonitorBtn.addEventListener('click', () => {
  if(!solarNoonDate) return alert('Calcule d'abord le midi solaire.');
  if(monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    startMonitorBtn.textContent = '🔔 Démarrer le suivi du midi solaire';
    monitorStatus.textContent = 'Suivi arrêté.';
    return;
  }
  startMonitorBtn.textContent = '⏳ Suivi en cours — cliquer pour arrêter';
  monitorStatus.textContent = 'Suivi actif...';
  monitorInterval = setInterval(() => {
    const now = new Date();
    const delta = (solarNoonDate - now)/1000; // secondes
    const absDelta = Math.abs(delta);
    monitorStatus.textContent = `Temps restant jusqu'au midi solaire : ${Math.round(delta)} s`;
    if(absDelta <= 10) {
      // Notification & vibration
      if(window.navigator && navigator.vibrate) navigator.vibrate([200,100,200]);
      if(window.Notification && Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if(perm === 'granted') new Notification('Midi solaire — Cadran', {body: 'C'est l'heure du passage au méridien. Marque l'ombre du piquet.'});
        });
      } else {
        alert("Midi solaire : marque l'ombre du piquet maintenant !");
      }
      clearInterval(monitorInterval);
      monitorInterval = null;
      startMonitorBtn.textContent = '🔔 Démarrer le suivi du midi solaire';
      monitorStatus.textContent = 'Signalisé — vérifie la marque et trace l'axe Nord–Sud.';
    }
  }, 1000);
});

// SECTION ellipse & positions horaires
document.getElementById('calculer').addEventListener('click', () => {
  if(latitude===undefined) return alert('Obtiens d'abord la position GPS.');
  const a = parseFloat(document.getElementById('grandAxe').value);
  const rad = Math.PI/180;
  const b = a * Math.sin(latitude * rad);
  const c = Math.sqrt(Math.max(0, a*a - b*b));
  const L = 2 * a;

  let resultat = `Latitude : ${latitude.toFixed(6)}°\n`;
  resultat += `Grand axe a = ${a.toFixed(3)} m\nPetit axe b = ${b.toFixed(3)} m\n`;
  resultat += `Distance entre foyers = ${(2*c).toFixed(3)} m\nLongueur corde (approx) = ${L.toFixed(3)} m\n\n`;

  resultat += 'Heures solaires (6h → 18h) :\n';
  resultat += 'Heure | x (m) | y (m) | Angle depuis le Nord (°)\n';
  resultat += '-------------------------------------------------\n';
  for(let H=6; H<=18; H++) {
    const Ha = 15*(H-12) * rad;
    const x = a * Math.sin(Ha); // Est positive
    const y = b * Math.cos(Ha); // Nord positive
    // angle depuis Nord, clockwise, where 0 = Nord, 90 = Est
    const angle = (Math.atan2(x, y) / rad + 360) % 360;
    resultat += `${H.toString().padStart(2,'0')}h  | ${x.toFixed(3)} | ${y.toFixed(3)} | ${angle.toFixed(1)}°\n`;
  }
  document.getElementById('resultat').textContent = resultat;
});

// Enregistrer service worker
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('SW error', err));
}
