"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const rooms = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, body) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    response.end(body);
  });
});

server.on("upgrade", (request, socket) => {
  if ((request.headers.upgrade || "").toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash("sha1")
    .update(`${request.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    ""
  ].join("\r\n"));
  const client = { socket, room: "", player: 0, host: false, buffer: Buffer.alloc(0) };
  socket.on("data", (chunk) => readFrames(client, chunk));
  socket.on("close", () => removeClient(client));
  socket.on("error", () => removeClient(client));
});

function readFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const second = client.buffer[1];
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (client.buffer.length < 4) return;
      length = client.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (client.buffer.length < 10) return;
      length = Number(client.buffer.readBigUInt64BE(2));
      offset = 10;
    }
    const masked = Boolean(second & 0x80);
    const maskOffset = masked ? 4 : 0;
    if (client.buffer.length < offset + maskOffset + length) return;
    const opcode = client.buffer[0] & 0x0f;
    const mask = masked ? client.buffer.subarray(offset, offset + 4) : null;
    const data = client.buffer.subarray(offset + maskOffset, offset + maskOffset + length);
    client.buffer = client.buffer.subarray(offset + maskOffset + length);
    if (opcode === 8) {
      client.socket.end();
      return;
    }
    if (opcode !== 1) continue;
    const payload = Buffer.from(data);
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    handleMessage(client, JSON.parse(payload.toString("utf8")));
  }
}

function handleMessage(client, message) {
  if (message.type === "create") {
    const room = makeRoom();
    client.room = room;
    client.player = 0;
    client.host = true;
    rooms.set(room, [client]);
    send(client, { type: "created", room, player: 0, host: true });
    return;
  }
  if (message.type === "join") {
    const room = String(message.room || "").trim().toUpperCase();
    const clients = rooms.get(room);
    if (!clients || clients.length >= 6) {
      send(client, { type: "error", message: "Room unavailable" });
      return;
    }
    client.room = room;
    client.player = clients.length;
    clients.push(client);
    send(client, { type: "joined", room, player: client.player, host: false });
    const host = clients.find((item) => item.host);
    if (host) send(host, { type: "peer", count: clients.length });
    return;
  }
  const clients = rooms.get(client.room);
  if (!clients) return;
  if (message.type === "input") {
    const host = clients.find((item) => item.host);
    if (host) send(host, { type: "input", player: client.player, input: message.input });
    return;
  }
  if (message.type === "snapshot" && client.host) {
    for (const other of clients) if (other !== client) send(other, message);
  }
}

function send(client, message) {
  if (client.socket.destroyed) return;
  const payload = Buffer.from(JSON.stringify(message));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  client.socket.write(Buffer.concat([header, payload]));
}

function removeClient(client) {
  const clients = rooms.get(client.room);
  if (!clients) return;
  const kept = clients.filter((item) => item !== client);
  if (!kept.length || client.host) {
    rooms.delete(client.room);
    for (const other of kept) {
      send(other, { type: "error", message: "Host left" });
      other.socket.end();
    }
    return;
  }
  rooms.set(client.room, kept);
  kept.forEach((item, index) => { item.player = index; });
  const host = kept.find((item) => item.host);
  if (host) send(host, { type: "peer", count: kept.length });
}

function makeRoom() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let room = "";
  do {
    room = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(room));
  return room;
}

server.listen(PORT, () => {
  console.log(`Modern Space War listening on http://localhost:${PORT}`);
});
