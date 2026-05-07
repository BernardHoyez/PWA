let ws = null;

const statusDiv = document.getElementById("status");
const logDiv = document.getElementById("log");

function log(msg)
{
    const time = new Date().toLocaleTimeString();

    logDiv.textContent += `[${time}] ${msg}\n`;

    logDiv.scrollTop = logDiv.scrollHeight;
}

document.getElementById("connectBtn").onclick = () =>
{
    const ip = document.getElementById("ip").value;
    const port = document.getElementById("port").value;

    const url = `ws://${ip}:${port}`;

    log(`Connexion à ${url}`);

    ws = new WebSocket(url);

    ws.onopen = () =>
    {
        statusDiv.textContent = "Connecté";
        statusDiv.style.color = "#00ff88";

        log("WebSocket connecté");
    };

    ws.onclose = () =>
    {
        statusDiv.textContent = "Déconnecté";
        statusDiv.style.color = "#ff4444";

        log("WebSocket fermé");
    };

    ws.onerror = (e) =>
    {
        log("Erreur WebSocket");
    };

    ws.onmessage = (event) =>
    {
        log(`RX : ${event.data}`);
    };
};

document.getElementById("startBtn").onclick = () =>
{
    if(!ws || ws.readyState !== WebSocket.OPEN)
    {
        alert("Non connecté");
        return;
    }

    const data =
    {
        cmd: "focus_bracket",
        shots: parseInt(document.getElementById("shots").value),
        focusStart: parseFloat(document.getElementById("focusStart").value),
        focusStep: parseFloat(document.getElementById("focusStep").value),
        delayMs: parseInt(document.getElementById("delayMs").value)
    };

    const json = JSON.stringify(data);

    ws.send(json);

    log(`TX : ${json}`);
};

if('serviceWorker' in navigator)
{
    navigator.serviceWorker.register('sw.js');
}