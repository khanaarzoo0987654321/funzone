import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { Confetti, StatusPill } from '../components/UI.jsx';
import { getLocalGame } from './localSession.js';

const REASON_LABELS = {
  'three-in-a-row': 'Three in a row',
  'connect-four': 'Four in a row',
  'board-full': 'Board full',
  'all-pairs-found': 'Every pair found',
  'rounds-complete': 'All rounds played',
  'time-up': 'Time up',
  timeout: 'Time up',
  complete: 'Game complete',
};

export default function LocalResults({ session, onRematch, onExit }) {
  const game = getLocalGame(session.gameId);
  const result = session.result || {};
  const winners = new Set(result.winnerIds || []);
  const standings = [...session.players].sort(
    (a, b) => (result.scores?.[b.id] || 0) - (result.scores?.[a.id] || 0),
  );
  const winnerNames = standings.filter((player) => winners.has(player.id)).map((player) => player.username);
  const title = result.isDraw ? 'Friendly draw!' : `${winnerNames.join(' & ')} wins!`;

  return (
    <div className="page container results-page local-results">
      <div className="panel results-hero">
        <Confetti />
        <div className={`results-icon ${result.isDraw ? 'is-draw' : 'is-win'}`}>
          <Icon name={result.isDraw ? 'refresh' : 'trophy'} size={44} />
        </div>
        <span className="eyebrow"><Icon name={game?.icon || 'sparkles'} size={15} /> {game?.name} · local match</span>
        <h1>{title}</h1>
        <p className="muted">{REASON_LABELS[result.reason] || 'Match complete'} — no account needed, no results saved online.</p>
        <StatusPill tone={result.isDraw ? 'warning' : 'success'}>{result.isDraw ? 'Draw' : 'Winner'}</StatusPill>
      </div>

      <div className="panel local-results__standings">
        <div className="panel__head panel__head--plain"><div><h2>Final standings</h2><p className="muted">Scores from this local match only</p></div></div>
        <div className="standings">
          {standings.map((player, index) => (
            <div key={player.id} className={`standing ${winners.has(player.id) ? 'is-winner' : ''}`}>
              <span className="standing__rank">{index + 1}</span>
              <Avatar player={player} size={42} />
              <span className="standing__name"><strong>{player.username}</strong><span>{winners.has(player.id) ? 'Winner' : 'Player'}</span></span>
              <span className="standing__score">{result.scores?.[player.id] || 0}<small> pts</small></span>
            </div>
          ))}
        </div>
      </div>

      <div className="results-actions">
        <button className="btn btn--primary btn--lg" onClick={onRematch}><Icon name="refresh" size={18} /> Rematch</button>
        <button className="btn btn--glass btn--lg" onClick={onExit}><Icon name="games" size={18} /> Choose another game</button>
        <Link to="/play" className="btn btn--ghost btn--lg">Change play mode</Link>
      </div>
    </div>
  );
}
