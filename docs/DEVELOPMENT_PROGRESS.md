# Development Progress — FunZone

**Last updated:** 20 November 2026  
**Overall status:** Feature-complete app with five games in both Online and Local Multiplayer; 32 automated tests passing; production build passing; live Render deployment running in memory mode. Academic details are filled in with submission date 23 November 2026.

---

## Phase 1 — Planning & environment

- [x] Confirmed Node.js/npm/Git availability
- [x] Chose a single root `package.json` with Vite rooted at `client/`
- [x] Defined five games, the room model and the server-authoritative approach
- [x] Confirmed MySQL 8 installed but no credentials available → automatic in-memory fallback
- [x] Created `.env.example` and a local, gitignored `.env`

## Phase 2 — Backend foundation

- [x] Express app with Helmet, CORS allowlist, JSON limit, rate limiting and centralised errors
- [x] JWT auth middleware and bcryptjs password hashing
- [x] Validators for register/login/profile and room creation
- [x] Store abstraction (`memoryStore`, `mysqlStore`, `auto` selector)
- [x] MySQL schema with 8 tables, PK/FK/unique keys/indexes and 5 seeded achievements
- [x] REST controllers: auth, users, rooms, matches, leaderboard
- [x] Socket.IO bootstrap with token auth
- [x] Optional MySQL TLS support via `DB_SSL` / `DB_SSL_CA`, disabled by default

## Phase 3 — Game engines & both multiplayer modes

- [x] Shared engine contract: `create / apply / onTimeout / tick / result / view`
- [x] Tic Tac Toe, Rock Paper Scissors, Connect Four, Memory Match, Quick Tap
- [x] 250 ms server tick loop for timers and phase changes
- [x] **Online:** rooms, 6-character codes, capacity, ready states, host-only start, chat, disconnect grace, reconnection, rematch and saved results
- [x] **Local:** pass-and-play for all five games, isolated player identities, full-screen handoff that hides boards/choices, per-player Quick Tap turns and on-screen results
- [x] The same authoritative engines are reused by both modes
- [x] Achievement checks after every online match

## Phase 4 — Frontend

- [x] Online pages: Landing, Play, Games, Register, Login, Dashboard, Rooms, WaitingRoom, Game, Results, Leaderboard, Profile
- [x] Local pages: Local catalogue, LocalSetup, LocalGame, LocalHandoff, LocalResults
- [x] Auth, Socket, Toast and Local game contexts
- [x] Five game UIs driven by server/local session state
- [x] Reusable Avatar, Icon, Layout and UI components; responsive design system
- [x] Loading, empty and error states

## Phase 5 — Testing & fixes

- [x] 7 game-engine tests, 6 API tests, 9 local-game tests
- [x] 1 full Tic Tac Toe socket integration test and 4 other online-game socket tests
- [x] 5 MySQL/TLS configuration tests — **32 tests total, 32 passing**
- [x] Production build verified: Vite 6.4.6, 160 modules, no warnings
- [x] Live local playthroughs of all five games and one complete live online match (earlier audit)
- [x] Profile save fixed: response handling, `avatarColor` persistence and error toasts
- [x] Flaky Quick Tap test corrected to use the current respawned target
- [x] Browser console clean after fixes

See [TESTING_REPORT.md](TESTING_REPORT.md) and [FINAL_TESTING_REPORT.md](FINAL_TESTING_REPORT.md) for details.

## Phase 6 — Documentation

- [x] README with both play modes, routes and limitations
- [x] API & Socket documentation
- [x] Testing report and final testing/audit report
- [x] Development progress (this file)
- [x] College project report, viva Q&A and presentation outline
- [x] Free MySQL setup notes
- [x] DOCX report, PPTX presentation and 7 live screenshots
- [x] Postman collection

---

## Known limitations / future work

1. **Live MySQL untested.** The schema and store exist; no credentials were supplied. TLS support is now available but must be enabled with `DB_SSL` only in an authorised environment.
2. **Memory mode is ephemeral.** The live Render service uses `DATA_STORE=memory`; accounts, rooms and match history reset on restart.
3. **Free-tier cold start.** The first request after inactivity can take up to about a minute.
4. **Limited manual live online coverage.** Only Tic Tac Toe was fully played live; the other four online games passed automated socket tests.
5. **Local privacy is UI-level.** Players must honestly pass the device; local state stays in browser memory.
6. **The latest local fixes are not deployed.** The live bundle still serves the earlier commit; no deploy was performed.
7. **Screenshots need human visual approval** if the college requires a specific format or resolution.
8. **No voice/video chat, spectator mode, tournament brackets or native mobile app.**
9. **Production hardening** would need persistent secret management, token revocation, monitoring and abuse controls.

---

## Key decisions

| Decision | Reason |
| --- | --- |
| `bcryptjs` instead of native `bcrypt` | Avoids native build issues on Windows/student machines |
| Single root dependencies + Vite root `client/` | One `npm install` and one `npm run dev` |
| In-memory fallback selected automatically | App still runs without database credentials; same interface as MySQL store |
| Local mode reuses the server engines | One rules engine for both play modes; no duplicated logic |
| Server owns all online game state | Prevents fake client scores and keeps winner validation authoritative |
| TLS opt-in and off by default | No change to existing memory mode or Render configuration |
| Two browser origins for manual testing | Simulates independent users with separate localStorage in one window |
