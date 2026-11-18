import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { initStore } from '../src/db/index.js';
import { createApp } from '../src/app.js';

let server;
let base;

before(async () => {
  process.env.NODE_ENV = 'test';
  await initStore();
  server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

const register = (username) =>
  api('/api/auth/register', {
    method: 'POST',
    body: { username, email: `${username}@funzone.test`, password: 'pass1234', avatar: 'rocket' },
  });

test('health endpoint reports the active store', async () => {
  const { status, data } = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(data.ok, true);
  assert.ok(['memory', 'mysql'].includes(data.mode));
});

test('registration validates input and rejects duplicates', async () => {
  const invalid = await api('/api/auth/register', {
    method: 'POST',
    body: { username: 'x', email: 'bad-email', password: '123' },
  });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.data.details.length >= 2);

  await register('api_alice');
  const duplicate = await register('api_alice');
  assert.equal(duplicate.status, 409);
});

test('login returns a JWT and protects private endpoints', async () => {
  const bad = await api('/api/auth/login', {
    method: 'POST',
    body: { identity: 'api_alice', password: 'wrongpass' },
  });
  assert.equal(bad.status, 401);

  const good = await api('/api/auth/login', {
    method: 'POST',
    body: { identity: 'api_alice', password: 'pass1234' },
  });
  assert.equal(good.status, 200);
  assert.ok(good.data.token);
  assert.equal(good.data.user.username, 'api_alice');
  assert.equal(good.data.user.password_hash, undefined);

  const noToken = await api('/api/auth/me');
  assert.equal(noToken.status, 401);

  const me = await api('/api/auth/me', { token: good.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.username, 'api_alice');
});

test('room creation, joining, capacity and leaving work', async () => {
  const alice = await register('api_host');
  const bob = await register('api_guest');
  const charlie = await register('api_third');
  const tokenA = alice.data.token;
  const tokenB = bob.data.token;

  const games = await api('/api/games', { token: tokenA });
  assert.equal(games.data.games.length, 5);

  const created = await api('/api/rooms', {
    method: 'POST',
    token: tokenA,
    body: { gameType: 'tic_tac_toe' },
  });
  assert.equal(created.status, 201);
  assert.match(created.data.room.code, /^[A-Z0-9]{6}$/);
  assert.equal(created.data.players.length, 1);
  const code = created.data.room.code;

  const fetched = await api(`/api/rooms/${code}`, { token: tokenB });
  assert.equal(fetched.status, 200);

  const joined = await api(`/api/rooms/${code}/join`, { method: 'POST', token: tokenB });
  assert.equal(joined.status, 200);
  assert.equal(joined.data.players.length, 2);

  const third = await api(`/api/rooms/${code}/join`, { method: 'POST', token: charlie.data.token });
  assert.equal(third.status, 409, 'Tic Tac Toe rooms hold exactly two players');

  const left = await api(`/api/rooms/${code}/leave`, { method: 'POST', token: tokenB });
  assert.equal(left.status, 200);
  assert.equal(left.data.players.length, 1);
});

test('profile updates, leaderboard and match history endpoints work', async () => {
  const user = await register('api_profile');
  const token = user.data.token;

  const updated = await api('/api/users/me', {
    method: 'PATCH',
    token,
    body: { avatar: 'ninja', avatarColor: 'cyan', bio: 'Speedrunner' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.profile.avatar, 'ninja');

  const board = await api('/api/leaderboard', { token });
  assert.equal(board.status, 200);
  assert.ok(board.data.players.length >= 1);
  assert.equal(board.data.players[0].rank, 1);

  const matches = await api('/api/matches?mine=true', { token });
  assert.equal(matches.status, 200);
  assert.deepEqual(matches.data.matches, []);

  const missing = await api('/api/matches/not-a-real-id', { token });
  assert.equal(missing.status, 404);
});
