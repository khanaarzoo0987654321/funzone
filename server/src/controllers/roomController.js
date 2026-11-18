import { getStore } from '../db/index.js';
import { getGame, GAME_LIST } from '../games/catalog.js';
import { roomCode, clamp } from '../utils/helpers.js';
import { badRequest, notFound, conflict } from '../utils/AppError.js';
import { notifyRoomUpdate, removeLivePlayer, closeLiveRoom } from '../socket/roomManager.js';

export function listGames(_req, res) {
  res.json({ games: GAME_LIST });
}

export async function createRoom(req, res) {
  const store = getStore();
  const game = getGame(req.body?.gameType);
  if (!game) throw badRequest('Choose one of the five FunZone games.');

  const requested = Number(req.body?.maxPlayers) || game.maxPlayers;
  const maxPlayers = clamp(requested, game.minPlayers, game.maxPlayers);
  const isPrivate = req.body?.isPrivate !== false;

  let room;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      room = await store.createRoom({
        gameType: game.id,
        hostId: req.user.id,
        maxPlayers,
        isPrivate,
        code: roomCode(),
      });
      break;
    } catch (error) {
      if (error.code !== 'ROOM_CODE_TAKEN') throw error;
    }
  }
  if (!room) throw conflict('Could not generate a unique room code. Please try again.');

  await store.addRoomPlayer({ roomId: room.id, userId: req.user.id, isHost: true, seat: 0 });
  const players = await store.listRoomPlayers(room.id);
  await notifyRoomUpdate(room.code);
  res.status(201).json({ room, players, game });
}

export async function getRoom(req, res) {
  const store = getStore();
  const room = await store.getRoomByCode(req.params.code);
  if (!room) throw notFound('No room found with that code.');
  const players = await store.listRoomPlayers(room.id);
  res.json({ room, players, game: getGame(room.game_type) });
}

export async function joinRoom(req, res) {
  const store = getStore();
  const room = await store.getRoomByCode(req.params.code);
  if (!room) throw notFound('No room found with that code. Check the code and try again.');
  if (room.status !== 'waiting') throw conflict('This game has already started.');

  const existing = await store.getRoomPlayer(room.id, req.user.id);
  if (existing) return res.json({ room, players: await store.listRoomPlayers(room.id), alreadyJoined: true });

  const players = await store.listRoomPlayers(room.id);
  if (players.length >= room.max_players) throw conflict('This room is full.');

  await store.addRoomPlayer({ roomId: room.id, userId: req.user.id, seat: players.length });
  const updated = await store.listRoomPlayers(room.id);
  await notifyRoomUpdate(room.code);
  res.json({ room, players: updated });
}

export async function leaveRoom(req, res) {
  const store = getStore();
  const room = await store.getRoomByCode(req.params.code);
  if (!room) throw notFound('Room not found.');
  const membership = await store.getRoomPlayer(room.id, req.user.id);
  if (!membership) throw badRequest('You are not a member of this room.');

  await store.removeRoomPlayer(room.id, req.user.id);
  removeLivePlayer(room.code, req.user.id);

  const remaining = await store.listRoomPlayers(room.id);
  if (!remaining.length) {
    await store.updateRoom(room.id, { status: 'finished', closed_at: new Date().toISOString() });
    closeLiveRoom(room.code);
  } else if (membership.is_host) {
    await store.transferHost(room.id, remaining[0].user_id);
  }

  await notifyRoomUpdate(room.code);
  res.json({ ok: true, players: remaining });
}
