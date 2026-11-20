# FunZone — Real-Time Multiplayer Mini Games Platform

**Developed by Aarzoo Khan**

FunZone is a complete full-stack web app where friends can play five mini games in **two ways**: **Online Multiplayer** (create a room, share a 6-character code and play together in real time) or **Local Multiplayer** (pass one device around on the same screen, no account needed). It includes accounts, avatars, a global leaderboard, match history, achievements, room chat, rematches and a polished responsive UI.

> **Stack:** React 18 + Vite 6 (client) · Node.js + Express + Socket.IO (server) · MySQL 8 with an automatic in-memory demo fallback · JWT + bcryptjs

---

## 🌐 Live deployment

**Website:** **https://funzone-k94k.onrender.com**  
**Health check:** https://funzone-k94k.onrender.com/api/health

The React frontend, REST API and Socket.IO server are deployed together on a **free Render Web Service** over HTTPS/WSS. No separate frontend host is needed. The free instance sleeps after a period of inactivity, so the first request may take up to a minute to wake it up.

The deployment is defined by [`render.yaml`](render.yaml) and uses:

- `npm install --include=dev && npm run build` so Vite is available in Render's production environment
- `npm start` to serve `dist/`, `/api` and Socket.IO from one Express process
- `DATA_STORE=memory` (no paid database required)
- a Render-generated `JWT_SECRET` that is never written to Git
- `CLIENT_URL=https://funzone-k94k.onrender.com`

---

## 1. Quick start (beginner friendly)

You only need **Node.js 18+** and npm. The project already contains `node_modules` after installation, but on a fresh computer run:

```bash
npm install
```

If npm asks to approve the `esbuild` install script, run:

```bash
npm install-scripts approve esbuild
```

Then start everything with one command:

```bash
npm run dev
```

Open these two addresses:

| What | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:5000/api/health |

To test **Online Multiplayer**, open the frontend in **two different browsers**, or open one tab as `localhost:5173` and another as `127.0.0.1:5173` (they have separate logins). Register two accounts, create a room in one, share the 6-character code, join from the other, ready up, and let the host start.

To test **Local Multiplayer**, open `http://localhost:5173/local`, choose one of the five games, enter the player names, and pass the device when the handoff screen appears. No login is needed and nothing is saved online.

### Production-style run

```bash
npm run build
npm start
```

`npm start` serves the built React app and the API from the same Express server on port 5000.

---

## 2. What is included

### Five playable games

| Game | Players | Rules | Turn/timer |
| --- | --- | --- | --- |
| Tic Tac Toe | 2 | Three in a row wins | 20 s per turn |
| Rock Paper Scissors | 2–8 | Five simultaneous rounds; identical picks share a point | 15 s pick + 3 s reveal |
| Connect Four | 2 | Connect four pieces vertically, horizontally or diagonally | 20 s per turn |
| Memory Match | 2–4 | Flip two cards; a match scores 2 points and keeps the turn | 25 s per turn |
| Quick Tap | 2–8 | Tap the glowing tile as fast as possible for 30 s | 30 s shared match online; separate 10 s turns locally |

All moves are **intents only**. The server owns the real game state, validates every action, runs timers, decides winners/draws and saves the result. Clients never submit scores.

### Features

- JWT register/login, protected routes, hashed passwords (bcryptjs)
- Create/join rooms with unique codes, capacity checks, host controls and ready states
- Live Socket.IO rooms with player list, online indicators, room chat, disconnect grace period and reconnection
- Server-authoritative game engines and 250 ms global tick loop for timers
- Results screen with confetti, final standings, saved-match badge and rematch
- Leaderboard, match history, profile editor and five unlockable achievements
- Responsive glassmorphism design with gradients, animations, toasts, loading and empty states
- MySQL schema with PK/FK/indexes plus an automatic in-memory demo store when MySQL is unavailable
- **Local pass-and-play** for all five games using the same engines as online mode

### Two ways to play

| | Online Multiplayer | Local Multiplayer |
| --- | --- | --- |
| Entry point | `/games` → choose game → create/join room | `/local` → choose game → add players |
| Players | 2–8 depending on game, on different devices | 2–8 depending on game, sharing one device |
| Login | Required (JWT account) | Not required |
| State owner | Server-validated via Socket.IO | Browser session via a shared local engine |
| Privacy between turns | Separate devices | Full-screen handoff hides the board/choice |
| Timers | Shared server timers | Per-player local timers (Quick Tap: 10 s each) |
| Results | Saved to leaderboard, match history and achievements | Shown on screen only; not persisted |
| Chat / rematch | Yes | No |

Both modes use the same five authoritative engines, turn rules and win/draw logic. Local mode is designed for friendly pass-and-play: the handoff screen is a privacy UI, not a network security boundary.

### Web routes

| Route | Purpose | Login needed |
| --- | --- | --- |
| `/` | Landing page | No |
| `/register`, `/login` | Create account / sign in | No |
| `/play` | Choose online or local play | No |
| `/games` | Online game catalogue | No |
| `/local` | Local game catalogue | No |
| `/local/setup/:gameId` | Set up local players | No |
| `/local/play/:gameId` | Local pass-and-play session | No |
| `/leaderboard` | Global standings from saved matches | No |
| `/players/:id` | Public player profile | No |
| `/dashboard` | Signed-in dashboard | Yes |
| `/rooms` | Create/join online rooms | Yes |
| `/room/:code` | Waiting room, chat and ready/start | Yes |
| `/game/:code` | Live online match | Yes |
| `/results/:id` | Saved result for a match | Yes |

Unknown paths show a styled 404 page. The API is served under `/api`; see [API & Socket documentation](docs/API_DOCUMENTATION.md) for the endpoint contract.

---

## 3. Configuration (`.env`)

Copy `.env.example` to `.env` and adjust if needed. The defaults work with the memory store.

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

JWT_SECRET=replace-this-with-a-long-random-secret

DATA_STORE=auto
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=funzone
DB_AUTO_SETUP=false

# Optional TLS for hosted MySQL providers (e.g. TiDB Cloud)
DB_SSL=false
DB_SSL_CA=
```

`DATA_STORE=auto` means: use MySQL only when `DB_PASSWORD` is set **and** the connection succeeds; otherwise use the in-memory store. You can force a mode with `DATA_STORE=memory` or `DATA_STORE=mysql`.

`DB_SSL=false` is the default, so existing local setups and the live memory-mode deployment are unchanged. Set `DB_SSL=true` only for a MySQL host that requires TLS. If that host requires a custom CA, put its PEM content in `DB_SSL_CA`; it is ignored while `DB_SSL` is false. Never commit a real CA, password or `.env` file. See [free MySQL setup notes](docs/FREE_MYSQL_SETUP.md) for research and stop conditions — no account creation, credentials or Render changes are performed by this project setup.

To use MySQL:

1. Create a database user (recommended) or use root.
2. Import the schema: `mysql -u root -p < database/schema.sql`
3. Put the credentials in `.env`, e.g. `DB_USER=funzone`, `DB_PASSWORD=your-password`, `DB_NAME=funzone`.
4. Restart the server. The health endpoint will report `"mode": "mysql"`.

> Demo data in memory mode resets whenever the server restarts. That is intentional; MySQL mode persists everything.

---

## 4. Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run server (nodemon) and client (Vite) together |
| `npm run dev:server` | Backend only |
| `npm run dev:client` | Frontend only |
| `npm run build` | Build the React app into `dist/` |
| `npm start` | Run the built app + API |
| `npm test` | Run all automated tests |
| `npm run test:games` | Game-engine unit tests only |
| `npm run test:api` | REST API tests only |

Current verified result: **32 tests, 32 passed, 0 failed**. `npm run build` passes with Vite 6.4.6 (160 modules). See the [testing report](docs/TESTING_REPORT.md) for the breakdown.

---

## 5. Project structure

```text
FunZone/
├─ client/                    React + Vite frontend
│  ├─ src/
│  │  ├─ api/                 Axios client and API wrappers
│  │  ├─ components/          Reusable UI (Avatar, Icon, UI, Layout…)
│  │  ├─ context/             Auth, Socket, Toast and Local game contexts
│  │  ├─ games/               Five game UI components
│  │  ├─ local/               Local session engine, handoff and results
│  │  ├─ pages/               Landing, auth, games, local, rooms, game, results…
│  │  └─ styles/              Full design system
├─ server/
│  ├─ src/
│  │  ├─ config/              Environment configuration
│  │  ├─ controllers/         REST controllers
│  │  ├─ db/                  memoryStore, mysqlStore, store selector
│  │  ├─ games/               Five authoritative game engines
│  │  ├─ middleware/          JWT auth and validation
│  │  ├─ routes/              Express routes
│  │  ├─ services/            Achievements
│  │  ├─ socket/              Rooms, ready/start, actions, chat, rematch
│  │  ├─ app.js               Express app
│  │  └─ server.js            HTTP + Socket.IO bootstrap
│  └─ tests/                  Engine, API, local, online and TLS config tests
├─ database/schema.sql        MySQL 8 schema + seeded achievements
├─ docs/                      API, testing, progress and college reports
└─ .env.example               Configuration template
```

---

## 6. Documentation

- [API & Socket documentation](docs/API_DOCUMENTATION.md)
- [Testing report](docs/TESTING_REPORT.md)
- [Final testing and audit report](docs/FINAL_TESTING_REPORT.md)
- [Development progress](docs/DEVELOPMENT_PROGRESS.md)
- [Free MySQL setup notes](docs/FREE_MYSQL_SETUP.md)
- [College project report](docs/COLLEGE_PROJECT_REPORT.md)
- [Presentation outline](docs/PROJECT_PRESENTATION_OUTLINE.md)
- [Viva Q&A](docs/VIVA_QUESTIONS_ANSWERS.md)
- [Postman collection](docs/postman_collection.json)

---

## 7. Security notes

- Passwords are hashed with bcryptjs; plain passwords are never stored.
- JWTs are signed with `JWT_SECRET` and required on all private REST routes and socket connections.
- Request bodies are validated and rate-limited on login/register.
- Helmet security headers and CORS allowlists are enabled.
- SQL uses parameterized queries in `mysqlStore`.
- MySQL TLS is opt-in and disabled by default; `DB_SSL_CA` is used only when `DB_SSL=true`.
- The `.env` file is gitignored; only `.env.example` should be committed.

---

## 8. Demo flow

1. Register `alice` and `bob` in two browser contexts.
2. Alice: **Games → Tic Tac Toe → Create room**. Copy the code.
3. Bob: **Rooms → Join with code**.
4. Both click ready; Alice clicks **Start game**.
5. Play a match, see the results page, then click **Rematch** to return to the waiting room.
6. Visit **Leaderboard** and **Profile** to see saved stats and achievements.

**Local demo:** open `/local`, pick any game, add two players, take turns, hand the device over when asked, then read the on-screen winner. No registration and no server needed beyond the running app.

---

## 9. Current limitations

- **Live data uses memory mode.** The free Render deployment sets `DATA_STORE=memory`, so accounts, rooms and match history are cleared when the service restarts. No paid database is configured.
- **Free-tier cold start.** The first request after inactivity can take up to about a minute.
- **Live MySQL untested.** The schema and store exist and TLS configuration is ready, but no credentials were supplied and no hosted database was created or changed.
- **Latest local fixes are not deployed.** The live bundle still serves the earlier commit; profile-save and TLS changes are local only because no deploy was performed.
- **Limited manual online coverage.** Only Tic Tac Toe was fully played live; the other four online games passed automated socket tests but were not manually played online.
- **Local mode is honest pass-and-play.** The handoff screen hides information, but a determined player could inspect browser state; local results are not saved.
- **No voice/video chat, spectator mode, tournament brackets or native mobile app.**
- **Production hardening** would need persistent secret management, token revocation, monitoring and abuse controls.

Built as a BSc IT mini project — full source, tests and documentation included.
