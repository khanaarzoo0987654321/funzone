# Development Progress — FunZone

**Last updated:** 19 November 2026  
**Overall status:** Feature-complete app; demo running in in-memory mode; documentation finished.

---

## Phase 1 — Planning & environment

- [x] Confirmed Node.js/npm/Git availability
- [x] Chose a single root `package.json` with Vite rooted at `client/`
- [x] Defined the five games, room model and server-authoritative approach
- [x] Confirmed MySQL 8 installed but root password unavailable → selected in-memory dev fallback with the user
- [x] Created `.env.example` and local `.env`

## Phase 2 — Backend foundation

- [x] Express app with Helmet, CORS allowlist, JSON limit, rate limiting and centralised errors
- [x] JWT auth middleware and bcryptjs password hashing
- [x] Validators for register/login/profile and room creation
- [x] Store abstraction (`memoryStore`, `mysqlStore`, `auto` selector)
- [x] MySQL schema with 7 tables, PK/FK/unique keys/indexes and 5 seeded achievements
- [x] REST controllers: auth, users, rooms, matches, leaderboard
- [x] Socket.IO bootstrap with token auth

## Phase 3 — Game engines & multiplayer

- [x] Shared engine contract: `create / apply / onTimeout / tick / result / view`
- [x] Tic Tac Toe, Rock Paper Scissors, Connect Four, Memory Match, Quick Tap
- [x] 250 ms server tick loop for timers and phase changes
- [x] Room runtime: create/join/leave, unique codes, capacity, ready states, host-only start
- [x] Disconnect grace period, reconnection and room cleanup
- [x] Room chat, notifications, rematch and match persistence
- [x] Achievement checks after every match

## Phase 4 — Frontend

- [x] Auth/Landing/Dashboard/Games/Rooms/WaitingRoom/Game/Results/Leaderboard/Profile pages
- [x] Auth, Socket and Toast contexts
- [x] Five game UIs driven only by server state
- [x] Reusable Avatar, Icon, Layout, UI components
- [x] Full design system: gradients, glass cards, animations, confetti, responsive layout
- [x] Loading, empty and error states

## Phase 5 — Testing & fixes

- [x] 7 game-engine unit tests
- [x] 5 REST API tests
- [x] 1 full Tic Tac Toe socket integration test
- [x] 4 additional socket integration tests for the other games
- [x] Production build verified
- [x] Two-browser manual playthrough of Tic Tac Toe and UI smoke tests for all games
- [x] Fixed missing `toast.info`
- [x] Fixed rematch navigation for the non-requesting player
- [x] Browser console clean after fixes

See [TESTING_REPORT.md](TESTING_REPORT.md) for details.

## Phase 6 — Documentation

- [x] `README.md`
- [x] API & Socket documentation
- [x] Testing report
- [x] Development progress (this file)
- [x] College project report
- [x] Postman collection

---

## Known limitations / future work

1. **Live MySQL untested.** The code and schema are complete; supply `DB_PASSWORD` in `.env` to verify persistence and run `mysql -u root -p < database/schema.sql` first.
2. **Memory mode is ephemeral.** Demo accounts, rooms and scores reset on server restart.
3. **No deploy configuration** for a cloud host was requested; the app is ready to be containerised or deployed behind a proxy if required.
4. **No sound effects or videoCalling** were in scope.

---

## Key decisions

| Decision | Reason |
| --- | --- |
| `bcryptjs` instead of native `bcrypt` | Avoids native build issues on Windows/student machines |
| Single root dependencies + Vite root `client/` | One `npm install` and one `npm run dev` |
| In-memory fallback selected automatically | App still runs without database credentials; same interface as MySQL store |
| Server owns all game state | Prevents fake client scores and keeps winner validation authoritative |
| Two browser origins for manual testing | Simulates independent users with separate localStorage in one window |
