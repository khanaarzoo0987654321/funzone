/**
 * Authoritative multiplayer room runtime.
 *
 * The database stores accounts, rooms and finished matches. Live game state
 * lives only on the server: clients send *intents*, never scores or winners.
 */
import { getStore } from '../db/index.js';
import { getEngine } from '../games/index.js';
import { getGame } from '../games/catalog.js';
import { checkAchievements } from '../services/achievements.js';

const GRACE_MS = 15_000;
const live = new Map(); // code -> runtime
let io = null;

export const setIo = (server) => {
  io = server;
};

function playerDto(p) {
  return {
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    avatar_color: p.avatar_color,
    ready: p.ready,
    connected: p.connected,
    isHost: p.isHost,
  };
}

async function syncFromDb(rt) {
  const store = getStore();
  const [room, rows] = await Promise.all([
    store.getRoomByCode(rt.code),
    store.listRoomPlayers(rt.roomId),
  ]);
  if (!room) return false;
  rt.hostId = room.host_id;
  rt.maxPlayers = room.max_players;

  const ids = new Set(rows.map((r) => r.user_id));
  for (const id of [...rt.players.keys()]) if (!ids.has(id)) rt.players.delete(id);

  for (const row of rows) {
    const existing = rt.players.get(row.user_id);
    if (existing) {
      existing.ready = Boolean(row.is_ready);
      existing.isHost = Boolean(row.is_host);
      existing.avatar = row.avatar;
      existing.avatar_color = row.avatar_color;
      existing.username = row.username;
    } else {
      rt.players.set(row.user_id, {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
        avatar_color: row.avatar_color,
        ready: Boolean(row.is_ready),
        isHost: Boolean(row.is_host),
        connected: false,
        socketIds: new Set(),
      });
    }
  }
  return true;
}

async function ensureRuntime(code) {
  if (live.has(code)) return live.get(code);
  const store = getStore();
  const room = await store.getRoomByCode(code);
  if (!room) return null;

  const rt = {
    code: room.code,
    roomId: room.id,
    gameType: room.game_type,
    status: room.status,
    hostId: room.host_id,
    maxPlayers: room.max_players,
    players: new Map(),
    engine: null,
    state: null,
    matchId: null,
    startedAt: null,
    chat: [],
    grace: new Map(),
    lastTargetId: null,
  };

  // A room left "playing" by a server restart cannot be resumed safely.
  if (rt.status === 'playing') {
    rt.status = 'waiting';
    await store.updateRoom(room.id, { status: 'waiting' });
  }

  live.set(rt.code, rt);
  await syncFromDb(rt);
  return rt;
}

function viewFor(rt, userId) {
  return {
    code: rt.code,
    gameType: rt.gameType,
    status: rt.status,
    hostId: rt.hostId,
    maxPlayers: rt.maxPlayers,
    minPlayers: getGame(rt.gameType)?.minPlayers || 2,
    players: [...rt.players.values()].map(playerDto),
    gameState: rt.state ? rt.engine.view(rt.state, userId) : null,
    matchId: rt.matchId,
    deadline: rt.state?.deadline || null,
    serverNow: Date.now(),
    chat: rt.chat.slice(-25),
  };
}

export function broadcast(rt) {
  if (!io || !rt) return;
  for (const player of rt.players.values()) {
    for (const socketId of player.socketIds) {
      io.to(socketId).emit('room:state', viewFor(rt, player.id));
    }
  }
}

export async function notifyRoomUpdate(code) {
  const rt = live.get(code);
  if (!rt) return;
  await syncFromDb(rt);
  broadcast(rt);
}

function notice(rt, message, type = 'info') {
  if (io) io.to(rt.code).emit('notification', { type, message });
}

export async function joinSocket(socket, code, user) {
  const normalized = String(code || '').toUpperCase().trim();
  const rt = await ensureRuntime(normalized);
  if (!rt) {
    socket.emit('room:error', { message: 'That room no longer exists.' });
    return null;
  }

  const store = getStore();
  const membership = await store.getRoomPlayer(rt.roomId, user.id);
  if (!membership) {
    socket.emit('room:error', { message: 'Join the room with its code before entering.' });
    return null;
  }

  if (socket.data.roomCode && socket.data.roomCode !== rt.code) leaveSocket(socket);

  await syncFromDb(rt);
  const player = rt.players.get(user.id);
  if (!player) {
    socket.emit('room:error', { message: 'You are no longer a member of this room.' });
    return null;
  }

  const timer = rt.grace.get(user.id);
  if (timer) {
    clearTimeout(timer);
    rt.grace.delete(user.id);
  }

  player.socketIds.add(socket.id);
  player.connected = true;
  socket.join(rt.code);
  socket.data.roomCode = rt.code;

  socket.emit('room:joined', { code: rt.code });
  broadcast(rt);
  return rt;
}

export function leaveSocket(socket) {
  const code = socket.data.roomCode;
  socket.data.roomCode = null;
  if (!code) return;
  const rt = live.get(code);
  if (!rt) {
    socket.leave(code);
    return;
  }

  const player = [...rt.players.values()].find((p) => p.socketIds.has(socket.id));
  if (player) {
    player.socketIds.delete(socket.id);
    if (player.socketIds.size === 0) {
      player.connected = false;
      scheduleGrace(rt, player.id);
    }
  }
  socket.leave(code);
  broadcast(rt);
}

function scheduleGrace(rt, userId) {
  if (rt.grace.has(userId)) return;
  const timer = setTimeout(async () => {
    rt.grace.delete(userId);
    const player = rt.players.get(userId);
    if (!player || player.connected) return;
    await handlePlayerGone(rt, userId);
  }, GRACE_MS);
  timer.unref?.();
  rt.grace.set(userId, timer);
}

async function handlePlayerGone(rt, userId) {
  const store = getStore();
  const player = rt.players.get(userId);
  if (!player) return;

  if (rt.status === 'playing' && rt.state) {
    const others = [...rt.players.keys()].filter((id) => id !== userId);
    for (const id of others) rt.state.scores[id] = rt.state.scores[id] || 0;
    rt.state.scores[userId] = 0;
    await endGame(rt, {
      winnerIds: others.length === 1 ? others : [],
      isDraw: others.length !== 1,
      reason: 'player-disconnected',
    });
    return;
  }

  if (rt.hostId === userId) {
    const next = [...rt.players.values()].find((p) => p.id !== userId);
    if (next) await store.transferHost(rt.roomId, next.id);
  }
  await store.setPlayerReady(rt.roomId, userId, false);
  await syncFromDb(rt);
  notice(rt, `${player.username} left the room.`, 'warning');
  broadcast(rt);
}

export async function toggleReady(rt, userId, ready) {
  if (!rt || rt.status !== 'waiting') return;
  const store = getStore();
  await store.setPlayerReady(rt.roomId, userId, Boolean(ready));
  await syncFromDb(rt);
  broadcast(rt);
}

export async function startGame(rt, userId) {
  if (!rt || rt.status !== 'waiting') return;
  if (rt.hostId !== userId) {
    notice(rt, 'Only the room host can start the game.', 'warning');
    return;
  }
  await syncFromDb(rt);
  const players = [...rt.players.values()];
  const game = getGame(rt.gameType);
  if (players.length < game.minPlayers) {
    notice(rt, `You need at least ${game.minPlayers} players to start.`, 'warning');
    return;
  }
  if (players.some((p) => !p.ready || !p.connected)) {
    notice(rt, 'Everyone must be online and ready to start.', 'warning');
    return;
  }
  if (players.length > game.maxPlayers) {
    notice(rt, 'Too many players in this room.', 'warning');
    return;
  }

  const store = getStore();
  rt.engine = getEngine(rt.gameType);
  rt.state = rt.engine.create(players.map(playerDto));
  rt.matchId = (await store.createMatch({ roomId: rt.roomId, gameType: rt.gameType })).id;
  rt.startedAt = Date.now();
  rt.status = 'playing';
  rt.lastTargetId = null;
  await store.updateRoom(rt.roomId, { status: 'playing' });
  notice(rt, 'Game on! Good luck, players.', 'success');
  broadcast(rt);
}

export async function handleAction(rt, userId, action, socket) {
  if (!rt || rt.status !== 'playing' || !rt.engine) {
    socket?.emit('game:error', { message: 'No active game is running.' });
    return;
  }
  if (!rt.players.has(userId)) {
    socket?.emit('game:error', { message: 'You are not part of this match.' });
    return;
  }
  const outcome = rt.engine.apply(rt.state, action, userId);
  if (!outcome.ok) {
    socket?.emit('game:error', { message: outcome.error });
    return;
  }
  if (outcome.events?.length) notice(rt, outcome.events.at(-1), 'info');
  broadcast(rt);
  if (rt.state.status === 'finished') await endGame(rt);
}

/** Persist a validated result. Clients can never submit scores directly. */
export async function endGame(rt, override = null) {
  if (!rt || rt.status === 'finished' || !rt.state) return;
  const store = getStore();
  const result = override ? { scores: rt.state.scores, winnerIds: override.winnerIds, isDraw: override.isDraw, summary: override.reason } : rt.engine.result(rt.state);
  if (override) rt.state.reason = override.reason;

  const scores = {};
  for (const id of rt.players.keys()) scores[id] = Number(result.scores?.[id] || 0);
  const winnerId = result.winnerIds?.length === 1 ? result.winnerIds[0] : null;
  const isDraw = Boolean(result.isDraw) || !winnerId;

  const match = await store.finishMatch(rt.matchId, {
    winnerId,
    isDraw,
    durationSeconds: Math.max(0, Math.round(((Date.now() - (rt.startedAt || Date.now())) / 1000))),
    finalState: rt.state,
    scores,
  });
  await store.recordMatchStats({ scores, winnerId, isDraw });
  await store.updateRoom(rt.roomId, { status: 'finished' });

  for (const id of rt.players.keys()) await checkAchievements(id);

  rt.status = 'finished';
  const winner = winnerId ? playerDto(rt.players.get(winnerId) || { id: winnerId, username: 'Unknown' }) : null;
  const summary = {
    match,
    winner,
    isDraw,
    winnerIds: result.winnerIds || [],
    scores,
    reason: result.summary,
    players: [...rt.players.values()].map((p) => ({ ...playerDto(p), score: scores[p.id] || 0 })),
  };
  rt.lastResult = summary;
  if (io) io.to(rt.code).emit('game:ended', summary);
  notice(rt, winner ? `${winner.username} wins the match!` : 'The match ends in a draw!', 'success');
  broadcast(rt);
}

export async function rematch(rt, userId) {
  if (!rt || rt.status !== 'finished') return;
  const store = getStore();
  rt.status = 'waiting';
  rt.engine = null;
  rt.state = null;
  rt.matchId = null;
  rt.lastResult = null;
  rt.startedAt = null;
  for (const id of rt.players.keys()) await store.setPlayerReady(rt.roomId, id, id === userId);
  await store.updateRoom(rt.roomId, { status: 'waiting' });
  await syncFromDb(rt);
  notice(rt, 'Rematch! Get ready and let the host start.', 'success');
  broadcast(rt);
}

export function chat(rt, user, rawMessage) {
  if (!rt) return;
  const text = String(rawMessage || '').trim().slice(0, 160);
  if (!text) return;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.id,
    username: user.username,
    text,
    at: Date.now(),
  };
  rt.chat.push(entry);
  if (rt.chat.length > 50) rt.chat.shift();
  broadcast(rt);
}

export function removeLivePlayer(code, userId) {
  const rt = live.get(code);
  if (!rt) return;
  const timer = rt.grace.get(userId);
  if (timer) clearTimeout(timer);
  rt.grace.delete(userId);
  rt.players.delete(userId);
  if (rt.hostId === userId) {
    const next = [...rt.players.values()][0];
    if (next) rt.hostId = next.id;
  }
  broadcast(rt);
}

export function closeLiveRoom(code) {
  const rt = live.get(code);
  if (!rt) return;
  if (io) io.to(code).emit('room:closed', { message: 'This room has been closed.' });
  for (const timer of rt.grace.values()) clearTimeout(timer);
  live.delete(code);
}

/** One interval keeps every live game's clocks, phases and react targets moving. */
function tickAll() {
  const now = Date.now();
  for (const rt of live.values()) {
    if (rt.status !== 'playing' || !rt.state || !rt.engine) continue;
    try {
      if (rt.engine.tick) {
        rt.engine.tick(rt.state, now);
        if (rt.state.target?.id !== rt.lastTargetId) {
          rt.lastTargetId = rt.state.target?.id || null;
          broadcast(rt);
        }
      }
      if (rt.state.status === 'finished') {
        endGame(rt);
      } else if (rt.state.deadline && now >= rt.state.deadline) {
        rt.engine.onTimeout(rt.state);
        broadcast(rt);
        if (rt.state.status === 'finished') endGame(rt);
      }
    } catch (error) {
      console.error('[game tick]', rt.code, error);
    }
  }
}

export function startGameLoop() {
  const timer = setInterval(tickAll, 250);
  timer.unref?.();
  return timer;
}

export const debugLiveRooms = () => live;
