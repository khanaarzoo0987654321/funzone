import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCAL_GAMES,
  applyLocalAction,
  completeQuickTapTurn,
  continueHandoff,
  continueReveal,
  continueReview,
  createLocalSession,
  createLocalPlayers,
  expectedActor,
  rematchSession,
  timeoutLocalTurn,
} from '../../client/src/local/localSession.js';

function act(session, action) {
  const outcome = applyLocalAction(session, action);
  assert.equal(outcome.error, undefined, outcome.error);
  return outcome.session;
}

function resume(session) {
  if (session.screen === 'handoff') return continueHandoff(session);
  if (session.screen === 'review') return continueReview(session);
  return session;
}

test('local catalog exposes all five games with hot-seat player ranges', () => {
  assert.equal(LOCAL_GAMES.length, 5);
  const ranges = Object.fromEntries(LOCAL_GAMES.map((game) => [game.id, [game.minPlayers, game.maxPlayers]]));
  assert.deepEqual(ranges.tic_tac_toe, [2, 2]);
  assert.deepEqual(ranges.connect_four, [2, 2]);
  assert.deepEqual(ranges.memory_match, [2, 4]);
  assert.deepEqual(ranges.rock_paper_scissors, [2, 8]);
  assert.deepEqual(ranges.quick_tap, [2, 8]);
});

test('local players get isolated ids, display names and avatars', () => {
  const players = createLocalPlayers('memory_match', [' Ada ', '', 'Cleo']);
  assert.deepEqual(players.map((player) => player.username), ['Ada', 'Player 2', 'Cleo']);
  assert.deepEqual(players.map((player) => player.id), ['local-1', 'local-2', 'local-3']);
  assert.equal(players[0].isHost, true);
  assert.equal(players[1].isHost, false);
});

test('local Tic Tac Toe alternates turns, hides the board between moves and records a winner', () => {
  let session = createLocalSession('tic_tac_toe', ['Ada', 'Ben']);
  assert.equal(expectedActor(session), 'local-1');

  session = act(session, { type: 'move', cell: 0 });
  assert.equal(session.screen, 'handoff');
  assert.equal(session.handoff.toId, 'local-2');
  session = continueHandoff(session);
  assert.equal(expectedActor(session), 'local-2');

  session = act(session, { type: 'move', cell: 3 });
  session = resume(session);
  session = act(session, { type: 'move', cell: 1 });
  session = resume(session);
  session = act(session, { type: 'move', cell: 4 });
  session = resume(session);
  session = act(session, { type: 'move', cell: 2 });

  assert.equal(session.screen, 'result');
  assert.deepEqual(session.result.winnerIds, ['local-1']);
  assert.equal(session.result.scores['local-1'], 3);
  assert.equal(session.result.scores['local-2'], 1);
});

test('local Connect Four alternates columns and finishes on four in a row', () => {
  let session = createLocalSession('connect_four', ['Ada', 'Ben']);
  for (const column of [0, 1, 0, 1, 0, 1, 0]) {
    session = act(session, { type: 'drop', column });
    if (session.screen === 'handoff') session = continueHandoff(session);
  }
  assert.equal(session.screen, 'result');
  assert.deepEqual(session.result.winnerIds, ['local-1']);
  assert.equal(session.state.lastMove.column, 0);
});

test('local Rock Paper Scissors keeps each choice behind a handoff and scores five rounds', () => {
  let session = createLocalSession('rock_paper_scissors', ['Ada', 'Ben']);

  for (let round = 1; round <= 5; round += 1) {
    session = act(session, { type: 'choice', choice: 'rock' });
    assert.equal(session.screen, 'handoff', `round ${round} should hand off before the second choice`);
    assert.equal(session.handoff.toId, 'local-2');
    session = continueHandoff(session);
    assert.equal(expectedActor(session), 'local-2');

    session = act(session, { type: 'choice', choice: 'scissors' });
    assert.equal(session.state.lastReveal.winners[0], 'local-1');
    if (session.screen === 'reveal') session = continueReveal(session);
    if (session.screen === 'handoff') session = continueHandoff(session);
  }

  assert.equal(session.screen, 'result');
  assert.equal(session.result.scores['local-1'], 5);
  assert.equal(session.result.scores['local-2'], 0);
  assert.deepEqual(session.result.winnerIds, ['local-1']);
});

test('local Memory Match keeps real card symbols for play, reviews a pair then hands off', () => {
  let session = createLocalSession('memory_match', ['Ada', 'Ben']);
  assert.ok(session.state.deck.every((card) => Boolean(card.symbol)), 'local deck must keep symbols for hot-seat play');

  const firstSymbol = session.state.deck[0].symbol;
  const pair = session.state.deck.filter((card) => card.symbol === firstSymbol).map((card) => card.index);
  assert.equal(pair.length, 2);

  session = act(session, { type: 'flip', index: pair[0] });
  assert.equal(session.screen, 'playing');
  assert.deepEqual(session.state.revealed, [pair[0]]);

  session = act(session, { type: 'flip', index: pair[1] });
  assert.equal(session.screen, 'review');
  assert.equal(session.state.scores['local-1'], 2);

  session = continueReview(session);
  assert.equal(session.screen, 'handoff');
  assert.equal(session.handoff.toId, 'local-1', 'a matched pair keeps the same player in play');
  assert.deepEqual(session.state.revealed, []);

  session = continueHandoff(session);
  assert.equal(session.state.lastFlip, null, 'the previous flip is cleared when the next turn starts');
  assert.equal(expectedActor(session), 'local-1');

  const remaining = session.state.deck.filter((card) => !session.state.matched.includes(card.index));
  const different = remaining.find((card) => card.symbol !== remaining[0].symbol);
  session = act(session, { type: 'flip', index: remaining[0].index });
  session = act(session, { type: 'flip', index: different.index });
  session = continueReview(session);
  assert.equal(session.screen, 'handoff');
  assert.equal(session.handoff.toId, 'local-2', 'a mismatch passes the turn');
});

test('local Quick Tap gives each player a separate timed turn and tracks scores', () => {
  let session = createLocalSession('quick_tap', ['Ada', 'Ben', 'Cleo']);
  assert.equal(session.quickTapTurns, 1);
  assert.equal(expectedActor(session), 'local-1');
  assert.ok(session.state.endsAt > Date.now());

  const wrongCell = session.state.target.cell === 0 ? 1 : 0;
  session = act(session, { type: 'tap', cell: wrongCell });
  assert.equal(session.state.misses['local-1'], 1);
  assert.equal(session.state.scores['local-1'], 0);

  session = completeQuickTapTurn(session);
  assert.equal(session.screen, 'handoff');
  assert.equal(session.handoff.toId, 'local-2');
  assert.equal(applyLocalAction(session, { type: 'tap', cell: 0 }).error, 'Finish the current step first.');

  session = continueHandoff(session);
  assert.equal(session.quickTapTurns, 2);
  assert.equal(expectedActor(session), 'local-2');

  session = act(session, { type: 'tap', cell: session.state.target.cell });
  assert.ok(session.state.scores['local-2'] > 0);
  assert.equal(session.state.hits['local-2'], 1);

  session = completeQuickTapTurn(session);
  session = continueHandoff(session);
  assert.equal(session.quickTapTurns, 3);
  assert.equal(expectedActor(session), 'local-3');

  session = completeQuickTapTurn(session);
  assert.equal(session.screen, 'result');
  assert.deepEqual(session.result.winnerIds, ['local-2']);
});

test('local timeout hands off to the next player without ending the match', () => {
  let session = createLocalSession('memory_match', ['Ada', 'Ben']);
  session.state.deadline = Date.now() - 1;
  const next = applyLocalAction(session, { type: 'flip', index: 0 });
  assert.equal(next.error, undefined);
  session = next.session;
  assert.equal(session.state.revealed.length, 1);

  // A local timeout is driven by the page clock; force it through the shared helper.
  session = timeoutLocalTurn(session);
  assert.equal(session.screen, 'handoff');
  assert.equal(session.handoff.toId, 'local-2');
  assert.equal(session.state.status, 'playing');
});

test('rematch resets the board and scores while keeping player names', () => {
  const original = createLocalSession('tic_tac_toe', ['Ada', 'Ben']);
  let session = act(original, { type: 'move', cell: 0 });
  session = continueHandoff(session);
  session = act(session, { type: 'move', cell: 3 });
  session = continueHandoff(session);
  session = act(session, { type: 'move', cell: 1 });
  session = continueHandoff(session);
  session = act(session, { type: 'move', cell: 4 });
  session = continueHandoff(session);
  session = act(session, { type: 'move', cell: 2 });
  assert.equal(session.screen, 'result');

  const replay = rematchSession(session);
  assert.equal(replay.screen, 'playing');
  assert.deepEqual(replay.names, ['Ada', 'Ben']);
  assert.equal(replay.state.board.every((cell) => cell === null), true);
  assert.deepEqual(replay.state.scores, {});
  assert.equal(session.state.status, 'finished', 'the finished session must not be mutated by a rematch');
  assert.equal(original.state.status, 'playing', 'the starting session must stay untouched by cloned moves');
});
