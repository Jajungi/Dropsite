/**
 * Drop 배드민턴 — 개발용 동기화 서버 (REST + WebSocket)
 * 여러 기기·브라우저가 같은 코트/프로필 상태를 공유합니다.
 *
 * 실행: npm run server
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const DATA_FILE = path.join(__dirname, 'data.json');

const defaultPayload = () => ({
  appState: null,
  courts: null,
  rooms: null,
  updatedAt: 0,
});

function readPayload() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultPayload();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultPayload(), ...parsed };
  } catch {
    return defaultPayload();
  }
}

function writePayload(payload) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(data);
}

function broadcast(wss, message) {
  const raw = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(raw);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, updatedAt: readPayload().updatedAt });
    return;
  }

  if (url.pathname === '/api/sync' && req.method === 'GET') {
    sendJson(res, 200, readPayload());
    return;
  }

  if (url.pathname === '/api/sync' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      const current = readPayload();
      const next = {
        appState: body.appState ?? current.appState,
        courts: body.courts ?? current.courts,
        rooms: body.rooms ?? current.rooms,
        updatedAt: body.updatedAt ?? Date.now(),
      };
      writePayload(next);
      broadcast(wss, { type: 'sync-updated', updatedAt: next.updatedAt });
      sendJson(res, 200, { ok: true, updatedAt: next.updatedAt });
    } catch {
      sendJson(res, 400, { ok: false, message: 'Invalid JSON body' });
    }
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'hello', updatedAt: readPayload().updatedAt }));
});

server.listen(PORT, () => {
  console.log(`[badmin-sync] http://localhost:${PORT}  ws://localhost:${PORT}/ws`);
});
