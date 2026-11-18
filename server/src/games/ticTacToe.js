import { SCORE, playerIds, nextPlayer, finish, resultFrom } from './shared.js';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const TURN_MS = 20_000;

function winningLine(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

export const ticTacToe = {
  id: 'tic_tac_toe',

  create(players) {
    const ids = playerIds({ players });
    return {
      game: 'tic_tac_toe',
      status: 'playing',
      players,
      board: Array(9).fill(null),
      marks: { [ids[0]]: 'X', [ids[1]]: 'O' },
      turn: ids[0],
      moveCount: 0,
      winnerIds: [],
      winnerId: null,
      winningLine: [],
      isDraw: false,
      scores: {},
      reason: null,
      deadline: Date.now() + TURN_MS,
    };
  },

  apply(state, action, userId) {
    if (state.status !== 'playing') return { ok: false, error: 'This game has already finished.' };
    if (action?.type !== 'move') return { ok: false, error: 'Unknown move.' };
    if (!state.players.some((p) => p.id === userId)) return { ok: false, error: 'You are not in this match.' };
    if (state.turn !== userId) return { ok: false, error: 'It is not your turn yet.' };

    const cell = Number(action.cell);
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) return { ok: false, error: 'Invalid cell.' };
    if (state.board[cell]) return { ok: false, error: 'That square is already taken.' };

    state.board[cell] = userId;
    state.moveCount += 1;

    const line = winningLine(state.board);
    if (line) {
      state.winningLine = line;
      state.winnerId = userId;
      finish(state, {
        winnerIds: [userId],
        scores: { [userId]: SCORE.win, [nextPlayer(state, userId)]: SCORE.loss },
        reason: 'three-in-a-row',
      });
      return { ok: true, events: [`${state.players.find((p) => p.id === userId).username} completed a line!`] };
    }

    if (state.moveCount === 9) {
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
