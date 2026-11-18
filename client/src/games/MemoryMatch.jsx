import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export default function MemoryMatch({ state, myId, act }) {
  const turnPlayer = state.players.find((p) => p.id === state.turn);
  const myTurn = state.turn === myId && state.status === 'playing';
  const matched = new Set(state.matched || []);
  const revealed = new Set([...(state.revealed || []), ...(state.lastFlip?.indices || [])]);
  const pairsFound = matched.size / 2;

  return (
    <div className="game-memory">
      <div className="turn-banner">
        {state.status === 'finished' ? 'All pairs found — great memory!' : myTurn ? 'Your turn — flip two cards!' : `${turnPlayer?.username || 'Opponent'} is flipping...`}
        <span className="turn-banner__extra">{pairsFound}/8 pairs</span>
      </div>
      <div className="memory-board">
        {(state.deck || []).map((card) => {
          const faceUp = matched.has(card.index) || revealed.has(card.index);
          return (
            <button
              key={card.index}
              className={`memory-card ${faceUp ? 'is-flipped' : ''} ${matched.has(card.index) ? 'is-matched' : ''}`}
              onClick={() => act({ type: 'flip', index: card.index })}
              disabled={!myTurn || faceUp || matched.has(card.index)}
              aria-label={faceUp ? `Card ${card.index + 1}: ${card.symbol}` : `Hidden card ${card.index + 1}`}
            >
              <span className="memory-card__back"><Icon name="sparkles" size={22} /></span>
              <span className="memory-card__face">{card.symbol}</span>
            </button>
          );
        })}
      </div>
      <div className="game-score-strip">
        {state.players.map((p) => (
          <div key={p.id} className={`score-player ${state.turn === p.id ? 'is-active' : ''}`}>
            <Avatar player={p} size={38} online />
            <div><strong>{p.username}{p.id === myId ? ' (you)' : ''}</strong><span className="muted">{state.flips} flips total</span></div>
            <b className="score-player__points">{state.scores?.[p.id] ?? 0}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
