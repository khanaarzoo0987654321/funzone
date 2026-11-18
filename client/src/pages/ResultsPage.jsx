import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { matchApi, errorMessage } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { Confetti, EmptyState, Spinner, StatusPill } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const NAMES = {
  tic_tac_toe: 'Tic Tac Toe', rock_paper_scissors: 'Rock Paper Scissors', connect_four: 'Connect Four',
  memory_match: 'Memory Match', quick_tap: 'Quick Tap',
};

export default function ResultsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    matchApi.get(id)
      .then(({ data }) => setMatch(data.match))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  // If the other player requests a rematch, follow them back to the waiting room.
  useEffect(() => {
    if (!socket) return undefined;
    const roomCode = sessionStorage.getItem('funzone_room_code');
    const onState = (state) => {
      if (roomCode && state?.code === roomCode && state.status === 'waiting') {
        toast.info('Rematch started — heading back to the waiting room.');
        navigate(`/room/${roomCode}`);
      }
    };
    socket.on('room:state', onState);
    return () => socket.off('room:state', onState);
  }, [socket, navigate, toast]);

  if (loading) return <div className="page center"><Spinner label="Loading match results..." /></div>;
  if (error || !match) return <div className="page container"><EmptyState icon="x" title="Result not found" text={error} action={<Link to="/games" className="btn btn--primary">Back to games</Link>} /></div>;

  const winner = match.players?.find((p) => p.user_id === match.winner_id);
  const iWon = match.winner_id === user.id;
  const code = sessionStorage.getItem('funzone_room_code');

  function rematch() {
    if (code) {
      socket?.emit('room:rematch');
      toast.info('Rematch requested — get ready!');
      navigate(`/room/${code}`);
    } else navigate(`/rooms?game=${match.game_type}`);
  }

  const sorted = [...(match.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="page container results-page">
      {(iWon || winner) && <Confetti />}
      <div className="results-hero">
        <span className="eyebrow"><Icon name="trophy" size={15} /> Match complete</span>
        <div className={`results-icon ${match.is_draw ? 'is-draw' : iWon ? 'is-win' : ''}`}>
          <Icon name={match.is_draw ? 'refresh' : iWon ? 'trophy' : 'medal'} size={40} />
        </div>
        <h1>{match.is_draw ? 'It’s a draw!' : iWon ? 'You won the match!' : `${winner?.username || 'Opponent'} wins!`}</h1>
        <p className="muted">{NAMES[match.game_type] || match.game_type} · {new Date(match.started_at).toLocaleString()} · {match.duration_seconds}s</p>
        <div className="results-actions">
          <button className="btn btn--primary btn--lg" onClick={rematch}><Icon name="refresh" size={17} /> Rematch</button>
          <Link to="/games" className="btn btn--glass btn--lg">Play something else</Link>
          <Link to="/leaderboard" className="btn btn--ghost btn--lg"><Icon name="chart" size={17} /> Leaderboard</Link>
        </div>
      </div>

      <div className="panel results-table">
        <div className="panel__head panel__head--plain"><div><h2>Final standings</h2><p className="muted">Validated by the game server</p></div><StatusPill tone="success">Saved</StatusPill></div>
        <div className="standings">
          {sorted.map((player, index) => (
            <div key={player.user_id} className={`standing ${player.user_id === match.winner_id ? 'is-winner' : ''} ${player.user_id === user.id ? 'is-me' : ''}`}>
              <span className="standing__rank">{index === 0 && !match.is_draw ? '🥇' : index + 1}</span>
              <Avatar player={player} size={44} online />
              <div className="standing__name"><strong>{player.username}{player.user_id === user.id ? ' (you)' : ''}</strong><span className="muted">{player.outcome}</span></div>
              <strong className="standing__score">{player.score} <small>pts</small></strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
