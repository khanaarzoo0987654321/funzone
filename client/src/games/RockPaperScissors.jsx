import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

export const CHOICE_EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };

export default function RockPaperScissors({ state, myId, act, privateChoices = false, footerNote }) {
  const myChoice = state.choices?.[myId];
  const choosing = state.phase === 'choosing' && state.status === 'playing';
  const reveal = state.lastReveal;

  return (
    <div className="game-rps">
      <div className="rps-rounds">
        {Array.from({ length: state.totalRounds }, (_, i) => (
          <span key={i} className={`rps-round ${state.round > i + 1 ? 'is-done' : ''} ${state.round === i + 1 ? 'is-current' : ''}`}>{i + 1}</span>
        ))}
      </div>

      <div className="rps-arena">
        {state.players.map((player) => {
          const choice = reveal?.choices?.[player.id] || state.choices?.[player.id];
          const isWinner = reveal?.winners?.includes(player.id);
          const hidden = privateChoices && !reveal?.choices?.[player.id] && player.id !== myId && Boolean(choice);
          return (
            <div key={player.id} className={`rps-player ${choice ? 'has-picked' : ''} ${isWinner ? 'is-winner' : ''}`}>
              <Avatar player={player} size={54} online />
              <strong>{player.username}{player.id === myId ? ' (you)' : ''}</strong>
              <span className={`rps-choice ${choice && !hidden ? 'is-visible' : ''}`}>{hidden ? '✅' : choice ? CHOICE_EMOJI[choice] : '❔'}</span>
              <b className="rps-score">{state.scores?.[player.id] ?? 0} pts</b>
            </div>
          );
        })}
      </div>

      <div className={`turn-banner ${!choosing ? 'turn-banner--win' : ''}`}>
        {state.status === 'finished' ? 'Final round complete!' : choosing ? (myChoice ? 'Locked in! Waiting for the others...' : 'Make your choice!') : 'Reveal! Next round starts shortly.'}
      </div>

      <div className="rps-controls">
        {Object.entries(CHOICE_EMOJI).map(([choice, emoji]) => (
          <button key={choice} className={`rps-button ${myChoice === choice ? 'is-selected' : ''}`} onClick={() => act({ type: 'choice', choice })} disabled={!choosing || Boolean(myChoice)}>
            <span>{emoji}</span><small>{choice}</small>
          </button>
        ))}
      </div>
      <p className="muted center"><Icon name="sparkles" size={14} /> {footerNote || 'All five rounds are scored by the server — no cheating allowed.'}</p>
    </div>
  );
}
