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
const sockets = [];

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
    body: { username: name, email: `${name}@games.socket.test`, password: 'pass1234' },
  });
}

function track(socket) {
  const state = { room: null, errors: [], ended: null };
  socket.on('room:state', (payload) => { state.room = payload; });
  socket.on('game:ended', (payload) => { state.ended = payload; });
  socket.on('game:error', ({ message }) => state.errors.push(message));
  socket.on('room:error', ({ message }) => state.errors.push(message));
  state.wait = async (predicate, timeoutMs = 8000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (predicate(state)) return true;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out. Last state: ${JSON.stringify({ status: state.room?.status, game: state.room?.gameState?.phase, errors: state.errors })}`);
  };
  return state;
}

function connect(token) {
  const socket = socketClient(base, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  return socket;
}

async function setup(gameType, prefix) {
  const alice = await register(`${prefix}_a`);
  const bob = await register(`${prefix}_b`);
  const created = await api('/api/rooms', { method: 'POST', token: alice.token, body: { gameType } });
  assert.equal(created.room.game_type, gameType);
  const code = created.room.code;
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
  socketA.emit('player:ready', { ready: true });
  socketB.emit('player:ready', { ready: true });
  await viewA.wait((s) => s.room?.players?.every((p) => p.ready));
  socketA.emit('room:start');
  await viewA.wait((s) => s.room?.status === 'playing' && Boolean(s.room.gameState));
  return { alice, bob, code, socketA, socketB, viewA, viewB };
}

test('Rock Paper Scissors: server resolves five rounds and saves the match', async () => {
  const { alice, socketA, socketB, viewA, viewB } = await setup('rock_paper_scissors', 'rps');

  for (let round = 1; round <= 5; round += 1) {
    await viewA.wait((s) => s.room?.gameState?.phase === 'choosing' && s.room.gameState.round === round, 7000);
    socketA.emit('game:action', { action: { type: 'choice', choice: 'rock' } });
    socketB.emit('game:action', { action: { type: 'choice', choice: 'scissors' } });
    if (round < 5) {
      await viewA.wait((s) => s.room?.gameState?.phase === 'reveal');
      await viewA.wait((s) => s.room?.gameState?.phase === 'choosing' && s.room.gameState.round === round + 1, 7000);
    }
  }

  await viewA.wait((s) => Boolean(s.ended));
  assert.equal(viewA.ended.winner.id, alice.user.id);
  assert.equal(viewA.ended.scores[alice.user.id], 5);
  assert.equal(viewA.ended.reason, 'rounds-complete');
  assert.equal(viewB.ended.isDraw, false);
  const history = await api('/api/matches?mine=true', { token: alice.token });
  assert.equal(history.matches[0].game_type, 'rock_paper_scissors');
});

test('Connect Four: gravity, turn order and a vertical win are authoritative', async () => {
  const { alice, socketA, socketB, viewA, viewB } = await setup('connect_four', 'c4');

  socketB.emit('game:action', { action: { type: 'drop', column: 0 } });
  await viewB.wait((s) => s.errors.some((e) => /not your turn/i.test(e)));

  for (const [socket, column, count] of [
    [socketA, 0, 1], [socketB, 1, 2], [socketA, 0, 3], [socketB, 1, 4],
    [socketA, 0, 5], [socketB, 2, 6], [socketA, 0, 7],
  ]) {
    socket.emit('game:action', { action: { type: 'drop', column } });
    await viewA.wait((s) => s.room?.gameState?.columns?.flat().length === count);
  }

  await viewA.wait((s) => Boolean(s.ended));
  assert.equal(viewA.ended.winner.id, alice.user.id);
  assert.equal(viewA.ended.scores[alice.user.id], 3);
  assert.equal(viewA.ended.reason, 'connect-four');
  assert.deepEqual(viewA.ended.scores, { [alice.user.id]: 3, [viewA.room.players.find((p) => p.id !== alice.user.id).id]: 1 });
});

test('Memory Match: hidden symbols, turn order and flips are server-authoritative', async () => {
  const { socketA, socketB, viewA, viewB } = await setup('memory_match', 'mem');

  assert.equal(viewA.room.gameState.deck.length, 16);
  assert.ok(viewA.room.gameState.deck.every((card) => card.symbol === null), 'face-down cards must be hidden');

  socketB.emit('game:action', { action: { type: 'flip', index: 0 } });
  await viewB.wait((s) => s.errors.some((e) => /not your turn/i.test(e)));

  socketA.emit('game:action', { action: { type: 'flip', index: 0 } });
  await viewA.wait((s) => s.room?.gameState?.flips === 1);
  assert.ok(viewA.room.gameState.deck.some((card) => card.symbol !== null), 'flipped card becomes visible');

  socketA.emit('game:action', { action: { type: 'flip', index: 0 } });
  await viewA.wait((s) => s.errors.some((e) => /already face up/i.test(e)));

  socketA.emit('game:action', { action: { type: 'flip', index: 1 } });
  await viewA.wait((s) => s.room?.gameState?.flips === 2);
  assert.ok(viewA.room.gameState.lastFlip);
});

test('Quick Tap: hit and miss scoring is calculated on the server', async () => {
  const { alice, bob, socketA, socketB, viewA, viewB } = await setup('quick_tap', 'tap');
  const target = viewA.room.gameState.target.cell;

  socketA.emit('game:action', { action: { type: 'tap', cell: target } });
  await viewA.wait((s) => s.room?.gameState?.scores?.[alice.user.id] > 0);
  assert.equal(viewA.room.gameState.hits[alice.user.id], 1);
  assert.ok(viewA.room.gameState.target.id > 1, 'a new target spawned after the hit');

  socketB.emit('game:action', { action: { type: 'tap', cell: (viewA.room.gameState.target.cell + 1) % 25 } });
  await viewB.wait((s) => s.room?.gameState?.misses?.[bob.user.id] >= 1);
  assert.equal(viewB.room.gameState.scores[bob.user.id], 0);
  assert.equal(viewA.room.gameState.hits[bob.user.id], 0, 'a miss never counts as a hit');
});
