async function getPublicIPs() {
  let ipv4 = null, ipv6 = null;

  try {
    const res4 = await fetch('https://api.ipify.org?format=json');
    const data4 = await res4.json();
    ipv4 = data4.ip || null;
    document.getElementById('ipv4').textContent = ipv4 || 'Non détectée';
  } catch {
    document.getElementById('ipv4').textContent = 'Non détectée';
  }

  try {
    const res6 = await fetch('https://api64.ipify.org?format=json');
    const data6 = await res6.json();
    ipv6 = data6.ip || null;
    document.getElementById('ipv6').textContent = ipv6 || 'Non détectée';
  } catch {
    document.getElementById('ipv6').textContent = 'Non détectée';
  }

  const statusEl = document.getElementById('status');

  if (!ipv6) {
    statusEl.textContent = "IPv6 non détectée — connexion probablement IPv4 uniquement.";
  } else if (ipv6 === ipv4) {
    statusEl.textContent = "IPv6 redirigée via IPv4 (NAT64 ou DS-Lite probable).";
  } else if (ipv6.includes(':')) {
    statusEl.textContent = "IPv6 native détectée.";
  } else {
    statusEl.textContent = "IPv6 détectée sous forme simplifiée.";
  }
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
