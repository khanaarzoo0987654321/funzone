import { SCORE, playerIds, nextPlayer, finish, resultFrom } from './shared.js';

const TURN_MS = 20_000;
const WIDTH = 7;
const HEIGHT = 6;

function hasFour(board, userId) {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal /
    [1, -1], // diagonal \
  ];
  for (let col = 0; col < WIDTH; col += 1) {
    for (let row = 0; row < board[col].length; row += 1) {
      for (const [dx, dy] of directions) {
        let count = 0;
        for (let step = 0; step < 4; step += 1) {
          const c = col + dx * step;
          const r = row + dy * step;
          if (c < 0 || c >= WIDTH || r < 0 || r >= HEIGHT || board[c][r] !== userId) break;
          count += 1;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

export const connectFour = {
  id: 'connect_four',

  create(players) {
    const ids = playerIds({ players });
    return {
      game: 'connect_four',
      status: 'playing',
      players,
      columns: Array.from({ length: WIDTH }, () => []),
      colors: { [ids[0]]: 'red', [ids[1]]: 'yellow' },
      turn: ids[0],
      lastMove: null,
      winnerIds: [],
      isDraw: false,
      scores: {},
      reason: null,
      deadline: Date.now() + TURN_MS,
    };
  },

  apply(state, action, userId) {
    if (state.status !== 'playing') return { ok: false, error: 'This game has already finished.' };
    if (action?.type !== 'drop') return { ok: false, error: 'Unknown move.' };
    if (!state.players.some((p) => p.id === userId)) return { ok: false, error: 'You are not in this match.' };
    if (state.turn !== userId) return { ok: false, error: 'It is not your turn yet.' };

    const column = Number(action.column);
    if (!Number.isInteger(column) || column < 0 || column >= WIDTH) return { ok: false, error: 'Invalid column.' };
    const stack = state.columns[column];
    if (stack.length >= HEIGHT) return { ok: false, error: 'That column is full.' };

    const row = stack.length;
    stack.push(userId);
    state.lastMove = { column, row, by: userId };

    if (hasFour(state.columns, userId)) {
      finish(state, {
        winnerIds: [userId],
        scores: { [userId]: SCORE.win, [nextPlayer(state, userId)]: SCORE.loss },
        reason: 'connect-four',
      });
      return { ok: true, events: ['Four in a row!'] };
    }

    if (state.columns.every((c) => c.length === HEIGHT)) {
      const scores = Object.fromEntries(playerIds(state).map((id) => [id, SCORE.draw]));
      finish(state, { winnerIds: [], isDraw: true, scores, reason: 'board-full' });
      return { ok: true, events: ['The board is full — it is a draw!'] };
    }

    state.turn = nextPlayer(state, userId);
    state.deadline = Date.now() + TURN_MS;
    return { ok: true };
  },

  onTimeout(state) {
    if (state.status !== 'playing') return;
    const opponent = nextPlayer(state, state.turn);
    finish(state, {
      winnerIds: [opponent],
      scores: { [opponent]: SCORE.win, [state.turn]: SCORE.loss },
      reason: 'timeout',
    });
  },

  result: resultFrom,
  view: (state) => structuredClone(state),
};
