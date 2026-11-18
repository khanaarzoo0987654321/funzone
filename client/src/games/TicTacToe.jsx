import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export default function TicTacToe({ state, myId, act }) {
  const turnPlayer = state.players.find((p) => p.id === state.turn);
  const winner = state.players.find((p) => p.id === state.winnerId);
  const myTurn = state.turn === myId && state.status === 'playing';

  return (
    <div className="game-ttt">
      <div className={`turn-banner ${winner ? 'turn-banner--win' : ''}`}>
        {winner ? <><Icon name="trophy" size={18} /> {winner.username} wins the round!</> : state.isDraw ? 'Board full — it is a draw!' : <>{myTurn ? 'Your turn — make your move!' : `${turnPlayer?.username || 'Opponent'} is thinking...`}</>}
      </div>
      <div className="ttt-board">
        {state.board.map((cell, index) => {
          const mark = cell ? state.marks[cell] : null;
          const winning = state.winningLine?.includes(index);
          return (
            <button
              key={index}
              className={`ttt-cell ${mark ? `ttt-cell--${mark.toLowerCase()}` : ''} ${winning ? 'is-winning' : ''}`}
              onClick={() => act({ type: 'move', cell: index })}
              disabled={Boolean(cell) || !myTurn}
              aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ', empty'}`}
            >
              {mark}
            </button>
          );
        })}
      </div>
      <div className="game-score-strip">
        {state.players.map((p) => (
          <div key={p.id} className={`score-player ${state.turn === p.id ? 'is-active' : ''}`}>
            <Avatar player={p} size={38} online />
            <div><strong>{p.username}{p.id === myId ? ' (you)' : ''}</strong><span className="muted">{state.marks[p.id]}</span></div>
            <b className="score-player__points">{state.scores?.[p.id] ?? 0}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
