/**
 * Browser-safe random helpers. Web Crypto is available in modern browsers and
 * Node 18+, so the same engines can power both online rooms and local play.
 */
const UINT32_RANGE = 0x1_0000_0000;

function secureRandomInt(max) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) return Math.floor(Math.random() * max);

  const limit = UINT32_RANGE - (UINT32_RANGE % max);
  const buffer = new Uint32Array(1);
  let value;
  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

export const SCORE = {
  win: 3,
  loss: 1,
  draw: 1,
};

export const playerIds = (state) => state.players.map((p) => p.id);

export function nextPlayer(state, currentId) {
  const ids = playerIds(state);
  const index = ids.indexOf(currentId);
  return ids[(index + 1) % ids.length];
}

export function shuffle(values) {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function randomInt(max) {
  return secureRandomInt(max);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Mark a game as finished and store the authoritative score table. */
export function finish(state, { winnerIds = [], isDraw = false, scores = {}, reason = 'complete' }) {
  state.status = 'finished';
  state.winnerIds = winnerIds;
  state.isDraw = isDraw;
  state.scores = scores;
  state.reason = reason;
  state.deadline = null;
}

export function resultFrom(state) {
  return {
    scores: state.scores || {},
    winnerIds: state.winnerIds || [],
    isDraw: Boolean(state.isDraw),
    summary: state.reason || 'complete',
    reason: state.reason || 'complete',
  };
}

/** Highest score wins; shared highest score is treated as a draw. */
export function highestScoreResult(state, { reason = 'complete' } = {}) {
  const entries = Object.entries(state.scores || {});
  const max = Math.max(...entries.map(([, value]) => value), 0);
  const winnerIds = entries.filter(([, value]) => value === max).map(([id]) => id);
  const isDraw = winnerIds.length !== 1;
  finish(state, {
    winnerIds: isDraw ? [] : winnerIds,
    isDraw,
    scores: state.scores,
    reason,
  });
}
