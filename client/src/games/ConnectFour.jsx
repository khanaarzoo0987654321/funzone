import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export default function ConnectFour({ state, myId, act }) {
  const myTurn = state.turn === myId && state.status === 'playing';
  const winner = state.players.find((p) => p.id === state.winnerIds?.[0]);

  return (
    <div className="game-c4">
      <div className="turn-banner">
        {winner ? <><Icon name="trophy" size={18} /> {winner.username} connected four!</> : state.isDraw ? 'Board full — draw!' : myTurn ? 'Drop your piece!' : 'Waiting for opponent...'}
      </div>
      <div className="c4-wrap">
        <div className="c4-drop-row">
          {Array.from({ length: 7 }, (_, column) => (
            <button key={column} className="c4-drop" onClick={() => act({ type: 'drop', column })} disabled={!myTurn || state.columns[column].length >= 6} aria-label={`Drop in column ${column + 1}`}>
              <span className={state.turn === myId ? 'is-live' : ''}>▼</span>
            </button>
          ))}
        </div>
        <div className="c4-board">
          {Array.from({ length: 6 }, (_, visualRow) => {
            const row = 5 - visualRow;
            return Array.from({ length: 7 }, (_, column) => {
              const occupant = state.columns[column][row];
              const color = occupant ? state.colors[occupant] : null;
              const isLast = state.lastMove?.column === column && state.lastMove?.row === row;
              return <span key={`${row}-${column}`} className={`c4-cell ${color ? `c4-cell--${color}` : ''} ${isLast ? 'is-last' : ''}`} />;
            });
          })}
        </div>
      </div>
      <div className="game-score-strip">
        {state.players.map((p) => (
          <div key={p.id} className={`score-player ${state.turn === p.id ? 'is-active' : ''}`}>
            <Avatar player={p} size={38} online />
            <div><strong>{p.username}{p.id === myId ? ' (you)' : ''}</strong><span className="muted">{state.colors[p.id]}</span></div>
            <b className="score-player__points">{state.scores?.[p.id] ?? 0}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
