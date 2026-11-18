import crypto from 'node:crypto';

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
    const j = crypto.randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function randomInt(max) {
  return crypto.randomInt(0, max);
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
