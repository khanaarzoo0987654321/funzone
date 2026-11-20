import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

const MODES = [
  {
    to: '/games',
    icon: 'wifi',
    color: 'cyan',
    label: 'Online Multiplayer',
    tag: 'Play anywhere',
    description: 'Create or join a room, share a code and challenge friends over the internet.',
    points: ['Account or guest room flow', 'Live Socket.IO turns', 'Global leaderboard'],
    cta: 'Play online',
  },
  {
    to: '/local',
    icon: 'gamepad',
    color: 'violet',
    label: 'Local Multiplayer',
    tag: 'Pass & play',
    description: 'Gather everyone around one device. No account, no room code, no internet matchmaking.',
    points: ['No sign-up needed', 'All five games included', 'Hidden-choice handoff screens'],
    cta: 'Play locally',
  },
];

export default function PlayPage() {
  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="gamepad" size={15} /> Choose your play mode</span>
          <h1>How do you want to play?</h1>
          <p className="muted">Same five games, two ways to enjoy them. Pick the mode that fits your crew.</p>
        </div>
        <div className="page-head__badge"><Icon name="sparkles" size={16} /> Both modes, one arcade</div>
      </div>

      <div className="mode-grid">
        {MODES.map((mode) => (
          <Link key={mode.label} to={mode.to} className={`mode-card mode-card--${mode.color}`}>
            <div className="mode-card__top">
              <span className="mode-card__icon"><Icon name={mode.icon} size={34} /></span>
              <span className="pill pill--soft">{mode.tag}</span>
            </div>
            <h2>{mode.label}</h2>
            <p className="muted">{mode.description}</p>
            <ul className="mode-card__points">
              {mode.points.map((point) => <li key={point}><Icon name="check" size={15} /> {point}</li>)}
            </ul>
            <span className="btn btn--primary btn--block mode-card__cta">{mode.cta} <Icon name="arrow" size={17} /></span>
          </Link>
        ))}
      </div>

      <div className="center section__more">
        <Link to="/games" className="btn btn--glass">Browse the online game library <Icon name="arrow" size={16} /></Link>
      </div>
    </div>
  );
}
