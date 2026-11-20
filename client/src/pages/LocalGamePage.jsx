import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { TimerBar } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import TicTacToe from '../games/TicTacToe.jsx';
import ConnectFour from '../games/ConnectFour.jsx';
import RockPaperScissors from '../games/RockPaperScissors.jsx';
import MemoryMatch from '../games/MemoryMatch.jsx';
import QuickTap from '../games/QuickTap.jsx';
import LocalHandoff from '../local/LocalHandoff.jsx';
import { useLocalGame } from '../local/LocalGameContext.jsx';
import LocalResults from '../local/LocalResults.jsx';
import {
  applyLocalAction,
  completeQuickTapTurn,
  continueHandoff,
  continueReveal,
  continueReview,
  expectedActor,
  getLocalGame,
  getPlayer,
  tickLocalSession,
  timeoutLocalTurn,
} from '../local/localSession.js';

const GAME_COMPONENTS = {
  tic_tac_toe: TicTacToe,
  connect_four: ConnectFour,
  rock_paper_scissors: RockPaperScissors,
  memory_match: MemoryMatch,
  quick_tap: QuickTap,
};

const TIMED_GAMES = new Set(['tic_tac_toe', 'connect_four', 'memory_match']);

export default function LocalGamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, update, rematch, clear } = useLocalGame();
  const [now, setNow] = useState(() => Date.now());
  const game = getLocalGame(gameId);
  const GameComponent = GAME_COMPONENTS[gameId];

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      update((previous) => {
        if (!previous || previous.gameId !== gameId || previous.screen !== 'playing') return previous;
        if (previous.state.status !== 'playing') return previous;

        if (previous.gameId === 'quick_tap') {
          if (current >= previous.state.endsAt) return completeQuickTapTurn(previous, { now: current });
          return tickLocalSession(previous, current);
        }

        if (previous.state.deadline && current >= previous.state.deadline) {
          return timeoutLocalTurn(previous, { now: current });
        }
        return previous;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [gameId, update]);

  if (!game || !GameComponent) return <Navigate to="/local" replace />;
  if (!session || session.gameId !== gameId) return <Navigate to={`/local/setup/${gameId}`} replace />;
  if (session.screen === 'result') {
    return (
      <LocalResults
        session={session}
        onRematch={() => { rematch(); setNow(Date.now()); }}
        onExit={() => { clear(); navigate('/local'); }}
      />
    );
  }

  const actorId = expectedActor(session) || session.players[0].id;
  const activePlayer = getPlayer(session, actorId);
  const canAct = session.screen === 'playing' && session.state.status === 'playing';
  const noop = () => {};

  const act = (action) => {
    const outcome = applyLocalAction(session, action);
    if (outcome.error) {
      toast.error(outcome.error);
      return;
    }
    update(() => outcome.session);
  };

  const handleContinue = () => update((previous) => (previous ? continueHandoff(previous, { now: Date.now() }) : previous));
  const handleReview = () => update((previous) => (previous ? continueReview(previous) : previous));
  const handleReveal = () => update((previous) => (previous ? continueReveal(previous) : previous));
  const handleExit = () => { clear(); navigate('/local'); };

  const extraProps = gameId === 'rock_paper_scissors'
    ? { privateChoices: true, footerNote: 'All five rounds are scored right here on this device.' }
    : {};

  const turnInfo = gameId === 'quick_tap'
    ? `Turn ${session.quickTapTurns} of ${session.players.length}`
    : gameId === 'rock_paper_scissors'
      ? `Round ${session.state.round} of ${session.state.totalRounds}`
      : 'Alternate turns';

  return (
    <div className="page container game-page local-game-page">
      <div className="game-topbar">
        <div>
          <span className="eyebrow"><Icon name="gamepad" size={15} /> Local multiplayer · pass &amp; play</span>
          <h1>{game.name}</h1>
        </div>
        <div className="game-topbar__players">
          {session.players.map((player) => (
            <span key={player.id} className={`game-chip ${player.id === actorId ? 'is-me' : ''}`}>
              <Avatar player={player} size={24} /> {player.username}
            </span>
          ))}
        </div>
      </div>

      <div className="local-toolbar">
        <span className="pill pill--soft"><Icon name="refresh" size={14} /> {turnInfo}</span>
        <span className="pill pill--info"><Icon name="target" size={14} /> {activePlayer?.username || 'Player'} is up</span>
        <button className="link-arrow link-button" onClick={handleExit}>Game selection <Icon name="arrow" size={15} /></button>
      </div>

      {canAct && TIMED_GAMES.has(gameId) && session.state.deadline && (
        <TimerBar
          deadline={session.state.deadline}
          serverNow={now}
          total={game.turnMs}
          label={`${activePlayer?.username || 'Player'} has the floor`}
        />
      )}

      <div className={`game-arena game-arena--${game.color}`}>
        {session.screen === 'handoff' ? (
          <LocalHandoff session={session} onContinue={handleContinue} onExit={handleExit} />
        ) : (
          <>
            {session.screen === 'review' && (
              <div className="local-step-banner">
                <Icon name="cards" size={18} /> {session.review?.message}
              </div>
            )}
            {session.screen === 'reveal' && (
              <div className="local-step-banner local-step-banner--win">
                <Icon name="trophy" size={18} /> Round {session.state.round} revealed — scores are updated.
              </div>
            )}

            <GameComponent
              state={session.state}
              myId={actorId}
              now={now}
              act={canAct ? act : noop}
              {...extraProps}
            />

            {session.screen === 'review' && (
              <div className="local-stage-actions">
                <button className="btn btn--primary" onClick={handleReview}><Icon name="arrow" size={17} /> Continue to handoff</button>
              </div>
            )}
            {session.screen === 'reveal' && (
              <div className="local-stage-actions">
                <button className="btn btn--primary" onClick={handleReveal}><Icon name="refresh" size={17} /> Next round</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="local-foot-actions">
        <p className="muted"><Icon name="lock" size={14} /> Local scores stay on this device. Nothing is sent to a server.</p>
        <Link to="/play" className="btn btn--ghost btn--sm">Change play mode</Link>
      </div>
    </div>
  );
}
