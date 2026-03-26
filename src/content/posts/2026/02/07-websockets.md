---
title: "WebSockets и real-time"
description: "Real-time коммуникация: WebSockets, Socket.io, SSE"
heroImage: "../../../../assets/imgs/2026/02/07-websockets.webp"
pubDate: "2026-02-07"
---

WebSockets для двусторонней real-time связи.

```javascript
// Server
const { Server } = require('socket.io');
const io = new Server(3000);

io.on('connection', (socket) => {
  socket.on('message', (msg) => {
    io.emit('message', msg);
  });
  
  socket.join('room1');
  socket.to('room1').emit('event', 'data');
});

// Client
const socket = io('http://localhost:3000');
socket.emit('message', 'Hello');
socket.on('message', (msg) => console.log(msg));
```