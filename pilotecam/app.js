const roleCam = document.getElementById('roleCam');
const rolePC = document.getElementById('rolePC');
const camSection = document.getElementById('cam-section');
const pcSection = document.getElementById('pc-section');
const startCam = document.getElementById('startCam');
const stopCam = document.getElementById('stopCam');
const videoCam = document.getElementById('videoCam');
const joinCam = document.getElementById('joinCam');
const joinPC = document.getElementById('joinPC');
const roomCam = document.getElementById('roomCam');
const roomPC = document.getElementById('roomPC');
const remoteContainer = document.getElementById('remoteContainer');

let localStream, pc, ws;

const SIGNAL_SERVER = "ws://localhost:8080";

function showSection(section) {
  document.getElementById('role-selection').classList.add('hidden');
  section.classList.remove('hidden');
}

roleCam.onclick = () => showSection(camSection);
rolePC.onclick = () => showSection(pcSection);

startCam.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  videoCam.srcObject = localStream;
  startCam.disabled = true;
  stopCam.disabled = false;
};

stopCam.onclick = () => {
  localStream?.getTracks().forEach(t => t.stop());
  videoCam.srcObject = null;
  startCam.disabled = false;
  stopCam.disabled = true;
};

joinCam.onclick = async () => {
  const room = roomCam.value.trim();
  if (!room) return alert("Entrez un code de session");

  ws = new WebSocket(SIGNAL_SERVER);
  ws.onopen = async () => {
    pc = new RTCPeerConnection();
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ room, type: "offer", data: offer }));
  };

  ws.onmessage = async msg => {
    const m = JSON.parse(msg.data);
    if (m.type === "answer" && m.room === room) {
      await pc.setRemoteDescription(m.data);
    }
  };
};

joinPC.onclick = async () => {
  const room = roomPC.value.trim();
  if (!room) return alert("Entrez un code de session");

  ws = new WebSocket(SIGNAL_SERVER);
  ws.onmessage = async msg => {
    const m = JSON.parse(msg.data);
    if (m.type === "offer" && m.room === room) {
      pc = new RTCPeerConnection();
      pc.ontrack = e => {
        const v = document.createElement('video');
        v.autoplay = true;
        v.srcObject = e.streams[0];
        remoteContainer.innerHTML = '';
        remoteContainer.appendChild(v);
      };

      await pc.setRemoteDescription(m.data);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ room, type: "answer", data: answer }));
    }
  };
};