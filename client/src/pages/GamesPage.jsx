import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { roomApi, errorMessage } from '../api/client.js';
import GameCard from '../components/GameCard.jsx';
import Icon from '../components/Icon.jsx';
import { Spinner, EmptyState } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';

const FILTERS = ['All games', 'Strategy', 'Party', 'Memory', 'Reflex', 'Quick'];

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All games');
  const toast = useToast();

  useEffect(() => {
    roomApi.games()
      .then(({ data }) => setGames(data.games))
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (filter === 'All games' ? games : games.filter((game) => game.tags.includes(filter))),
    [games, filter],
  );

  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="games" size={15} /> Game library</span>
          <h1>Choose your arena</h1>
          <p className="muted">Every game is live, server-validated and ready for your crew.</p>
        </div>
        <div className="page-head__badge"><Icon name="bolt" size={16} /> 5 games online</div>
      </div>

      <div className="mode-switch" aria-label="Play mode">
        <span className="mode-switch__option is-active"><Icon name="wifi" size={16} /> Online</span>
        <Link to="/local" className="mode-switch__option"><Icon name="gamepad" size={16} /> Local</Link>
      </div>

      <div className="filter-row">
        {FILTERS.map((item) => (
          <button key={item} className={`filter-chip ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      {loading ? <Spinner label="Loading games..." /> : visible.length ? (
        <div className="games-grid">
          {visible.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      ) : (
        <EmptyState title="No games in this category" text="Try another filter to find your next favourite." />
      )}
    </div>
  );
}
