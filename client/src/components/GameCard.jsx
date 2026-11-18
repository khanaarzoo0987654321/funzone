import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function GameCard({ game, showPlay = true }) {
  return (
    <Link to={showPlay ? `/rooms?game=${game.id}` : '#'} className={`game-card game-card--${game.color}`}>
      <div className="game-card__art">
        <span className="game-card__glow" />
        <span className="game-card__icon"><Icon name={game.icon} size={46} /></span>
        <span className="game-card__short">{game.short}</span>
      </div>
      <div className="game-card__body">
        <div className="game-card__top">
          <h3>{game.name}</h3>
          <span className="pill pill--soft">{game.difficulty}</span>
        </div>
        <p className="muted">{game.tagline}</p>
        <p className="game-card__desc">{game.description}</p>
        <div className="game-card__tags">
          {game.tags.map((tag) => <span key={tag}>#{tag.toLowerCase()}</span>)}
        </div>
      </div>
      <div className="game-card__footer">
        <span><Icon name="users" size={15} /> {game.minPlayers === game.maxPlayers ? game.maxPlayers : `${game.minPlayers}–${game.maxPlayers}`} players</span>
        <span><Icon name="clock" size={15} /> {game.duration}</span>
        {showPlay && <span className="game-card__play">Play <Icon name="arrow" size={15} /></span>}
      </div>
    </Link>
  );
}
