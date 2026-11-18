import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { io as socketClient } from 'socket.io-client';

import { initStore } from '../src/db/index.js';
import { createApp } from '../src/app.js';
import { socketAuth } from '../src/middleware/auth.js';
import { setIo, startGameLoop } from '../src/socket/roomManager.js';
import { registerSocketHandlers } from '../src/socket/index.js';

let server;
let base;
let sockets = [];

before(async () => {
  process.env.NODE_ENV = 'test';
  await initStore();
  server = http.createServer(createApp());
  const io = new SocketServer(server, { cors: { origin: '*' } });
  io.use(socketAuth);
  setIo(io);
  registerSocketHandlers(io);
  startGameLoop();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  await new Promise((resolve) => server.close(resolve));
});

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

async function register(name) {
  return api('/api/auth/register', {
    method: 'POST',
    body: { username: name, email: `${name}@socket.test`, password: 'pass1234' },
  });
}

function track(socket) {
  const state = { room: null, errors: [], ended: null, events: [], notifications: [] };
  socket.on('room:state', (payload) => { state.room = payload; });
  socket.on('game:ended', (payload) => { state.ended = payload; });
  socket.on('notification', (payload) => state.notifications.push(payload.message));
  socket.on('room:error', (payload) => state.errors.push(payload.message));
  socket.on('game:error', (payload) => state.errors.push(payload.message));
  state.wait = async (predicate, timeoutMs = 8000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (predicate(state)) return true;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for socket condition. Last state: ${JSON.stringify({ status: state.room?.status, errors: state.errors })}`);
  };
  return state;
}

function connect(token) {
  const socket = socketClient(base, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  return socket;
}

test('two socket clients create, ready up, play and persist a Tic Tac Toe match', async () => {
  const alice = await register('sock_alice');
  const bob = await register('sock_bob');

  const roomData = await api('/api/rooms', {
    method: 'POST',
    token: alice.token,
    body: { gameType: 'tic_tac_toe' },
  });
  const code = roomData.room.code;
  await api(`/api/rooms/${code}/join`, { method: 'POST', token: bob.token });

  const socketA = connect(alice.token);
  const socketB = connect(bob.token);
  const viewA = track(socketA);
  const viewB = track(socketB);
  await Promise.all([
    new Promise((resolve) => socketA.on('connect', resolve)),
    new Promise((resolve) => socketB.on('connect', resolve)),
  ]);

  socketA.emit('room:join', { code });
  socketB.emit('room:join', { code });
  await viewA.wait((s) => s.room?.players?.length === 2);
  await viewB.wait((s) => s.room?.players?.length === 2);

  // Unauthorized clients are rejected at socket level.
  const stranger = await register('sock_stranger');
  const socketC = connect(stranger.token);
  const viewC = track(socketC);
  await new Promise((resolve) => socketC.on('connect', resolve));
  socketC.emit('room:join', { code });
  await viewC.wait((s) => s.errors.length > 0);
  assert.match(viewC.errors[0], /Join the room with its code/);
  socketC.disconnect();

  socketA.emit('player:ready', { ready: true });
  socketB.emit('player:ready', { ready: true });
  await viewA.wait((s) => s.room?.players?.every((p) => p.ready));

  socketB.emit('room:start'); // non-host cannot start
  await viewB.wait((s) => s.notifications.some((m) => /Only the room host/.test(m)));
  assert.notEqual(viewA.room?.status, 'playing');

  socketA.emit('room:start');
  await viewA.wait((s) => s.room?.status === 'playing');
  assert.equal(viewA.room.gameState.turn, alice.user.id);

  // Wrong turn is rejected by the server.
  socketB.emit('game:action', { action: { type: 'move', cell: 0 } });
  await viewB.wait((s) => s.errors.some((e) => /not your turn/i.test(e)));

  let expectedMoves = 1;
  for (const [socket, cell] of [
    [socketA, 0], [socketB, 3], [socketA, 1], [socketB, 4], [socketA, 2],
  ]) {
    socket.emit('game:action', { action: { type: 'move', cell } });
    await viewA.wait((s) => s.room?.gameState?.moveCount === expectedMoves);
    expectedMoves += 1;
  }
  await viewA.wait((s) => Boolean(s.ended));

  assert.equal(viewA.ended.winner.id, alice.user.id);
  assert.equal(viewA.ended.scores[alice.user.id], 3);
  assert.equal(viewB.ended.isDraw, false);

  const history = await api('/api/matches?mine=true', { token: alice.token });
  assert.equal(history.matches.length, 1);
  assert.equal(history.matches[0].winner_id, alice.user.id);
  assert.equal(history.matches[0].players.length, 2);

  const board = await api('/api/leaderboard', { token: alice.token });
  assert.ok(board.players.find((p) => p.user_id === alice.user.id).wins >= 1);

  socketA.emit('room:rematch');
  await viewA.wait((s) => s.room?.status === 'waiting' && s.room.gameState === null);
});
