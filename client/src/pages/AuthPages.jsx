import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Avatar, { AVATAR_COLORS, AVATAR_EMOJI } from '../components/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function AuthShell({ children, title, subtitle, footer }) {
  return (
    <div className="auth-page container">
      <div className="auth-card">
        <div className="auth-card__form">
          <Link to="/" className="brand"><span className="brand__mark">FZ</span><span className="brand__text">Fun<span>Zone</span></span></Link>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <div className="auth-card__footer">{footer}</div>
        </div>
        <div className="auth-card__art">
          <div className="auth-art__orb" />
          <h2>Good games start here.</h2>
          <p>Five mini games, real opponents, live timers and a leaderboard with your name on it.</p>
          <div className="auth-art__tiles">
            {['🚀', '✊', '🔴', '🧠', '⚡'].map((emoji, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>{emoji}</span>)}
          </div>
          <div className="auth-art__quote">“The room code is all you need.”</div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, placeholder = 'Password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <Icon name="lock" size={18} />
      <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} required />
      <button type="button" className="input-wrap__action" onClick={() => setVisible((v) => !v)} aria-label="Toggle password visibility">
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const result = await login(identity.trim(), password);
    setBusy(false);
    if (result.ok) {
      toast.success('Welcome back to FunZone!');
      navigate(location.state?.from || '/dashboard', { replace: true });
    } else setError(result.message);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to jump back into the arena."
      footer={<>New around here? <Link to="/register">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="alert alert--error"><Icon name="x" size={16} /> {error}</div>}
        <label className="field">
          <span>Username or email</span>
          <div className="input-wrap"><Icon name="user" size={18} />
            <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="yourname or you@mail.com" required autoComplete="username" />
          </div>
        </label>
        <label className="field">
          <span>Password</span>
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <Icon name="arrow" size={17} /></button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', avatar: 'rocket', avatarColor: 'violet' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) return setError('Your passwords do not match.');
    setError('');
    setBusy(true);
    const result = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      avatar: form.avatar,
      avatarColor: form.avatarColor,
    });
    setBusy(false);
    if (result.ok) {
      toast.success('Account created. Let’s play!');
      navigate('/games', { replace: true });
    } else setError(result.message);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes ten seconds. Then the games begin."
      footer={<>Already a player? <Link to="/login">Sign in instead</Link></>}
    >
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="alert alert--error"><Icon name="x" size={16} /> {error}</div>}
        <label className="field">
          <span>Username</span>
          <div className="input-wrap"><Icon name="user" size={18} /><input value={form.username} onChange={set('username')} placeholder="pixel_ace" minLength={3} required /></div>
        </label>
        <label className="field">
          <span>Email</span>
          <div className="input-wrap"><Icon name="send" size={18} /><input type="email" value={form.email} onChange={set('email')} placeholder="you@mail.com" required /></div>
        </label>
        <div className="form-row">
          <label className="field">
            <span>Password</span>
            <PasswordField value={form.password} onChange={set('password')} />
          </label>
          <label className="field">
            <span>Confirm</span>
            <PasswordField value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />
          </label>
        </div>
        <div className="field">
          <span>Pick your avatar</span>
          <div className="avatar-grid">
            {Object.entries(AVATAR_EMOJI).slice(0, 12).map(([key, emoji]) => (
              <button type="button" key={key} className={`avatar-option ${form.avatar === key ? 'is-selected' : ''}`} onClick={() => setForm((c) => ({ ...c, avatar: key }))} title={key}>{emoji}</button>
            ))}
          </div>
          <div className="color-grid">
            {AVATAR_COLORS.map((color) => (
              <button type="button" key={color} className={`color-option color-option--${color} ${form.avatarColor === color ? 'is-selected' : ''}`} onClick={() => setForm((c) => ({ ...c, avatarColor: color }))} aria-label={color} />
            ))}
          </div>
          <div className="avatar-preview"><Avatar player={{ avatar: form.avatar, avatar_color: form.avatarColor, username: form.username || 'You' }} size={46} /> <span className="muted">Your player look</span></div>
        </div>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Creating account...' : 'Create account'} <Icon name="arrow" size={17} /></button>
      </form>
    </AuthShell>
  );
}
