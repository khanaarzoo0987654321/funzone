import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getGame } from '../games/catalog.js';
import TicTacToe from '../games/TicTacToe.jsx';
import ConnectFour from '../games/ConnectFour.jsx';
import RockPaperScissors from '../games/RockPaperScissors.jsx';
import MemoryMatch from '../games/MemoryMatch.jsx';
import QuickTap from '../games/QuickTap.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { Spinner, TimerBar, EmptyState } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const COMPONENTS = {
  tic_tac_toe: TicTacToe,
  connect_four: ConnectFour,
  rock_paper_scissors: RockPaperScissors,
  memory_match: MemoryMatch,
  quick_tap: QuickTap,
};

const TIMERS = {
  tic_tac_toe: 20_000,
  connect_four: 20_000,
  rock_paper_scissors: 15_000,
  memory_match: 25_000,
  quick_tap: 30_000,
};

export default function GamePage() {
  const { code } = useParams();
  const upperCode = (code || '').toUpperCase();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket || !connected) return undefined;
    sessionStorage.setItem('funzone_room_code', upperCode);
    socket.emit('room:join', { code: upperCode });

    const onState = (state) => {
      setView(state);
      if (state.status === 'waiting' && view?.status === 'playing') {
        toast.info('Rematch requested — heading back to the waiting room.');
        navigate(`/room/${upperCode}`, { replace: true });
      }
    };
    const onEnd = (summary) => {
      sessionStorage.setItem('funzone_room_code', upperCode);
      navigate(`/results/${summary.match.id}`, { replace: true, state: { summary } });
    };
    const onError = ({ message }) => toast.error(message);
    const onNotice = ({ type, message }) => toast[type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'](message);

    socket.on('room:state', onState);
    socket.on('game:ended', onEnd);
    socket.on('game:error', onError);
    socket.on('notification', onNotice);
    return () => {
      socket.off('room:state', onState);
      socket.off('game:ended', onEnd);
      socket.off('game:error', onError);
      socket.off('notification', onNotice);
    };
  }, [socket, connected, upperCode]);

  if (!connected || !view) return <div className="page center"><Spinner label="Connecting to the match..." /></div>;
  if (view.status !== 'playing' || !view.gameState) {
    return <div className="page container"><EmptyState icon="clock" title="The match is not active" text="Return to the waiting room to get ready." action={<Link to={`/room/${upperCode}`} className="btn btn--primary">Waiting room</Link>} /></div>;
  }

  const meta = getGame(view.gameType);
  const GameComponent = COMPONENTS[view.gameType];
  const total = TIMERS[view.gameType] || 20_000;

  return (
    <div className="page container game-page">
      <div className="game-topbar">
        <div>
          <span className="eyebrow"><Icon name={meta?.icon || 'games'} size={15} /> Live match · {upperCode}</span>
          <h1>{meta?.name || view.gameType}</h1>
        </div>
        <div className="game-topbar__players">
          {view.players.map((p) => (
            <div key={p.id} className={`game-chip ${p.id === user.id ? 'is-me' : ''}`} title={p.username}>
              <Avatar player={p} size={30} online={p.connected} /><span>{p.id === user.id ? 'You' : p.username}</span>
            </div>
          ))}
        </div>
      </div>

      <TimerBar
        deadline={view.deadline}
        serverNow={now}
        total={view.gameType === 'rock_paper_scissors' && view.gameState.phase === 'reveal' ? 3_000 : total}
        label={view.gameType === 'quick_tap' ? 'Match ends in' : 'Current turn'}
      />

      <div className={`game-arena game-arena--${meta?.color || 'violet'}`}>
        <GameComponent state={view.gameState} myId={user.id} now={now} act={(action) => socket.emit('game:action', { action })} />
      </div>
    </div>
  );
}
