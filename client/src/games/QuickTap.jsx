import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export default function QuickTap({ state, myId, act, now }) {
  const remaining = Math.max(0, Math.ceil(((state.endsAt || now) - now) / 1000));

  return (
    <div className="game-quicktap">
      <div className="quicktap-head">
        <div className="quicktap-timer"><Icon name="clock" size={20} /><strong>{remaining}</strong><span>seconds</span></div>
        <div className="turn-banner"><Icon name="bolt" size={18} /> Tap the glowing tile — fastest finger scores most!</div>
      </div>
      <div className="tap-grid">
        {Array.from({ length: 25 }, (_, index) => {
          const isTarget = state.target?.cell === index;
          return (
            <button
              key={index}
              className={`tap-tile ${isTarget ? 'is-target' : ''}`}
              onClick={() => act({ type: 'tap', cell: index })}
              disabled={state.status !== 'playing'}
              aria-label={isTarget ? 'Target tile' : `Tile ${index + 1}`}
            >
              {isTarget && <Icon name="target" size={28} />}
            </button>
          );
        })}
      </div>
      <div className="game-score-strip">
        {state.players.map((p) => (
          <div key={p.id} className={`score-player ${p.id === myId ? 'is-me' : ''}`}>
            <Avatar player={p} size={38} online />
            <div><strong>{p.username}{p.id === myId ? ' (you)' : ''}</strong><span className="muted">{state.hits?.[p.id] || 0} hits · {state.misses?.[p.id] || 0} misses</span></div>
            <b className="score-player__points">{state.scores?.[p.id] ?? 0}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
