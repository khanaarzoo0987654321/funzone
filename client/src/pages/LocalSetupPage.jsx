import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLocalGame } from '../local/LocalGameContext.jsx';
import { getLocalGame } from '../local/localSession.js';

export default function LocalSetupPage() {
  const { gameId } = useParams();
  const game = getLocalGame(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const { start } = useLocalGame();
  const [count, setCount] = useState(game?.minPlayers || 2);
  const [names, setNames] = useState(() => Array.from({ length: 8 }, (_, index) => `Player ${index + 1}`));

  useEffect(() => {
    if (!game) return;
    setCount(game.minPlayers);
    setNames(Array.from({ length: 8 }, (_, index) => `Player ${index + 1}`));
  }, [game?.id]);

  if (!game) {
    return (
      <div className="page container">
        <EmptyState
          icon="compass"
          title="That local game is not available"
          text="Choose one of the five FunZone games to set up a pass-and-play match."
          action={<Link to="/local" className="btn btn--primary">Back to local games</Link>}
        />
      </div>
    );
  }

  const setName = (index, value) => {
    setNames((previous) => previous.map((name, i) => (i === index ? value : name)));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const chosen = names.slice(0, count).map((name) => name.trim());
    if (chosen.some((name) => !name)) {
      toast.error('Give every player a display name.');
      return;
    }
    if (new Set(chosen.map((name) => name.toLowerCase())).size !== chosen.length) {
      toast.error('Each player needs a different name.');
      return;
    }
    start(game.id, chosen);
    navigate(`/local/play/${game.id}`);
  };

  const playerOptions = Array.from({ length: game.maxPlayers - game.minPlayers + 1 }, (_, index) => game.minPlayers + index);

  return (
    <div className="page container local-setup">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="users" size={15} /> Player setup</span>
          <h1>Set up {game.name}</h1>
          <p className="muted">{game.instruction}</p>
        </div>
        <div className="page-head__badge"><Icon name="gamepad" size={16} /> Local match</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="panel local-setup__panel">
          <div className="local-setup__head">
            <span className={`local-setup__icon local-setup__icon--${game.color}`}><Icon name={game.icon} size={27} /></span>
            <div><h2>How many players?</h2><p className="muted">Everyone shares this device. Names can be anything you like.</p></div>
          </div>

          <div className="count-options" role="group" aria-label="Number of players">
            {playerOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`count-option ${count === option ? 'is-active' : ''}`}
                onClick={() => setCount(option)}
              >
                <strong>{option}</strong><span>players</span>
              </button>
            ))}
          </div>

          <div className="local-name-list">
            {Array.from({ length: count }, (_, index) => (
              <label key={index} className="local-name-row">
                <span className="local-name-row__index">{index + 1}</span>
                <input
                  value={names[index]}
                  onChange={(event) => setName(index, event.target.value)}
                  maxLength={18}
                  placeholder={`Player ${index + 1}`}
                  aria-label={`Player ${index + 1} name`}
                />
                <span className="pill pill--soft">{index === 0 ? 'Starts' : `Turn ${index + 1}`}</span>
              </label>
            ))}
          </div>

          <div className="local-setup__actions">
            <button type="submit" className="btn btn--primary btn--lg"><Icon name="bolt" size={18} /> Start local game</button>
            <Link to="/local" className="btn btn--ghost">Back to games</Link>
          </div>
        </div>
      </form>

      <div className="local-privacy-note panel">
        <span className="panel__icon panel__icon--cyan"><Icon name="eyeOff" size={22} /></span>
        <div>
          <h3>Privacy between turns</h3>
          <p className="muted">{game.privacy === 'choice' ? 'Each player will get a private choice screen.' : game.privacy === 'cards' ? 'The board will be hidden between turns so everyone gets a fair look.' : 'A pass-the-device screen will show who plays next.'}</p>
        </div>
      </div>
    </div>
  );
}
