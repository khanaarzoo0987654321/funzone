import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi, userApi, errorMessage } from '../api/client.js';
import Avatar, { AVATAR_COLORS, AVATAR_EMOJI } from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, Spinner, StatusPill } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const GAME_NAMES = {
  tic_tac_toe: 'Tic Tac Toe', rock_paper_scissors: 'Rock Paper Scissors', connect_four: 'Connect Four',
  memory_match: 'Memory Match', quick_tap: 'Quick Tap',
};

export default function ProfilePage() {
  const { id } = useParams();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const targetId = id || user?.id;
  const isMe = targetId === user?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ avatar: user?.avatar, avatarColor: user?.avatar_color, bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    userApi.get(targetId)
      .then(({ data: result }) => setData(result))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [targetId]);

  useEffect(() => {
    if (user) setForm({ avatar: user.avatar, avatarColor: user.avatar_color, bio: user.bio || '' });
  }, [user?.avatar, user?.avatar_color, user?.bio]);

  async function save() {
    setSaving(true);
    const result = await authApi.updateProfile({ avatar: form.avatar, avatarColor: form.avatarColor, bio: form.bio });
    setSaving(false);
    if (result.ok) {
      await refresh();
      setData((current) => ({ ...current, player: { ...current.player, ...result.data.profile } }));
      setEditing(false);
      toast.success('Profile updated!');
    } else toast.error(result.message || 'Could not save your profile.');
  }

  if (loading) return <div className="page center"><Spinner label="Loading player profile..." /></div>;
  if (!data) return <div className="page container"><EmptyState icon="user" title="Player not found" text="This player may have left the arena." action={<Link to="/leaderboard" className="btn btn--primary">Leaderboard</Link>} /></div>;

  const player = data.player;
  const winRate = player.total_matches ? Math.round((player.wins / player.total_matches) * 100) : 0;
  const stats = [
    { label: 'Matches', value: player.total_matches, icon: 'games' },
    { label: 'Wins', value: player.wins, icon: 'trophy' },
    { label: 'Draws', value: player.draws, icon: 'refresh' },
    { label: 'Win rate', value: `${winRate}%`, icon: 'chart' },
    { label: 'Level', value: player.level, icon: 'star' },
    { label: 'XP', value: player.xp, icon: 'bolt' },
  ];

  return (
    <div className="page container profile-page">
      <div className="profile-hero">
        <Avatar player={player} size={104} ring online />
        <div className="profile-hero__info">
          <span className="eyebrow"><Icon name="user" size={15} /> {isMe ? 'Your player profile' : 'Player profile'}</span>
          <h1>{player.username}</h1>
          <p className="muted">{player.bio || 'No bio yet — this player likes to keep it mysterious.'}</p>
          <div className="profile-hero__badges"><StatusPill tone="success">Level {player.level}</StatusPill><StatusPill tone="info">{player.xp} XP</StatusPill><StatusPill tone="neutral">Joined {new Date(player.created_at).toLocaleDateString()}</StatusPill></div>
        </div>
        {isMe && !editing && <button className="btn btn--glass" onClick={() => setEditing(true)}><Icon name="edit" size={17} /> Edit profile</button>}
      </div>

      {editing && (
        <div className="panel profile-editor">
          <div className="panel__head panel__head--plain"><div><h2>Customise your look</h2><p className="muted">Changes appear everywhere in FunZone.</p></div></div>
          <div className="avatar-grid">
            {Object.entries(AVATAR_EMOJI).slice(0, 12).map(([key, emoji]) => (
              <button key={key} className={`avatar-option ${form.avatar === key ? 'is-selected' : ''}`} onClick={() => setForm((c) => ({ ...c, avatar: key }))}>{emoji}</button>
            ))}
          </div>
          <div className="color-grid">
            {AVATAR_COLORS.map((color) => <button key={color} className={`color-option color-option--${color} ${form.avatarColor === color ? 'is-selected' : ''}`} onClick={() => setForm((c) => ({ ...c, avatarColor: color }))} aria-label={color} />)}
          </div>
          <label className="field"><span>Bio</span><textarea value={form.bio} maxLength={240} rows={2} onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))} placeholder="Tell everyone your gaming motto..." /></label>
          <div className="row-gap"><button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button><button className="btn btn--ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      )}

      <div className="stat-grid stat-grid--six">
        {stats.map((stat) => <div key={stat.label} className="stat-card stat-card--violet"><span className="stat-card__icon"><Icon name={stat.icon} size={19} /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>)}
      </div>

      <div className="dashboard__grid">
        <section className="panel">
          <div className="panel__head panel__head--plain"><div><h2>Achievements</h2><p className="muted">{data.achievements.length} of {data.achievements.length ? 5 : 0} unlocked</p></div></div>
          <div className="achievement-grid">
            {data.achievements.map((achievement) => (
              <div key={achievement.id} className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : ''}`}>
                <span className="achievement-card__icon">{achievement.unlocked ? <Icon name={achievement.icon} size={22} /> : '🔒'}</span>
                <div><strong>{achievement.name}</strong><p className="muted">{achievement.description}</p></div>
                {achievement.unlocked && <StatusPill tone="success">Unlocked</StatusPill>}
              </div>
            ))}
            {!data.achievements.length && <p className="muted">No achievements yet — play a match to earn your first!</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head panel__head--plain"><div><h2>Recent matches</h2><p className="muted">Last five games</p></div></div>
          {data.recentMatches.length ? data.recentMatches.map((match) => {
            const me = match.players?.find((p) => p.user_id === player.id);
            return <div key={match.id} className="match-row"><span className={`match-row__badge ${match.winner_id === player.id ? 'is-win' : match.is_draw ? 'is-draw' : 'is-loss'}`}><Icon name="games" size={16} /></span><div className="match-row__main"><strong>{GAME_NAMES[match.game_type] || match.game_type}</strong><span className="muted">{new Date(match.started_at).toLocaleDateString()}</span></div><span className="match-row__score">{me?.score ?? 0} pts</span></div>;
          }) : <EmptyState icon="games" title="No matches yet" text="This player has not played a ranked match." />}
        </section>
      </div>
    </div>
  );
}
