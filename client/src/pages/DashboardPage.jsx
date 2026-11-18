import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, matchApi, roomApi, errorMessage } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import GameCard from '../components/GameCard.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, Spinner, StatusPill } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const GAME_NAMES = {
  tic_tac_toe: 'Tic Tac Toe', rock_paper_scissors: 'Rock Paper Scissors', connect_four: 'Connect Four',
  memory_match: 'Memory Match', quick_tap: 'Quick Tap',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      matchApi.list({ mine: 'true', limit: 5 }),
      roomApi.games(),
      authApi.achievements(),
    ])
      .then(([history, gameList, ach]) => {
        setMatches(history.data.matches);
        setGames(gameList.data.games);
        setAchievements(ach.data.achievements);
      })
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const winRate = user?.total_matches ? Math.round((user.wins / user.total_matches) * 100) : 0;
  const xpIntoLevel = (user?.xp || 0) % 150;
  const xpProgress = Math.round((xpIntoLevel / 150) * 100);

  const stats = [
    { label: 'Matches played', value: user?.total_matches || 0, icon: 'games', color: 'violet' },
    { label: 'Wins', value: user?.wins || 0, icon: 'trophy', color: 'amber' },
    { label: 'Win rate', value: `${winRate}%`, icon: 'chart', color: 'cyan' },
    { label: 'Level', value: user?.level || 1, icon: 'star', color: 'pink' },
  ];

  return (
    <div className="page container dashboard">
      <div className="dash-hero">
        <div className="dash-hero__text">
          <span className="eyebrow"><Icon name="sparkles" size={15} /> Player hub</span>
          <h1>Hey, {user?.username} <span className="wave">👋</span></h1>
          <p className="muted">Your arena is ready. Pick a game or check how you are climbing.</p>
          <div className="dash-hero__actions">
            <Link to="/games" className="btn btn--primary">Play a game <Icon name="arrow" size={17} /></Link>
            <Link to="/rooms" className="btn btn--glass">Create a room</Link>
          </div>
        </div>
        <div className="level-card">
          <Avatar player={user} size={64} online ring />
          <div className="level-card__body">
            <div className="level-card__top"><strong>Level {user?.level || 1}</strong><span>{user?.xp || 0} XP</span></div>
            <div className="progress"><div style={{ width: `${xpProgress}%` }} /></div>
            <span className="muted">{150 - xpIntoLevel} XP to the next level</span>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card stat-card--${stat.color}`}>
            <span className="stat-card__icon"><Icon name={stat.icon} size={21} /></span>
            <div><strong>{stat.value}</strong><span>{stat.label}</span></div>
          </div>
        ))}
      </div>

      <div className="dashboard__grid">
        <section className="panel">
          <div className="panel__head panel__head--plain"><div><h2>Recent matches</h2><p className="muted">Your last five showdowns</p></div><Link to="/leaderboard" className="link-arrow">Leaderboard <Icon name="arrow" size={15} /></Link></div>
          {loading ? <Spinner size={26} /> : matches.length ? (
            <div className="match-list">
              {matches.map((match) => {
                const me = match.players?.find((p) => p.user_id === user.id);
                const won = match.winner_id === user.id;
                return (
                  <div key={match.id} className="match-row">
                    <span className={`match-row__badge ${won ? 'is-win' : match.is_draw ? 'is-draw' : 'is-loss'}`}><Icon name={won ? 'trophy' : match.is_draw ? 'refresh' : 'target'} size={17} /></span>
                    <div className="match-row__main">
                      <strong>{GAME_NAMES[match.game_type] || match.game_type}</strong>
                      <span className="muted">{new Date(match.started_at).toLocaleString()}</span>
                    </div>
                    <span className="match-row__score">{me?.score ?? 0} pts</span>
                    <StatusPill tone={won ? 'success' : match.is_draw ? 'warning' : 'danger'}>{won ? 'Won' : match.is_draw ? 'Draw' : 'Lost'}</StatusPill>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="games" title="No matches yet" text="Your first game will show up right here." action={<Link to="/games" className="btn btn--primary btn--sm">Find a game</Link>} />
          )}
        </section>

        <section className="panel">
          <div className="panel__head panel__head--plain"><div><h2>Achievements</h2><p className="muted">Small wins add up</p></div><Link to={`/players/${user.id}`} className="link-arrow">All <Icon name="arrow" size={15} /></Link></div>
          <div className="achievement-strip">
            {achievements.slice(0, 5).map((achievement) => (
              <div key={achievement.id} className={`achievement-mini ${achievement.unlocked ? 'is-unlocked' : ''}`} title={achievement.description}>
                <span>{achievement.unlocked ? '🏆' : '🔒'}</span>
                <small>{achievement.name}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section__head"><div><span className="eyebrow"><Icon name="bolt" size={15} /> Quick start</span><h2>Jump back in</h2></div></div>
        <div className="games-grid games-grid--preview">
          {games.slice(0, 3).map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      </section>
    </div>
  );
}
