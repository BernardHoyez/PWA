const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const rooms = {};
wss.on('connection', ws => {
  ws.on('message', message => {
    const msg = JSON.parse(message);
    if (!rooms[msg.room]) rooms[msg.room] = [];
    rooms[msg.room].push(ws);
    rooms[msg.room].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });
});
console.log("Serveur de signalisation local actif sur ws://localhost:8080");