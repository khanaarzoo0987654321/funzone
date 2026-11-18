# FunZone — Real-Time Multiplayer Mini Games Platform

**Developed by Aarzoo Khan**

FunZone is a complete full-stack web app where friends can create a room, share a code and play five server-validated mini games together in real time. It includes accounts, avatars, a global leaderboard, match history, achievements, room chat, rematches and a polished responsive UI.

> **Stack:** React 18 + Vite (client) · Node.js + Express + Socket.IO (server) · MySQL 8 with an automatic in-memory demo fallback · JWT + bcryptjs

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

To test real multiplayer, open the frontend in **two different browsers**, or open one tab as `localhost:5173` and another as `127.0.0.1:5173` (they have separate logins). Register two accounts, create a room in one, share the 6-character code, join from the other, ready up, and let the host start.

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
| Quick Tap | 2–8 | Tap the glowing tile as fast as possible for 30 s | 30 s match |

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
```

`DATA_STORE=auto` means: use MySQL only when `DB_PASSWORD` is set **and** the connection succeeds; otherwise use the in-memory store. You can force a mode with `DATA_STORE=memory` or `DATA_STORE=mysql`.

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

---

## 5. Project structure

```text
FunZone/
├─ client/                    React + Vite frontend
│  ├─ src/
│  │  ├─ api/                 Axios client and API wrappers
│  │  ├─ components/          Reusable UI (Avatar, Icon, UI, Layout…)
│  │  ├─ context/             Auth, Socket and Toast contexts
│  │  ├─ games/               Five game UI components
│  │  ├─ pages/               Landing, auth, dashboard, rooms, game, results…
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
│  └─ tests/                  Engine, API and multiplayer integration tests
├─ database/schema.sql        MySQL 8 schema + seeded achievements
├─ docs/                      API, testing, progress and college reports
└─ .env.example               Configuration template
```

---

## 6. Documentation

- [API & Socket documentation](docs/API_DOCUMENTATION.md)
- [Testing report](docs/TESTING_REPORT.md)
- [Development progress](docs/DEVELOPMENT_PROGRESS.md)
- [College project report](docs/COLLEGE_PROJECT_REPORT.md)
- [Postman collection](docs/postman_collection.json)

---

## 7. Security notes

- Passwords are hashed with bcryptjs; plain passwords are never stored.
- JWTs are signed with `JWT_SECRET` and required on all private REST routes and socket connections.
- Request bodies are validated and rate-limited on login/register.
- Helmet security headers and CORS allowlists are enabled.
- SQL uses parameterized queries in `mysqlStore`.
- The `.env` file is gitignored; only `.env.example` should be committed.

---

## 8. Demo flow

1. Register `alice` and `bob` in two browser contexts.
2. Alice: **Games → Tic Tac Toe → Create room**. Copy the code.
3. Bob: **Rooms → Join with code**.
4. Both click ready; Alice clicks **Start game**.
5. Play a match, see the results page, then click **Rematch** to return to the waiting room.
6. Visit **Leaderboard** and **Profile** to see saved stats and achievements.

Built as a BSc IT mini project — full source, tests and documentation included.
