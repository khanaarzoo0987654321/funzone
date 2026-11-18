import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { roomApi, errorMessage } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import { Spinner } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RoomsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [games, setGames] = useState([]);
  const [gameType, setGameType] = useState(params.get('game') || 'tic_tac_toe');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roomApi.games().then(({ data }) => setGames(data.games)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  const selected = games.find((game) => game.id === gameType);

  function chooseGame(id) {
    setGameType(id);
    const game = games.find((item) => item.id === id);
    if (game) setMaxPlayers(game.maxPlayers);
  }

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await roomApi.create({ gameType, maxPlayers, isPrivate });
      toast.success('Room created — invite your friends!');
      navigate(`/room/${data.room.code}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function join(event) {
    event.preventDefault();
    if (code.trim().length < 6) return setError('Room codes are 6 characters.');
    setBusy(true);
    setError('');
    try {
      const cleaned = code.trim().toUpperCase().replace(/\s/g, '');
      await roomApi.join(cleaned);
      toast.success('Joined the room!');
      navigate(`/room/${cleaned}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <span className="eyebrow"><Icon name="users" size={15} /> Multiplayer lobby</span>
          <h1>Host or join a room</h1>
          <p className="muted">Share your code with friends, or enter theirs to jump straight in.</p>
        </div>
      </div>

      {error && <div className="alert alert--error"><Icon name="x" size={16} /> {error}</div>}

      <div className="rooms-layout">
        <form className="panel room-form" onSubmit={create}>
          <div className="panel__head"><span className="panel__icon panel__icon--violet"><Icon name="plus" size={22} /></span><div><h2>Create a room</h2><p className="muted">You become the host — you control the kickoff.</p></div></div>
          <label className="field"><span>Choose a game</span></label>
          <div className="game-picker">
            {games.length ? games.map((game) => (
              <button type="button" key={game.id} className={`game-picker__item game-picker__item--${game.color} ${gameType === game.id ? 'is-active' : ''}`} onClick={() => chooseGame(game.id)}>
                <Icon name={game.icon} size={21} /> <span>{game.name}</span>
                {gameType === game.id && <Icon name="check" size={16} />}
              </button>
            )) : <Spinner label="Loading games..." size={24} />}
          </div>
          <div className="form-row">
            <label className="field">
              <span>Players: <b>{maxPlayers}</b></span>
              <input type="range" min={selected?.minPlayers || 2} max={selected?.maxPlayers || 2} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
              <span className="muted field__hint">{selected?.minPlayers}–{selected?.maxPlayers} supported</span>
            </label>
            <label className="field">
              <span>Room type</span>
              <button type="button" className={`toggle-card ${isPrivate ? 'is-active' : ''}`} onClick={() => setIsPrivate((v) => !v)}>
                <Icon name={isPrivate ? 'lock' : 'users'} size={18} />
                <span>{isPrivate ? 'Private — code only' : 'Open — anyone with code'}</span>
              </button>
            </label>
          </div>
          <button className="btn btn--primary btn--block btn--lg" disabled={busy || !games.length}>Create room <Icon name="arrow" size={18} /></button>
        </form>

        <form className="panel join-panel" onSubmit={join}>
          <div className="panel__head"><span className="panel__icon panel__icon--cyan"><Icon name="target" size={22} /></span><div><h2>Join a friend</h2><p className="muted">Got a six-character code? You are in.</p></div></div>
          <label className="field">
            <span>Room code</span>
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
            />
          </label>
          <p className="muted join-panel__hint"><Icon name="sparkles" size={14} /> Codes are not case-sensitive.</p>
          <button className="btn btn--glass btn--block btn--lg" disabled={busy}>Join room <Icon name="arrow" size={18} /></button>
          <div className="join-panel__divider" />
          <p className="muted join-panel__tip">Tip: ask the host to share the code shown in their waiting room. You can be in another room — joining here moves you over.</p>
        </form>
      </div>
    </div>
  );
}
