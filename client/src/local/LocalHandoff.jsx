import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { getPlayer } from './localSession.js';

const PRIVACY_TEXT = {
  board: 'The board is hidden while the device changes hands.',
  choice: 'Earlier choices stay hidden until the big reveal.',
  cards: 'Card positions are hidden until the next player starts flipping.',
  score: 'Your score is saved and the next player gets a fresh timer.',
};

export default function LocalHandoff({ session, onContinue, onExit }) {
  const handoff = session.handoff || {};
  const player = getPlayer(session, handoff.toId);
  const previous = getPlayer(session, handoff.fromId);
  const game = session.gameId;

  return (
    <div className="handoff-screen">
      <span className="eyebrow"><Icon name="users" size={15} /> Pass &amp; play</span>
      <div className="handoff-screen__avatar"><Avatar player={player} size={92} ring /></div>
      <h2>Over to {player?.username || 'the next player'}</h2>
      <p className="handoff-screen__message">{handoff.message}</p>
      {previous && <p className="muted handoff-screen__note">{previous.username}, please look away.</p>}

      <div className="handoff-screen__privacy">
        <Icon name="eyeOff" size={17} />
        <span>{PRIVACY_TEXT[game] || 'Take the device when you are ready.'}</span>
      </div>

      <div className="handoff-screen__actions">
        <button className="btn btn--primary btn--lg" onClick={onContinue}>
          <Icon name="check" size={18} /> I&apos;m {player?.username || 'ready'} — start my turn
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onExit}>Back to local games</button>
      </div>
    </div>
  );
}
