import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { LOCAL_GAMES } from '../local/localSession.js';

export default function LocalGamesPage() {
  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="gamepad" size={15} /> Local multiplayer</span>
          <h1>Pass the device. Play together.</h1>
          <p className="muted">All five FunZone games on one device, in one browser window. No accounts, no room codes.</p>
        </div>
        <div className="page-head__badge"><Icon name="bolt" size={16} /> No account needed</div>
      </div>

      <div className="mode-switch" aria-label="Play mode">
        <span className="mode-switch__option is-active"><Icon name="gamepad" size={16} /> Local</span>
        <Link to="/games" className="mode-switch__option"><Icon name="wifi" size={16} /> Online</Link>
      </div>

      <div className="local-games-grid">
        {LOCAL_GAMES.map((game) => (
          <Link key={game.id} to={`/local/setup/${game.id}`} className={`local-game-card local-game-card--${game.color}`}>
            <div className="local-game-card__head">
              <span className="local-game-card__icon"><Icon name={game.icon} size={32} /></span>
              <span className="local-game-card__short">{game.short}</span>
            </div>
            <h3>{game.name}</h3>
            <p className="muted">{game.tagline}</p>
            <p className="local-game-card__desc">{game.instruction}</p>
            <div className="local-game-card__meta">
              <span><Icon name="users" size={15} /> {game.minPlayers === game.maxPlayers ? game.maxPlayers : `${game.minPlayers}–${game.maxPlayers}`} players</span>
              <span><Icon name="clock" size={15} /> {game.duration}</span>
            </div>
            <span className="local-game-card__cta">Set up players <Icon name="arrow" size={16} /></span>
          </Link>
        ))}
      </div>

      <div className="local-privacy-note panel">
        <span className="panel__icon panel__icon--violet"><Icon name="eyeOff" size={22} /></span>
        <div>
          <h3>Built for shared screens</h3>
          <p className="muted">Games with hidden choices or cards use a pass-the-device screen so the next player only sees what they should.</p>
        </div>
      </div>

      <div className="center section__more">
        <Link to="/play" className="btn btn--glass"><Icon name="refresh" size={16} /> Compare play modes</Link>
      </div>
    </div>
  );
}
