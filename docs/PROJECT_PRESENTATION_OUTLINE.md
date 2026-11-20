# FunZone — Project Presentation Outline

**Project:** FunZone – Real-Time Multiplayer Mini Games Platform  
**Developer:** Aarzoo Khan  
**Repository:** https://github.com/khanaarzoo0987654321/funzone  
**Live demo:** https://funzone-k94k.onrender.com  
**Audited commit:** `eedb4b2d7c8298e8ff5787a3da6dc83faa64ee11`

> The submission date is confirmed as 23 November 2026.

---

## Slide 1: Title

- FunZone – Real-Time Multiplayer Mini Games Platform
- Developed by **Aarzoo Khan**
- BSc Information Technology mini-project
- SMT. JAMNABAI H. WADHWA COLLEGE OF TECHNOLOGY · 2026–2027
- Guide: Meghna S.
- Live demo: `https://funzone-k94k.onrender.com`

**Speaker cue:** Introduce yourself, the project title and where the live demo is hosted.

---

## Slide 2: What is FunZone?

- One website for five mini games: Tic Tac Toe, Rock Paper Scissors, Connect Four, Memory Match and Quick Tap.
- Two ways to play:
  - **Online Multiplayer:** room code, accounts, real-time Socket.IO, saved results and leaderboard.
  - **Local Multiplayer:** pass one device, no sign-up, hidden handoff screens, no online result saving.
- Built as a single full-stack application served from one HTTPS origin.

**Speaker cue:** Emphasise that both online and local modes are preserved and working.

---

## Slide 3: Problem statement

- Quick matches normally need installs, third-party accounts or manual scorekeeping.
- Friends in the same room also need a fair way to hide choices and pass the device.
- Score disputes happen when clients are trusted to report their own results.
- FunZone provides a single link, a six-character room code and server-validated results for online play.

---

## Slide 4: Objectives

- Provide five small games in one responsive web app.
- Support two to eight online players depending on the game.
- Support two to eight local pass-and-play players depending on the game.
- Validate every online move, timer and score on the server.
- Store accounts, match history, leaderboards and achievements when MySQL is configured.
- Keep local play private through full-screen handoff screens.
- Deploy the app so it can be demonstrated from any browser.

---

## Slide 5: Technology stack

- **Frontend:** React 18, Vite 6, React Router 6, Axios, Socket.IO Client.
- **Backend:** Node.js 18+, Express 4, Socket.IO 4, Helmet, CORS, express-rate-limit.
- **Authentication:** JWT with `jsonwebtoken`; passwords hashed with `bcryptjs` cost factor 12.
- **Data:** MySQL 8 schema and store, with automatic in-memory fallback.
- **Deployment:** Render free Web Service, HTTPS/WSS, `DATA_STORE=memory`.
- **Testing:** Node's built-in `node:test` runner, in-app browser and an independent Socket.IO client.

---

## Slide 6: High-level architecture

- Browser loads the React single-page app from Express static files.
- Axios calls the REST API for auth, rooms, matches, profiles and leaderboard.
- Socket.IO handles room state, readiness, chat, game actions and end notifications.
- Express routes call controllers, services and the selected data store.
- The same five authoritative engine modules are used by:
  - the server for online matches;
  - the local session driver for pass-and-play matches.

**Speaker cue:** The key design idea is one rules engine used by both play modes.

---

## Slide 7: System flow

1. User registers or signs in; server returns a JWT.
2. Player creates or joins a room using a six-character code.
3. Socket.IO joins only after REST membership is confirmed.
4. Players ready up; host starts when the room is valid.
5. Clients send intents such as `{ type: 'move', cell: 4 }`.
6. Server engine validates, updates state and calculates scores.
7. `game:ended` is emitted and the match is saved in the active store.
8. Browser shows the result page with standings and rematch.

---

## Slide 8: Online multiplayer

- Public pages: home, play, games, register, login, leaderboard and profiles.
- Protected pages: dashboard, rooms, waiting room, live game and results.
- Room features: private code, player-count slider, chat, ready flags, host-only start, rematch.
- Server enforces turn order, timers, disconnection grace and result persistence.
- Online Memory Match hides face-down symbols in `view()`; clients cannot see them in socket messages.

---

## Slide 9: Local multiplayer

- Open `/local` without an account.
- Choose a game and enter two to eight player names.
- A full-screen handoff screen says “please look away” and hides the previous player's information.
- Tic Tac Toe, Connect Four and Memory Match hide the board/cards during handoff.
- Rock Paper Scissors shows `✅` or `❔` until the reveal screen.
- Quick Tap gives each player a separate 10-second turn.
- Results are shown on-screen but are not saved online.

---

## Slide 10: Game 1 — Tic Tac Toe

- 3×3 board; first player uses X.
- Move intent: `{ type: 'move', cell }` where cell is 0–8.
- 20-second turn timer online.
- Win reasons: `three-in-a-row`, `board-full` draw or `timeout`.
- Scores: winner 3, loser 1, draw 1 each.
- Local mode shows a clean handoff after every move.

---

## Slide 11: Game 2 — Rock Paper Scissors

- Five rounds; simultaneous choices from rock, paper or scissors.
- Server choice map: rock beats scissors, paper beats rock, scissors beats paper.
- Same choices give all choosers a point; three different choices give no points.
- Unique top scorer wins after five rounds; tied top is a draw.
- Online reveal phase lasts 3 seconds.
- Local mode keeps each pick behind a privacy handoff until reveal.

---

## Slide 12: Game 3 — Connect Four

- Seven columns, six rows; pieces fall to the lowest empty cell.
- Drop intent: `{ type: 'drop', column }` where column is 0–6.
- 20-second turn timer online.
- Four in a row horizontally, vertically or diagonally wins.
- Full board is a draw; timeout gives the opponent the win.
- Scores follow the shared 3/1/1 rule.

---

## Slide 13: Game 4 — Memory Match

- Sixteen cards: eight emoji symbols, each appearing twice.
- Flip intent: `{ type: 'flip', index }` where index is 0–15.
- Match gives +2 and keeps the turn; mismatch passes the turn.
- All pairs found ends the game with the highest score winning.
- Online view replaces hidden symbols with `null` for security.
- Local mode keeps real symbols in memory but covers the board during handoff.

---

## Slide 14: Game 5 — Quick Tap

- Online: 30-second shared match on a 5×5 grid.
- Local: separate 10-second turn per player.
- Tap intent: `{ type: 'tap', cell }` where cell is 0–24.
- Hit points: `clamp(20 - floor(elapsed / 120), 5, 20)`.
- Miss deducts 2 points, floored at 0.
- Target refreshes after 1.8 seconds or immediately after a hit.
- Unique top score wins; tied top is a draw.

---

## Slide 15: Database design

- Eight MySQL tables: `users`, `player_profiles`, `game_rooms`, `room_players`, `matches`, `match_players`, `achievements`, `user_achievements`.
- Users have unique username and email; only `password_hash` is stored.
- Rooms have unique six-character codes and status `waiting`, `playing` or `finished`.
- Matches store game type, winner, duration, final state and status.
- Match players store score, position and outcome.
- Five seeded achievements: First Steps, Sweet Victory, On a Roll, Explorer and Veteran.
- Live deployment uses the in-memory store; MySQL was not exercised with credentials.

---

## Slide 16: Security

- Passwords hashed with bcryptjs; plain passwords are never stored.
- JWT bearer token required for protected REST routes and Socket.IO connections.
- CORS allowlist and Helmet security headers.
- Rate limiting on login and registration.
- Server-authoritative game engines; clients cannot submit scores or winners.
- Hidden Memory symbols are stripped in online views.
- `.env` is gitignored; `.env.example` contains names only.
- Render generates `JWT_SECRET`; no secret is in the repository.

---

## Slide 17: Testing results

- `npm test`: **32 passed, 0 failed**.
- Test groups: 7 game engine, 6 API, 9 local game, 1 online Tic Tac Toe integration, 4 other online game integrations, 5 MySQL/TLS config.
- `npm run build`: passed; 160 modules transformed; Vite 6.4.6.
- Live local games: all five played successfully.
- Live online: room `VN832H`, match `9fd330bd-6857-484d-82c7-08a94eeb1251`, host won 3/1 with reason `three-in-a-row`.
- Browser console: no errors during page and game checks.

---

## Slide 18: Live demo plan

1. Show the homepage and explain the two play modes.
2. Open `/local`, start Tic Tac Toe and demonstrate one hidden handoff.
3. Open Rock Paper Scissors local mode and show the `❔` privacy state before reveal.
4. Register or sign in, create a room and copy the six-character code.
5. Join from a second device/browser, ready up and start.
6. Play a few online moves, then show the result page and saved standings.
7. Show `/api/health` and the README deployment URL.

**Speaker cue:** Keep the demo short; explain what the server validates while the UI updates.

---

## Slide 19: Limitations

- Live mode uses memory storage; data is cleared when the Render instance restarts.
- MySQL mode is implemented but was not tested live without credentials.
- Free Render plan sleeps after inactivity, causing a cold-start delay.
- No voice/video chat, spectator mode or mobile native app.
- Local mode relies on honest device passing; it is not a network-security boundary.
- The profile-save issue found in static review was fixed and regression-tested; only live MySQL remains unverified.
- Older project documents were corrected to report 32 tests and both play modes.

---

## Slide 20: Future enhancements

- Configure a managed MySQL instance for persistent accounts and history.
- Add friend invitations and public room browsing.
- Add spectators, rematch tournaments and game-specific statistics.
- Add optional sound effects and accessibility settings.
- Add automated browser tests with Playwright for both play modes.
- Add Playwright browser tests for profile editor success and error states.
- Keep README and older testing/progress documents in sync with new features.

---

## Slide 21: Conclusion

- FunZone delivers five playable mini games in one web application.
- Online play uses REST + Socket.IO with authoritative server validation and saved results.
- Local play reuses the same engines without accounts, sockets or online persistence.
- GitHub, Render deployment, tests and live gameplay checks are verified.
- The project is ready for college submission with all academic details confirmed; the remaining checks are optional.

**Thank you — questions?**

---

## Screenshot references for the presentation

- `docs/screenshots/01_homepage.jpeg` — live homepage.
- `docs/screenshots/02_play_modes.jpeg` — online/local mode chooser.
- `docs/screenshots/03_local_games.jpeg` — local game catalogue.
- `docs/screenshots/04_online_games.jpeg` — online game catalogue.
- `docs/screenshots/05_register.jpeg` — registration page.
- `docs/screenshots/06_online_results.jpeg` — online result page from the audited match.
- `docs/screenshots/07_local_tic_tac_toe.jpeg` — live local Tic Tac Toe game.
