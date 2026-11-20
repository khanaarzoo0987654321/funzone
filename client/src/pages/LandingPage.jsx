import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import GameCard from '../components/GameCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { roomApi, errorMessage } from '../api/client.js';

function HeroPreview() {
  return (
    <div className="hero-visual">
      <div className="hero-preview">
        <div className="hero-preview__head">
          <span className="dot dot--online" /> <span>live match · Tic Tac Toe</span>
          <span className="hero-preview__timer">00:12</span>
        </div>
        <div className="mini-board">
          {['X', 'O', 'X', '', 'O', '', '', 'X', ''].map((value, index) => (
            <span key={index} className={`mini-cell ${value ? `mini-cell--${value.toLowerCase()}` : ''}`}>{value}</span>
          ))}
        </div>
        <div className="hero-preview__players">
          <span className="mini-player"><span className="mini-avatar" style={{ background: 'linear-gradient(145deg,#a78bfa,#6d28d9)' }}>🚀</span> you <b>2</b></span>
          <span className="mini-player"><span className="mini-avatar" style={{ background: 'linear-gradient(145deg,#7ee8ff,#0891b2)' }}>🥷</span> rival <b>1</b></span>
        </div>
      </div>
      <div className="float-chip float-chip--one"><Icon name="bolt" size={16} /> +20 Quick Tap</div>
      <div className="float-chip float-chip--two"><Icon name="trophy" size={16} /> Victory!</div>
      <div className="float-chip float-chip--three"><Icon name="users" size={16} /> 8 online</div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [games, setGames] = useState([]);

  useEffect(() => {
    roomApi.games().then(({ data }) => setGames(data.games)).catch(() => {});
  }, []);

  return (
    <div className="landing">
      <section className="hero container">
        <div className="hero__copy">
          <span className="eyebrow"><Icon name="sparkles" size={15} /> The real-time multiplayer arcade</span>
          <h1>Play together.<br /><span className="gradient-text">Win together.</span></h1>
          <p className="hero__lead">
            Challenge friends in five fast, friendly mini games. Create a room, share the code and dive straight into the action — no downloads, no waiting.
          </p>
          <div className="hero__actions">
            <Link to={isAuthenticated ? '/games' : '/register'} className="btn btn--primary btn--lg">
              {isAuthenticated ? 'Choose a game' : 'Start playing free'} <Icon name="arrow" size={18} />
            </Link>
            <Link to="/games" className="btn btn--glass btn--lg"><Icon name="games" size={18} /> Explore games</Link>
            <Link to="/local" className="btn btn--accent btn--lg"><Icon name="users" size={18} /> Play locally</Link>
          </div>
          <div className="hero__stats">
            <div><strong>5</strong><span>mini games</span></div>
            <div><strong>2–8</strong><span>players per room</span></div>
            <div><strong>0ms</strong><span>setup time</span></div>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow"><Icon name="games" size={15} /> The lineup</span>
            <h2>Pick your playground</h2>
          </div>
          <p className="muted">From quick reflex duels to brain-teasing strategy — there is a game for every mood.</p>
        </div>
        <div className="games-grid games-grid--preview">
          {games.slice(0, 3).map((game) => <GameCard key={game.id} game={game} />)}
        </div>
        <div className="center section__more">
          <Link to="/games" className="btn btn--glass">See all five games <Icon name="arrow" size={16} /></Link>
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow"><Icon name="bolt" size={15} /> How it works</span>
            <h2>Three steps to fun</h2>
          </div>
        </div>
        <div className="steps-grid">
          {[
            { icon: 'user', title: 'Claim your spot', text: 'Create a free account and pick an avatar that screams you.', color: 'violet' },
            { icon: 'users', title: 'Open a room', text: 'Choose a game, get a six-character code and invite your crew.', color: 'cyan' },
            { icon: 'trophy', title: 'Play & climb', text: 'Live turns, real timers, saved results and a global leaderboard.', color: 'pink' },
          ].map((step, index) => (
            <div key={step.title} className={`step-card step-card--${step.color}`}>
              <span className="step-card__number">0{index + 1}</span>
              <span className="step-card__icon"><Icon name={step.icon} size={26} /></span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container cta-band">
        <div className="cta-band__content">
          <span className="eyebrow"><Icon name="target" size={15} /> Your next match is waiting</span>
          <h2>Ready when you are.</h2>
          <p className="muted">Jump into a room and show everyone how it is done.</p>
        </div>
        <Link to={isAuthenticated ? '/rooms' : '/register'} className="btn btn--primary btn--lg">Create a room <Icon name="arrow" size={18} /></Link>
      </section>
    </div>
  );
}
