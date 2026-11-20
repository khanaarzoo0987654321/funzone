import { randomInt, clamp, highestScoreResult, resultFrom } from './shared.js';

const GAME_MS = 30_000;
const TARGET_MS = 1_800;
const GRID = 25;
const TAP_COOLDOWN_MS = 80;

function spawnTarget(state, now) {
  state.targetCounter = (state.targetCounter || 0) + 1;
  let cell = randomInt(GRID);
  if (state.target && cell === state.target.cell) cell = (cell + 1) % GRID;
  state.target = { id: state.targetCounter, cell, spawnedAt: now };
}

export const quickTap = {
  id: 'quick_tap',

  create(players) {
    const now = Date.now();
    const state = {
      game: 'quick_tap',
      status: 'playing',
      players,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      hits: Object.fromEntries(players.map((p) => [p.id, 0])),
      misses: Object.fromEntries(players.map((p) => [p.id, 0])),
      lastTapAt: {},
      target: null,
      targetCounter: 0,
      lastEvent: null,
      startedAt: now,
      endsAt: now + GAME_MS,
      winnerIds: [],
      isDraw: false,
      reason: null,
      deadline: now + GAME_MS,
    };
    spawnTarget(state, now);
    return state;
  },

  apply(state, action, userId) {
    if (state.status !== 'playing') return { ok: false, error: 'This game has already finished.' };
    if (action?.type !== 'tap') return { ok: false, error: 'Unknown move.' };
    if (!state.players.some((p) => p.id === userId)) return { ok: false, error: 'You are not in this match.' };

    const now = Date.now();
    if (now - (state.lastTapAt[userId] || 0) < TAP_COOLDOWN_MS) return { ok: false, error: 'Too fast — slow down!' };

    const cell = Number(action.cell);
    if (!Number.isInteger(cell) || cell < 0 || cell >= GRID) return { ok: false, error: 'Invalid tile.' };
    state.lastTapAt[userId] = now;

    if (!state.target) return { ok: false, error: 'Wait for the next target.' };

    if (cell === state.target.cell) {
      const elapsed = now - state.target.spawnedAt;
      const points = clamp(20 - Math.floor(elapsed / 120), 5, 20);
      state.scores[userId] += points;
      state.hits[userId] += 1;
      state.lastEvent = { type: 'hit', userId, cell, points, at: now };
      spawnTarget(state, now);
      return { ok: true, events: [`+${points} points!`] };
    }

    state.scores[userId] = Math.max(0, state.scores[userId] - 2);
    state.misses[userId] += 1;
    state.lastEvent = { type: 'miss', userId, cell, points: -2, at: now };
    return { ok: true };
  },

  tick(state, now) {
    if (state.status !== 'playing') return;
    if (now >= state.endsAt) {
      highestScoreResult(state, { reason: 'time-up' });
      return;
    }
    if (state.target && now - state.target.spawnedAt > TARGET_MS) {
      spawnTarget(state, now);
      state.lastEvent = null;
    }
  },

  onTimeout(state) {
    if (state.status !== 'playing') return;
    highestScoreResult(state, { reason: 'time-up' });
  },

  result: resultFrom,
  view: (state) => structuredClone(state),
};
