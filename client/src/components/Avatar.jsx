const EMOJI = {
  rocket: '🚀', ninja: '🥷', star: '⭐', ghost: '👻', robot: '🤖', cat: '🐱',
  fox: '🦊', panda: '🐼', crown: '👑', alien: '👽', fire: '🔥', bolt: '⚡',
  turtle: '🐢', unicorn: '🦄', dragon: '🐲', monkey: '🐵',
};

const GRADIENTS = {
  violet: 'linear-gradient(145deg,#a78bfa,#6d28d9)',
  pink: 'linear-gradient(145deg,#ff9ac1,#e11d74)',
  cyan: 'linear-gradient(145deg,#7ee8ff,#0891b2)',
  amber: 'linear-gradient(145deg,#ffd66e,#f59e0b)',
  lime: 'linear-gradient(145deg,#b6f7a3,#22a06b)',
  blue: 'linear-gradient(145deg,#93c5fd,#2563eb)',
  red: 'linear-gradient(145deg,#ff9e9e,#dc2626)',
  slate: 'linear-gradient(145deg,#a5b4fc,#475569)',
};

export const AVATAR_EMOJI = EMOJI;
export const AVATAR_COLORS = Object.keys(GRADIENTS);

export default function Avatar({ player, size = 44, online = false, ring = false, className = '' }) {
  const avatar = player?.avatar || 'rocket';
  const color = player?.avatar_color || 'violet';
  const label = player?.username || '?';
  return (
    <span
      className={`avatar ${ring ? 'avatar--ring' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(16, size * 0.46),
        background: GRADIENTS[color] || GRADIENTS.violet,
      }}
      title={label}
      aria-label={label}
    >
      {EMOJI[avatar] || label.slice(0, 1).toUpperCase()}
      {online && <span className="avatar__online" />}
    </span>
  );
}
