import Icon from './Icon.jsx';

export function Spinner({ label = 'Loading...', size = 34 }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" style={{ width: size, height: size }} />
      {label && <p className="muted">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Icon name={icon} size={30} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function TimerBar({ deadline, serverNow, total = 20000, label }) {
  const remaining = Math.max(0, (deadline || 0) - (serverNow || Date.now()));
  const ratio = Math.min(1, remaining / total);
  const seconds = Math.ceil(remaining / 1000);
  return (
    <div className={`timer ${remaining < 5000 ? 'timer--danger' : ''}`}>
      <div className="timer__meta">
        <span>{label || 'Time left'}</span>
        <strong>{deadline ? `${seconds}s` : '—'}</strong>
      </div>
      <div className="timer__track"><div className="timer__fill" style={{ width: `${ratio * 100}%` }} /></div>
    </div>
  );
}

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 34 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 11) * 0.13}s`,
            background: ['#a78bfa', '#ff6ba8', '#38d9f5', '#ffc857', '#7bed8f'][i % 5],
            transform: `rotate(${i * 31}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
