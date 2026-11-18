import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchApi, errorMessage } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, Spinner, StatusPill } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TABS = [
  { id: 'all', label: 'All games' },
  { id: 'tic_tac_toe', label: 'Tic Tac Toe' },
  { id: 'rock_paper_scissors', label: 'RPS' },
  { id: 'connect_four', label: 'Connect Four' },
  { id: 'memory_match', label: 'Memory' },
  { id: 'quick_tap', label: 'Quick Tap' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    matchApi.leaderboard({ gameType: tab, limit: 50 })
      .then(({ data }) => { setPlayers(data.players); setMe(data.me); })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [tab]);

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="page container leaderboard-page">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="trophy" size={15} /> Global rankings</span>
          <h1>Leaderboard</h1>
          <p className="muted">XP earned from every validated match. Keep playing to climb.</p>
        </div>
        {me && <div className="rank-card"><Avatar player={me} size={38} /><div><small>Your rank</small><strong>#{me.rank}</strong></div><StatusPill tone="success">{me.xp} XP</StatusPill></div>}
      </div>

      <div className="filter-row">
        {TABS.map((item) => <button key={item.id} className={`filter-chip ${tab === item.id ? 'is-active' : ''}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>

      {loading ? <Spinner label="Loading rankings..." /> : !players.length ? (
        <EmptyState icon="trophy" title="No ranked players yet" text="Play a match in this game to be the first on the board." action={<Link to="/games" className="btn btn--primary">Find a game</Link>} />
      ) : (
        <>
          <div className="podium">
            {[podium[1], podium[0], podium[2]].map((player, idx) => player && (
              <div key={player.user_id} className={`podium__slot podium__slot--${idx === 1 ? 'first' : idx === 0 ? 'second' : 'third'}`}>
                <span className="podium__medal">{idx === 1 ? '🥇' : idx === 0 ? '🥈' : '🥉'}</span>
                <Avatar player={player} size={idx === 1 ? 72 : 58} ring />
                <strong>{player.username}</strong>
                <span className="muted">{player.xp} XP</span>
                <div className="podium__block">#{player.rank}</div>
              </div>
            ))}
          </div>

          <div className="panel table-panel">
            <div className="table-head"><span>Rank</span><span>Player</span><span>Level</span><span>Wins</span><span>Win rate</span><span>XP</span></div>
            {rest.map((player) => (
              <div key={player.user_id} className={`table-row ${player.user_id === user.id ? 'is-me' : ''}`}>
                <span>#{player.rank}</span>
                <span className="table-row__player"><Avatar player={player} size={34} /><Link to={`/players/${player.user_id}`}>{player.username}</Link></span>
                <span>{player.level}</span><span>{player.wins}</span><span>{player.win_rate}%</span><span><b>{player.xp}</b></span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
