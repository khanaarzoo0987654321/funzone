import { finish, resultFrom } from './shared.js';

export const CHOICES = ['rock', 'paper', 'scissors'];
const ROUND_MS = 15_000;
const REVEAL_MS = 3_000;
const TOTAL_ROUNDS = 5;

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

function resolveRound(state) {
  const players = state.players;
  const chosen = players
    .filter((p) => state.choices[p.id])
    .map((p) => ({ id: p.id, username: p.username, choice: state.choices[p.id] }));
  const distinct = [...new Set(chosen.map((c) => c.choice))];

  let winners = [];
  let winningChoice = null;
  if (distinct.length === 2) {
    winningChoice = distinct.find((move) => BEATS[move] === distinct.find((m) => m !== move));
    winners = chosen.filter((c) => c.choice === winningChoice).map((c) => c.id);
  } else if (distinct.length === 1) {
    // Everyone picked the same move — shared point.
    winners = chosen.map((c) => c.id);
    winningChoice = distinct[0];
  }

  for (const id of winners) state.scores[id] = (state.scores[id] || 0) + 1;

  state.lastReveal = {
    round: state.round,
    choices: { ...state.choices },
    winners,
    winningChoice,
    distinct,
  };

  if (state.round >= TOTAL_ROUNDS) {
    const entries = Object.entries(state.scores);
    const max = Math.max(...entries.map(([, value]) => value), 0);
    const winnerIds = entries.filter(([, value]) => value === max).map(([id]) => id);
    const isDraw = winnerIds.length !== 1;
    finish(state, {
      winnerIds: isDraw ? [] : winnerIds,
      isDraw,
      scores: state.scores,
      reason: 'rounds-complete',
    });
    return;
  }

  state.phase = 'reveal';
  state.deadline = Date.now() + REVEAL_MS;
}

function beginRound(state) {
  state.round += 1;
  state.phase = 'choosing';
  state.choices = {};
  state.deadline = Date.now() + ROUND_MS;
}

export const rockPaperScissors = {
  id: 'rock_paper_scissors',

  create(players) {
    return {
      game: 'rock_paper_scissors',
      status: 'playing',
      players,
      phase: 'choosing',
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      choices: {},
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      lastReveal: null,
      winnerIds: [],
      isDraw: false,
      reason: null,
      deadline: Date.now() + ROUND_MS,
    };
  },

  apply(state, action, userId) {
    if (state.status !== 'playing') return { ok: false, error: 'This game has already finished.' };
    if (action?.type !== 'choice') return { ok: false, error: 'Unknown move.' };
    if (!state.players.some((p) => p.id === userId)) return { ok: false, error: 'You are not in this match.' };
    if (state.phase !== 'choosing') return { ok: false, error: 'Wait for the next round.' };
    if (!CHOICES.includes(action.choice)) return { ok: false, error: 'Choose rock, paper or scissors.' };
    if (state.choices[userId]) return { ok: false, error: 'You already locked in your choice.' };

    state.choices[userId] = action.choice;
    if (state.players.every((p) => state.choices[p.id])) resolveRound(state);
    return { ok: true };
  },

  onTimeout(state) {
    if (state.status !== 'playing') return;
    if (state.phase === 'reveal') {
      beginRound(state);
    } else {
      // Missing choices are simply skipped for this round.
      resolveRound(state);
    }
  },

  result: resultFrom,
  view: (state) => structuredClone(state),
};
