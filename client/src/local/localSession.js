/**
 * Framework-agnostic local multiplayer session driver.
 *
 * Local matches use the same authoritative engines as online rooms, but they
 * never touch sockets, accounts, REST or the server-side room manager.
 */
import { GAME_LIST } from '../../../server/src/games/catalog.js';
import { ticTacToe } from '../../../server/src/games/ticTacToe.js';
import { connectFour } from '../../../server/src/games/connectFour.js';
import { rockPaperScissors } from '../../../server/src/games/rockPaperScissors.js';
import { memoryMatch } from '../../../server/src/games/memoryMatch.js';
import { quickTap } from '../../../server/src/games/quickTap.js';

export const ENGINES = {
  tic_tac_toe: ticTacToe,
  connect_four: connectFour,
  rock_paper_scissors: rockPaperScissors,
  memory_match: memoryMatch,
  quick_tap: quickTap,
};

const LOCAL_RULES = {
  tic_tac_toe: {
    turnMs: 20_000,
    privacy: 'board',
    instruction: 'Take turns placing your mark. Three in a row wins the round.',
  },
  connect_four: {
    turnMs: 20_000,
    privacy: 'board',
    instruction: 'Drop a piece on your turn. Connect four tiles to win.',
  },
  rock_paper_scissors: {
    turnMs: 15_000,
    privacy: 'choice',
    instruction: 'Each player locks in a hidden choice, then everyone reveals together.',
  },
  memory_match: {
    turnMs: 25_000,
    privacy: 'cards',
    instruction: 'Flip two cards per turn. Matched pairs score points.',
  },
  quick_tap: {
    turnMs: 10_000,
    privacy: 'score',
    instruction: 'Each player gets a separate 10-second turn to tap the glowing tile.',
  },
};

export const LOCAL_GAMES = GAME_LIST.map((game) => ({
  ...game,
  ...LOCAL_RULES[game.id],
  playLabel: 'Play locally',
}));

const AVATARS = ['rocket', 'ninja', 'star', 'fox', 'panda', 'robot', 'cat', 'alien'];
const COLORS = ['violet', 'cyan', 'pink', 'amber', 'lime', 'blue', 'red', 'slate'];

export function getLocalGame(id) {
  return LOCAL_GAMES.find((game) => game.id === id) || null;
}

export function getPlayer(session, playerId) {
  return session?.players?.find((player) => player.id === playerId) || null;
}

export function playerName(session, playerId) {
  return getPlayer(session, playerId)?.username || 'Player';
}

export function expectedActor(session) {
  if (!session || session.state?.status !== 'playing') return null;
  if (session.gameId === 'rock_paper_scissors' || session.gameId === 'quick_tap') return session.activePlayerId;
  return session.state.turn || session.activePlayerId;
}

function cloneSession(session) {
  if (typeof structuredClone === 'function') return structuredClone(session);
  return JSON.parse(JSON.stringify(session));
}

function cleanName(value, index) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return (text || `Player ${index + 1}`).slice(0, 18);
}

export function createLocalPlayers(gameId, names = []) {
  const game = getLocalGame(gameId);
  if (!game) throw new Error('Unknown local game.');

  const count = Math.min(game.maxPlayers, Math.max(game.minPlayers, names.length || game.minPlayers));
  return Array.from({ length: count }, (_, index) => ({
    id: `local-${index + 1}`,
    username: cleanName(names[index], index),
    avatar: AVATARS[index % AVATARS.length],
    avatar_color: COLORS[index % COLORS.length],
    ready: true,
    connected: true,
    isHost: index === 0,
  }));
}

function finishSession(session) {
  session.result = ENGINES[session.gameId].result(session.state);
  session.screen = 'result';
  session.handoff = null;
  session.review = null;
  session.activePlayerId = null;
  return session;
}

function setupHandoff(session, toId, message, fromId = null) {
  session.screen = 'handoff';
  session.handoff = { fromId, toId, message };
  session.review = null;
  session.activePlayerId = toId;
  session.state.deadline = null;
  return session;
}

function beginQuickTapTurn(session, now, playerId) {
  const game = getLocalGame('quick_tap');
  session.activePlayerId = playerId || session.players[0].id;
  session.screen = 'playing';
  session.handoff = null;
  session.state.deadline = now + game.turnMs;
  session.state.endsAt = now + game.turnMs;
  session.state.lastTapAt = {};

  // Give every player a fresh target instead of inheriting the previous one.
  if (session.state.target) {
    session.state.target = { ...session.state.target, spawnedAt: now - 2_000 };
  }
  quickTap.tick(session.state, now);
  return session;
}

export function createLocalSession(gameId, names = [], now = Date.now()) {
  const engine = ENGINES[gameId];
  if (!engine) throw new Error('Unknown local game.');

  const players = createLocalPlayers(gameId, names);
  const state = engine.create(players);
  const session = {
    gameId,
    players,
    names: players.map((player) => player.username),
    state,
    activePlayerId: players[0].id,
    screen: 'playing',
    handoff: null,
    review: null,
    result: null,
    quickTapTurns: gameId === 'quick_tap' ? 1 : 0,
  };

  if (gameId === 'quick_tap') beginQuickTapTurn(session, now, players[0].id);
  return session;
}

export function nextUnchosenPlayer(session, afterId) {
  const players = session.players;
  const start = Math.max(0, players.findIndex((player) => player.id === afterId));
  for (let step = 1; step <= players.length; step += 1) {
    const candidate = players[(start + step) % players.length];
    if (!session.state.choices?.[candidate.id]) return candidate.id;
  }
  return players[0].id;
}

export function applyLocalAction(session, action, options = {}) {
  if (!session) return { error: 'Start a local game first.' };
  if (session.screen !== 'playing') return { error: 'Finish the current step first.' };
  if (session.state.status !== 'playing') return { error: 'This game has already finished.' };

  const actorId = expectedActor(session);
  const actor = getPlayer(session, actorId);
  if (!actor) return { error: 'No active player.' };

  const next = cloneSession(session);
  const outcome = ENGINES[next.gameId].apply(next.state, action, actorId);
  if (!outcome.ok) return { error: outcome.error || 'That move is not allowed.' };

  if (next.state.status === 'finished') return { session: finishSession(next) };

  if (next.gameId === 'tic_tac_toe' || next.gameId === 'connect_four') {
    const toId = next.state.turn;
    return { session: setupHandoff(next, toId, `${actor.username} moved. Pass the device to ${playerName(next, toId)}.`, actorId) };
  }

  if (next.gameId === 'memory_match') {
    // One card is only a peek — the same player keeps flipping.
    if (next.state.revealed.length === 1) return { session: next };

    const matched = Boolean(next.state.lastFlip?.matched);
    next.review = {
      actorId,
      message: matched
        ? `${actor.username} found a pair! +2 points`
        : 'No match this time — the turn will pass.',
    };
    next.screen = 'review';
    return { session: next };
  }

  if (next.gameId === 'rock_paper_scissors') {
    if (next.state.phase === 'reveal') {
      next.screen = 'reveal';
      next.review = null;
      return { session: next };
    }
    const toId = nextUnchosenPlayer(next, actorId);
    return { session: setupHandoff(next, toId, `${actor.username} locked in. Pass the device to ${playerName(next, toId)} to choose privately.`, actorId) };
  }

  if (next.gameId === 'quick_tap') return { session: next };

  return { session: next };
}

export function continueHandoff(session, options = {}) {
  if (!session || session.screen !== 'handoff') return session;

  const next = cloneSession(session);
  const now = options.now || Date.now();
  const toId = next.handoff.toId || next.activePlayerId || next.players[0].id;
  const game = getLocalGame(next.gameId);

  if (next.gameId === 'memory_match') {
    next.state.revealed = [];
    next.state.lastFlip = null;
  }

  next.screen = 'playing';
  next.handoff = null;
  next.review = null;
  next.activePlayerId = toId;

  if (next.gameId === 'quick_tap') return beginQuickTapTurn(next, now, toId);
  if (game?.turnMs) next.state.deadline = now + game.turnMs;
  else next.state.deadline = null;
  return next;
}

export function continueReview(session, options = {}) {
  if (!session || session.screen !== 'review') return session;

  const next = cloneSession(session);
  const actorId = next.review?.actorId || next.state.lastFlip?.by;
  const toId = next.state.turn;
  return setupHandoff(
    next,
    toId,
    `${playerName(next, actorId)} finished their turn. Pass the device to ${playerName(next, toId)}.`,
    actorId,
  );
}

export function continueReveal(session) {
  if (!session || session.screen !== 'reveal') return session;

  const next = cloneSession(session);
  rockPaperScissors.onTimeout(next.state);
  if (next.state.status === 'finished') return finishSession(next);

  // The reveal belongs to the previous round only; never leak it into the next picks.
  next.state.lastReveal = null;

  const toId = next.players[0].id;
  return setupHandoff(next, toId, `Round ${next.state.round} — pass to ${playerName(next, toId)} for a hidden choice.`, null);
}

export function completeQuickTapTurn(session, options = {}) {
  if (!session || session.gameId !== 'quick_tap' || session.state.status !== 'playing') return session;

  const next = cloneSession(session);
  if (next.quickTapTurns >= next.players.length) {
    quickTap.onTimeout(next.state);
    return finishSession(next);
  }

  const currentId = next.activePlayerId;
  const index = Math.max(0, next.players.findIndex((player) => player.id === currentId));
  const toId = next.players[(index + 1) % next.players.length].id;
  next.quickTapTurns += 1;
  return setupHandoff(next, toId, `${playerName(next, currentId)} finished their turn. Pass to ${playerName(next, toId)}.`, currentId);
}

export function timeoutLocalTurn(session, options = {}) {
  if (!session || session.state.status !== 'playing') return session;
  if (session.gameId === 'quick_tap') return completeQuickTapTurn(session, options);

  const next = cloneSession(session);
  ENGINES[next.gameId].onTimeout(next.state);
  if (next.state.status === 'finished') return finishSession(next);

  const toId = next.state.turn || next.activePlayerId;
  return setupHandoff(next, toId, `Time was up. Pass the device to ${playerName(next, toId)}.`, toId);
}

export function tickLocalSession(session, now) {
  if (!session || session.gameId !== 'quick_tap' || session.state.status !== 'playing') return session;

  const next = cloneSession(session);
  quickTap.tick(next.state, now);
  if (next.state.status === 'finished') return finishSession(next);
  return next;
}

export function rematchSession(session, now = Date.now()) {
  if (!session) return null;
  return createLocalSession(session.gameId, session.names, now);
}
