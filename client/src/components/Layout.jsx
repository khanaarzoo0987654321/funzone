import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Icon from './Icon.jsx';

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <div className="brand brand--footer">
            <span className="brand__mark">FZ</span>
            <span className="brand__text">Fun<span>Zone</span></span>
          </div>
          <p className="muted footer__tagline">Five games. One arena. Infinite rematches.</p>
          <p className="muted footer__credit">Developed by <strong>Aarzoo Khan</strong></p>
        </div>
        <div className="footer__links">
          <a href="/games">Games</a>
          <a href="/leaderboard">Leaderboard</a>
          <a href="/rooms">Rooms</a>
        </div>
        <p className="muted footer__copy">Built with React, Node.js, Socket.IO &amp; MySQL <Icon name="sparkles" size={13} /></p>
      </div>
    </footer>
  );
}

export default function Layout({ hideFooter = false }) {
  return (
    <div className="app-shell">
      <div className="bg-orbit bg-orbit--one" />
      <div className="bg-orbit bg-orbit--two" />
      <div className="bg-grid" />
      <Navbar />
      <main className="main-content"><Outlet /></main>
      {!hideFooter && <Footer />}
    </div>
  );
}
