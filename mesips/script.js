async function getPublicIPs() {
  try {
    const ipv4 = await fetch('https://api.ipify.org?format=json').then(r => r.json());
    document.getElementById('ipv4').textContent = ipv4.ip || 'Non détectée';
  } catch { document.getElementById('ipv4').textContent = 'Non détectée'; }
  try {
    const ipv6 = await fetch('https://api64.ipify.org?format=json').then(r => r.json());
    document.getElementById('ipv6').textContent = ipv6.ip || 'Non détectée';
  } catch { document.getElementById('ipv6').textContent = 'Non détectée'; }
}

function getLocalIP() {
  const pc = new RTCPeerConnection({iceServers: []});
  pc.createDataChannel("");
  pc.createOffer().then(offer => pc.setLocalDescription(offer));
  pc.onicecandidate = event => {
    if (!event || !event.candidate) return;
    const parts = event.candidate.candidate.split(" ");
    const addr = parts[4];
    if (addr && !addr.includes(':')) {
      document.getElementById('localip').textContent = addr;
      pc.onicecandidate = null;
      pc.close();
    }
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

getPublicIPs();
getLocalIP();
