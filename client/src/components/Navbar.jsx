import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: 'home' },
        { to: '/play', label: 'Play', icon: 'gamepad' },
        { to: '/games', label: 'Games', icon: 'games' },
        { to: '/rooms', label: 'Rooms', icon: 'users' },
        { to: '/local', label: 'Local', icon: 'sparkles' },
        { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
      ]
    : [
        { to: '/play', label: 'Play', icon: 'gamepad' },
        { to: '/games', label: 'Games', icon: 'games' },
        { to: '/local', label: 'Local', icon: 'sparkles' },
        { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
      ];

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to={user ? '/dashboard' : '/'} className="brand" onClick={close}>
          <span className="brand__mark">FZ</span>
          <span className="brand__text">Fun<span>Zone</span></span>
        </Link>

        <nav className={`navbar__links ${open ? 'is-open' : ''}`}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`} onClick={close}>
              <Icon name={link.icon} size={17} /> {link.label}
            </NavLink>
          ))}
          {user && <NavLink to={`/players/${user.id}`} className="nav-link nav-link--mobile-profile" onClick={close}><Icon name="user" size={17} /> Profile</NavLink>}
        </nav>

        <div className="navbar__actions">
          {user ? (
            <>
              <span className="online-chip" title={connected ? 'Connected to game server' : 'Reconnecting...'}>
                <span className={`dot ${connected ? 'dot--online' : 'dot--offline'}`} /> {connected ? 'Online' : 'Connecting'}
              </span>
              <Link to={`/players/${user.id}`} className="navbar__profile" title={user.username}>
                <Avatar player={user} size={38} online={connected} />
              </Link>
              <button className="btn btn--ghost btn--sm" onClick={() => { logout(); navigate('/'); close(); }} title="Sign out">
                <Icon name="logout" size={17} />
                <span className="hide-sm">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm">Sign in</Link>
              <Link to="/register" className="btn btn--primary btn--sm">Create account</Link>
            </>
          )}
          <button className="navbar__toggle" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
            <Icon name={open ? 'x' : 'games'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
