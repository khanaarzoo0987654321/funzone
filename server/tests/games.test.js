import test from 'node:test';
import assert from 'node:assert/strict';

import { ticTacToe } from '../src/games/ticTacToe.js';
import { connectFour } from '../src/games/connectFour.js';
import { rockPaperScissors } from '../src/games/rockPaperScissors.js';
import { memoryMatch } from '../src/games/memoryMatch.js';
import { quickTap } from '../src/games/quickTap.js';

const players = [
  { id: 'p1', username: 'Alice', avatar: 'rocket', avatar_color: 'violet' },
  { id: 'p2', username: 'Bob', avatar: 'ninja', avatar_color: 'cyan' },
];
const extra = { id: 'p3', username: 'Cara', avatar: 'star', avatar_color: 'pink' };

test('Tic Tac Toe: validates turns, cells and detects a win', () => {
  const state = ticTacToe.create(players);
  assert.equal(state.turn, 'p1');
  assert.equal(ticTacToe.apply(state, { type: 'move', cell: 0 }, 'p2').ok, false);
  assert.equal(ticTacToe.apply(state, { type: 'move', cell: 99 }, 'p1').ok, false);

  for (const [cell, user] of [[0, 'p1'], [3, 'p2'], [1, 'p1'], [4, 'p2'], [2, 'p1']]) {
    assert.equal(ticTacToe.apply(state, { type: 'move', cell }, user).ok, true);
  }
  assert.equal(state.status, 'finished');
  const result = ticTacToe.result(state);
  assert.deepEqual(result.winnerIds, ['p1']);
  assert.equal(result.scores.p1, 3);
  assert.equal(result.scores.p2, 1);
});

test('Tic Tac Toe: draw and timeout are handled', () => {
  const draw = ticTacToe.create(players);
  for (const [cell, user] of [[0, 'p1'], [1, 'p2'], [2, 'p1'], [4, 'p2'], [3, 'p1'], [5, 'p2'], [7, 'p1'], [6, 'p2'], [8, 'p1']]) {
    ticTacToe.apply(draw, { type: 'move', cell }, user);
  }
  assert.equal(draw.status, 'finished');
  assert.equal(ticTacToe.result(draw).isDraw, true);

  const timed = ticTacToe.create(players);
  ticTacToe.onTimeout(timed);
  assert.deepEqual(timed.winnerIds, ['p2']);
  assert.equal(timed.reason, 'timeout');
});

test('Connect Four: gravity, turn order, vertical win and full columns', () => {
  const state = connectFour.create(players);
  assert.equal(connectFour.apply(state, { type: 'drop', column: 7 }, 'p1').ok, false);
  for (const column of [0, 1, 0, 1, 0, 1, 0]) {
    const user = column === 0 ? 'p1' : 'p2';
    assert.equal(connectFour.apply(state, { type: 'drop', column }, user).ok, true);
  }
  assert.equal(state.status, 'finished');
  assert.deepEqual(connectFour.result(state).winnerIds, ['p1']);

  const tall = connectFour.create(players);
  for (let i = 0; i < 6; i += 1) {
    connectFour.apply(tall, { type: 'drop', column: 3 }, i % 2 === 0 ? 'p1' : 'p2');
  }
  assert.equal(connectFour.apply(tall, { type: 'drop', column: 3 }, 'p1').ok, false);
});

test('Rock Paper Scissors: resolves rounds and finishes after five', () => {
  const state = rockPaperScissors.create(players);
  for (let round = 1; round <= 5; round += 1) {
    assert.equal(rockPaperScissors.apply(state, { type: 'choice', choice: 'rock' }, 'p1').ok, true);
    assert.equal(rockPaperScissors.apply(state, { type: 'choice', choice: 'scissors' }, 'p2').ok, true);
    if (round < 5) rockPaperScissors.onTimeout(state); // advance past reveal
  }
  assert.equal(state.status, 'finished');
  assert.equal(state.scores.p1, 5);
  assert.deepEqual(rockPaperScissors.result(state).winnerIds, ['p1']);
});

test('Rock Paper Scissors: three different choices produce a draw round', () => {
  const state = rockPaperScissors.create([...players, extra]);
  for (const [id, choice] of [['p1', 'rock'], ['p2', 'paper'], ['p3', 'scissors']]) {
    rockPaperScissors.apply(state, { type: 'choice', choice }, id);
  }
  assert.equal(state.lastReveal.distinct.length, 3);
  assert.deepEqual(state.lastReveal.winners, []);
});

test('Memory Match: awards pairs, keeps turn and hides face-down cards', () => {
  const state = memoryMatch.create(players);
  const first = state.deck[0].symbol;
  const matchIndex = state.deck.findIndex((card, i) => i > 0 && card.symbol === first);

  const view = memoryMatch.view(state);
  assert.equal(view.deck[1].symbol, null, 'face-down symbols must not be leaked');

  memoryMatch.apply(state, { type: 'flip', index: 0 }, 'p1');
  assert.deepEqual(state.revealed, [0]);
  assert.equal(memoryMatch.apply(state, { type: 'flip', index: 0 }, 'p2').ok, false);

  memoryMatch.apply(state, { type: 'flip', index: matchIndex }, 'p1');
  assert.equal(state.scores.p1, 2);
  assert.equal(state.turn, 'p1', 'matching keeps the turn');

  const wrongIndex = state.deck.findIndex((card, i) => !state.matched.includes(i) && card.symbol !== first);
  if (wrongIndex >= 0) {
    const other = state.deck.findIndex((card, i) => i !== wrongIndex && card.symbol !== state.deck[wrongIndex].symbol && !state.matched.includes(i));
    if (other >= 0) {
      memoryMatch.apply(state, { type: 'flip', index: wrongIndex }, 'p1');
      memoryMatch.apply(state, { type: 'flip', index: other }, 'p1');
      assert.equal(state.turn, 'p2');
    }
  }
});

test('Quick Tap: server computes points, penalises misses and ends on time', () => {
  const state = quickTap.create(players);
  const target = state.target.cell;
  const hit = quickTap.apply(state, { type: 'tap', cell: target }, 'p1');
  assert.equal(hit.ok, true);
  assert.ok(state.scores.p1 >= 5 && state.scores.p1 <= 20);

  const missCell = (state.target.cell + 1) % 25;
  assert.equal(quickTap.apply(state, { type: 'tap', cell: missCell }, 'p2').ok, true);
  assert.equal(state.scores.p2, 0, 'score never drops below zero');
  assert.equal(quickTap.apply(state, { type: 'tap', cell: 3 }, 'p1').ok, false, 'cooldown prevents spam');

  state.endsAt = Date.now() - 1;
  quickTap.tick(state, Date.now());
  assert.equal(state.status, 'finished');
  assert.equal(quickTap.result(state).reason, 'time-up');
});
