import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { roomApi, errorMessage } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { Spinner, EmptyState, StatusPill } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function WaitingRoomPage() {
  const { code } = useParams();
  const upperCode = (code || '').toUpperCase();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [live, setLive] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const chatEnd = useRef(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let data = (await roomApi.get(upperCode)).data;
        if (!data.players.some((p) => p.user_id === user.id)) {
          await roomApi.join(upperCode);
          data = (await roomApi.get(upperCode)).data;
        }
        if (active) setRoomData(data);
      } catch (err) {
        if (active) setError(errorMessage(err));
      }
    }
    load();
    return () => { active = false; };
  }, [upperCode, user.id]);

  useEffect(() => {
    if (!socket || !connected || !roomData) return undefined;
    socket.emit('room:join', { code: upperCode });

    const onState = (state) => {
      setLive(state);
      if (state.status === 'playing') navigate(`/game/${upperCode}`, { replace: true });
      if (state.status === 'finished' && state.gameState) navigate(`/game/${upperCode}`, { replace: true });
    };
    const onNotice = ({ type, message: text }) => toast[type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'](text);
    const onClosed = ({ message: text }) => { toast.warning(text); navigate('/rooms'); };
    const onError = ({ message: text }) => toast.error(text);

    socket.on('room:state', onState);
    socket.on('notification', onNotice);
    socket.on('room:closed', onClosed);
    socket.on('room:error', onError);
    return () => {
      socket.off('room:state', onState);
      socket.off('notification', onNotice);
      socket.off('room:closed', onClosed);
      socket.off('room:error', onError);
      socket.emit('room:leave');
    };
  }, [socket, connected, roomData, upperCode]);

  useEffect(() => {
    if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: 'smooth' });
  }, [live?.chat?.length]);

  const players = live?.players || roomData?.players?.map((p) => ({
    id: p.user_id, username: p.username, avatar: p.avatar, avatar_color: p.avatar_color,
    ready: Boolean(p.is_ready), connected: true, isHost: Boolean(p.is_host),
  })) || [];
  const me = players.find((p) => p.id === user.id);
  const isHost = live?.hostId === user.id || roomData?.room?.host_id === user.id;
  const game = roomData?.game;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(upperCode);
    } catch {
      const input = document.createElement('input');
      input.value = upperCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function leave() {
    try {
      await roomApi.leave(upperCode);
      socket?.emit('room:leave');
      navigate('/rooms');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    socket?.emit('chat:send', { message: message.trim() });
    setMessage('');
  }

  if (error) {
    return <div className="page container"><EmptyState icon="x" title="We couldn’t open that room" text={error} action={<Link to="/rooms" className="btn btn--primary">Back to rooms</Link>} /></div>;
  }
  if (!roomData) return <div className="page center"><Spinner label="Opening the room..." /></div>;

  const seats = Array.from({ length: roomData.room.max_players }, (_, index) => players[index] || null);

  return (
    <div className="page container waiting-page">
      <div className="waiting-top">
        <div>
          <span className="eyebrow"><Icon name="users" size={15} /> Waiting room</span>
          <h1>{game?.name || 'Game room'}</h1>
          <p className="muted">Invite friends with the code below. The host starts when everyone is ready.</p>
        </div>
        <button className="btn btn--ghost" onClick={leave}><Icon name="logout" size={17} /> Leave room</button>
      </div>

      <div className="waiting-layout">
        <div className="waiting-main">
          <div className="room-code-card">
            <div>
              <span className="muted">ROOM CODE</span>
              <strong>{upperCode.split('').map((char, i) => <span key={i}>{char}</span>)}</strong>
            </div>
            <button className="btn btn--glass" onClick={copyCode}><Icon name={copied ? 'check' : 'copy'} size={17} /> {copied ? 'Copied!' : 'Copy code'}</button>
          </div>

          <div className="panel">
            <div className="panel__head panel__head--plain">
              <div><h2>Players <span className="muted">({players.length}/{roomData.room.max_players})</span></h2><p className="muted">{connected ? 'Live connection active' : 'Reconnecting to game server...'}</p></div>
              {!connected && <StatusPill tone="warning">Connecting</StatusPill>}
            </div>
            <div className="player-grid">
              {seats.map((player, index) => (
                <div key={player?.id || `seat-${index}`} className={`player-slot ${player ? 'is-filled' : ''} ${player?.id === user.id ? 'is-me' : ''}`}>
                  {player ? (
                    <>
                      {player.isHost && <span className="player-slot__crown" title="Host"><Icon name="crown" size={15} /></span>}
                      <Avatar player={player} size={62} online={player.connected} ring={player.id === user.id} />
                      <strong>{player.username}{player.id === user.id && <span className="muted"> (you)</span>}</strong>
                      <StatusPill tone={player.ready ? 'success' : player.connected ? 'neutral' : 'danger'}>
                        {player.ready ? 'Ready' : player.connected ? 'Not ready' : 'Offline'}
                      </StatusPill>
                    </>
                  ) : (
                    <>
                      <span className="player-slot__empty"><Icon name="plus" size={24} /></span>
                      <span className="muted">Waiting for player</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="waiting-actions">
              <button className={`btn ${me?.ready ? 'btn--glass' : 'btn--primary'} btn--lg`} onClick={() => socket?.emit('player:ready', { ready: !me?.ready })} disabled={!connected}>
                <Icon name={me?.ready ? 'refresh' : 'check'} size={18} /> {me?.ready ? 'Unready' : 'I’m ready'}
              </button>
              {isHost && (
                <button className="btn btn--accent btn--lg" onClick={() => socket?.emit('room:start')} disabled={!connected || players.length < (game?.minPlayers || 2)}>
                  Start game <Icon name="arrow" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="panel chat-panel">
          <div className="panel__head panel__head--plain"><div><h2>Room chat</h2><p className="muted">Say hello before the match</p></div></div>
          <div className="chat-list">
            {(live?.chat || []).length ? live.chat.map((entry) => (
              <div key={entry.id} className={`chat-msg ${entry.userId === user.id ? 'is-mine' : ''}`}>
                <strong>{entry.userId === user.id ? 'You' : entry.username}</strong>
                <p>{entry.text}</p>
              </div>
            )) : <div className="chat-empty"><Icon name="send" size={22} /><p className="muted">No messages yet. Break the ice!</p></div>}
            <div ref={chatEnd} />
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." maxLength={160} />
            <button className="btn btn--primary btn--sm" aria-label="Send message"><Icon name="send" size={17} /></button>
          </form>
        </aside>
      </div>
    </div>
  );
}
