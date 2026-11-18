import { shuffle, playerIds, nextPlayer, highestScoreResult, resultFrom } from './shared.js';

const SYMBOLS = ['🚀', '🎈', '🍕', '⚡', '🌈', '🎧', '🍀', '🪐'];
const TURN_MS = 25_000;

export const memoryMatch = {
  id: 'memory_match',

  create(players) {
    const deck = shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol, index) => ({ index, symbol }));
    return {
      game: 'memory_match',
      status: 'playing',
      players,
      deck,
      matched: [],
      revealed: [],
      turn: players[0].id,
      scores: Object.fromEntries(playerIds({ players }).map((id) => [id, 0])),
      lastFlip: null,
      flips: 0,
      winnerIds: [],
      isDraw: false,
      reason: null,
      deadline: Date.now() + TURN_MS,
    };
  },

  apply(state, action, userId) {
    if (state.status !== 'playing') return { ok: false, error: 'This game has already finished.' };
    if (action?.type !== 'flip') return { ok: false, error: 'Unknown move.' };
    if (!state.players.some((p) => p.id === userId)) return { ok: false, error: 'You are not in this match.' };
    if (state.turn !== userId) return { ok: false, error: 'It is not your turn yet.' };

    const index = Number(action.index);
    if (!Number.isInteger(index) || index < 0 || index >= state.deck.length) return { ok: false, error: 'Invalid card.' };
    if (state.matched.includes(index)) return { ok: false, error: 'That pair is already matched.' };
    if (state.revealed.includes(index)) return { ok: false, error: 'That card is already face up.' };

    state.deadline = Date.now() + TURN_MS;
    state.flips += 1;

    if (state.revealed.length === 0) {
      state.revealed = [index];
      return { ok: true };
    }

    const first = state.revealed[0];
    const isMatch = state.deck[first].symbol === state.deck[index].symbol;
    state.revealed = [];
    state.lastFlip = { indices: [first, index], matched: isMatch, by: userId };

    if (isMatch) {
      state.matched.push(first, index);
      state.scores[userId] = (state.scores[userId] || 0) + 2;
      if (state.matched.length === state.deck.length) {
        highestScoreResult(state, { reason: 'all-pairs-found' });
      }
      return { ok: true, events: isMatch ? ['Pair found!'] : undefined };
    }

    state.turn = nextPlayer(state, userId);
    return { ok: true };
  },

  onTimeout(state) {
    if (state.status !== 'playing') return;
    state.revealed = [];
    state.turn = nextPlayer(state, state.turn);
    state.scores[state.turn] = Math.max(0, (state.scores[state.turn] || 0) - 1);
    state.deadline = Date.now() + TURN_MS;
  },

  result: resultFrom,

  /** Hide face-down card symbols — the server never leaks them to clients. */
  view(state) {
    const copy = structuredClone(state);
    const visible = new Set([...state.matched, ...state.revealed, ...(state.lastFlip?.indices || [])]);
    copy.deck = state.deck.map((card) => ({
      index: card.index,
      symbol: visible.has(card.index) ? card.symbol : null,
    }));
    return copy;
  },
};
