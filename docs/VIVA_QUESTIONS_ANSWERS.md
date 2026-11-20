# FunZone — Viva Questions and Answers

**Project:** FunZone – Real-Time Multiplayer Mini Games Platform  
**Developer:** Aarzoo Khan  
**Repository:** https://github.com/khanaarzoo0987654321/funzone  
**Live website:** https://funzone-k94k.onrender.com

These answers are written in simple language for a BSc Information Technology student. They describe the project that is actually implemented in the repository.

---

## A. Project introduction

### Q1. What is FunZone?

**Answer:** FunZone is a browser-based gaming platform where people can play five mini games: Tic Tac Toe, Rock Paper Scissors, Connect Four, Memory Match and Quick Tap. It has two play modes: online multiplayer using room codes and local pass-and-play on one device.

### Q2. Why did you choose this project?

**Answer:** It is useful, easy to demonstrate and covers many topics from the IT syllabus: frontend, backend, REST API, real-time communication, authentication, databases, testing and cloud deployment. It also solves a real problem—starting a quick fair game without installing anything.

### Q3. What does “real-time multiplayer” mean here?

**Answer:** It means that when one player makes a move, the server validation and the updated game state are sent to the other player immediately through Socket.IO, without refreshing the page.

### Q4. What are the five games?

**Answer:** Tic Tac Toe, Rock Paper Scissors, Connect Four, Memory Match and Quick Tap.

### Q5. What is the difference between online and local mode?

**Answer:** Online mode uses accounts, REST and Socket.IO, a six-character room code, saved results and a leaderboard. Local mode needs no sign-up or internet game session; players pass the same device and use handoff screens to hide information. Local results are not saved online.

### Q6. What problem does FunZone solve?

**Answer:** It removes the need for separate game apps, manual scorekeeping and trust between players. Online results are calculated by the server, and local play includes privacy screens for hidden choices.

### Q7. Can one game be played by more than two players?

**Answer:** Yes, depending on the game. Tic Tac Toe and Connect Four support 2 players. Rock Paper Scissors and Quick Tap support 2–8. Memory Match supports 2–4. The same ranges apply to local setup.

---

## B. Frontend, React and Vite

### Q8. What is React?

**Answer:** React is a JavaScript library for building user interfaces from reusable pieces called components. In FunZone, components such as `Navbar`, `GameCard`, `Avatar` and the five game boards are composed into pages.

### Q9. Why did you use React?

**Answer:** React makes it easy to split the UI into small components, manage changing game state and update only the parts of the page that change after a move or socket event.

### Q10. What is Vite?

**Answer:** Vite is a modern frontend build tool. It gives a fast development server and creates the optimised production files in `dist/`. FunZone uses Vite 6 with the React plugin.

### Q11. Where is the Vite configuration?

**Answer:** In `vite.config.js` at the project root. It sets `client` as the Vite root, proxies `/api` and `/socket.io` to the backend during development, and outputs the production build to `../dist`.

### Q12. What is a single-page application (SPA)?

**Answer:** An SPA is a web app where the browser loads one HTML file and JavaScript handles page changes without a full reload. React Router changes the URL and renders the right component.

### Q13. Which router library is used?

**Answer:** `react-router-dom` version 6. It defines routes such as `/`, `/games`, `/local`, `/room/:code`, `/game/:code` and `/results/:id`.

### Q14. Which pages are protected?

**Answer:** `/dashboard`, `/rooms`, `/room/:code`, `/game/:code` and `/results/:id`. `ProtectedRoute` sends an unauthenticated user to `/login`.

### Q15. What does `AuthContext` do?

**Answer:** It stores the current user, loads the user from `/api/auth/me` using the saved token, and exposes `login`, `register`, `refresh`, `updateProfile` and `logout` functions to the whole app.

### Q16. What does `SocketContext` do?

**Answer:** It creates the Socket.IO connection when a user is signed in, passes the JWT in `auth.token`, tracks connection status and disconnects the socket on logout.

### Q17. What does `ToastContext` do?

**Answer:** It shows small temporary messages such as success, error and warning notifications. Each toast disappears automatically after 4.2 seconds.

### Q18. What are the game UI components responsible for?

**Answer:** They are presentational. They receive `state`, `myId` and an `act` function, display the board and call `act(...)` when the player clicks. They do not decide the winner and do not call REST directly.

### Q19. What is `TimerBar`?

**Answer:** A reusable UI component that shows remaining time from a server deadline and changes style when fewer than five seconds remain.

---

## C. Backend, Node.js and Express

### Q20. What is Node.js?

**Answer:** Node.js lets JavaScript run on the server. FunZone requires Node.js 18 or newer.

### Q21. What is Express used for?

**Answer:** Express handles HTTP requests and responses. It provides the REST API middleware, routes, static file serving and central error handling.

### Q22. What is the entry point of the server?

**Answer:** `server/src/server.js`. It initialises the data store, creates the HTTP server, attaches Socket.IO, registers authentication and socket handlers, starts the game loop and listens on the configured port.

### Q23. What is a REST API?

**Answer:** A REST API exposes URL endpoints that clients call with HTTP methods such as GET and POST. FunZone uses REST for login, rooms, match history, profiles and leaderboard.

### Q24. Name some public REST endpoints.

**Answer:** `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login` and `GET /api/games`.

### Q25. Name some protected REST endpoints.

**Answer:** `/api/auth/me`, `/api/users/me`, `/api/rooms`, `/api/rooms/:code/join`, `/api/matches`, `/api/leaderboard` and `/api/achievements`.

### Q26. What is middleware?

**Answer:** Middleware is code that runs between the request and the final route handler. FunZone uses middleware for JSON parsing, CORS, Helmet headers, rate limiting, authentication and validation.

### Q27. How is the React app served in production?

**Answer:** Express serves the built files from `dist/` and returns `index.html` for SPA routes. Unmatched `/api` paths return a JSON 404 instead of the HTML page.

### Q28. What does Helmet do?

**Answer:** Helmet sets security-related HTTP headers. FunZone customises it for cross-origin resources and disables the content security policy because Vite injects inline development assets.

### Q29. Why is CORS configured?

**Answer:** The backend must allow the frontend origin to call it. `CLIENT_URL` can contain a comma-separated allowlist of origins, and the same list is used for Socket.IO.

### Q30. Where is rate limiting applied?

**Answer:** Only on `POST /api/auth/login` and `POST /api/auth/register`: 100 attempts per 15 minutes in production. In test mode the limit is raised to 1000 so automated tests are not blocked.

---

## D. Socket.IO and online multiplayer

### Q31. What is Socket.IO?

**Answer:** Socket.IO is a library for event-based real-time communication between browser and server. It uses WebSockets when available and can fall back to polling.

### Q32. Why not use REST alone?

**Answer:** REST is request/response. A game needs the server to push updates instantly when an opponent moves, becomes ready, sends chat or finishes a match. Socket.IO is better for that.

### Q33. How is a Socket.IO connection authenticated?

**Answer:** The client sends the JWT in `socket.handshake.auth.token`. The server verifies it with the same JWT logic used for REST before accepting the connection.

### Q34. Why must a player join a room with REST before using `room:join`?

**Answer:** REST join adds the user to the room's stored player list. The socket handler checks that membership. In testing, a direct `room:join` before REST join was correctly rejected with “Join the room with its code before entering.”

### Q35. What are the important client-to-server socket events?

**Answer:** `room:join`, `room:leave`, `player:ready`, `room:start`, `game:action`, `room:rematch`, `chat:send` and `room:sync`.

### Q36. What are the important server-to-client events?

**Answer:** `connected`, `room:joined`, `room:state`, `room:error`, `game:error`, `notification`, `game:ended` and `room:closed`.

### Q37. Who can start a match?

**Answer:** Only the host. The room must contain at least the minimum number of players, all players must be connected and ready, and the room must not be over capacity.

### Q38. What is `game:action`?

**Answer:** It is the event carrying a player's intent, for example `{ action: { type: 'move', cell: 4 } }`. The server validates the action and runs the game engine.

### Q39. What is `room:state`?

**Answer:** It is the latest room snapshot sent to each player. It includes players, ready flags, status, chat, match ID, deadlines and a player-specific `gameState` view.

### Q40. What is `game:ended`?

**Answer:** The event emitted when a match finishes. It carries the match record, winner, scores, draw flag, result reason and players. The results page then navigates using the match ID.

### Q41. What happens if a player disconnects?

**Answer:** The player is marked disconnected and gets a 15-second grace period. If the match is still playing and the player does not return, the remaining player wins when there are exactly two players; otherwise the match is a draw. While waiting, host rights are transferred.

### Q42. How does room chat work?

**Answer:** `chat:send` trims the message, limits it to 160 characters and stores up to 50 messages in runtime memory. The last 25 are included in room state.

### Q43. Is there a `room:create` socket event?

**Answer:** No. Rooms are created through `POST /api/rooms`. Socket.IO only joins existing rooms.

---

## E. Authentication, JWT and password hashing

### Q44. What is JWT?

**Answer:** JSON Web Token is a signed token that proves a user is logged in. FunZone signs the user ID and username with `JWT_SECRET`; the default expiry is 7 days.

### Q45. Where is the JWT stored in the browser?

**Answer:** In `localStorage` under the key `funzone_token`. Axios attaches it as `Authorization: Bearer <token>` to API calls.

### Q46. What is bcryptjs?

**Answer:** A password-hashing library. Registration stores `bcrypt.hash(password, 12)`, and login uses `bcrypt.compare()` to check the entered password against the stored hash.

### Q47. Why not store plain passwords?

**Answer:** Plain passwords would expose every user if the database leaked. Hashing stores a one-way derived value, and bcrypt's work factor makes brute-force attempts slow.

### Q48. Does the API return the password hash?

**Answer:** No. `publicUser()` intentionally returns only safe fields such as ID, username, email, avatar and stats.

### Q49. What happens when a JWT is invalid or expired?

**Answer:** REST requests get 401 with a session-expired message. The Axios response interceptor removes the stored token. Socket connections are rejected with an authentication error.

### Q50. Why is the login failure message generic?

**Answer:** Both wrong username and wrong password return the same 401 message. This avoids revealing whether an account exists.

---

## F. Database and storage

### Q51. What database is used?

**Answer:** MySQL 8 is supported through `mysql2/promise`, with a full in-memory store as fallback. The live Render service currently uses `DATA_STORE=memory`.

### Q52. What are the eight database tables?

**Answer:** `users`, `player_profiles`, `game_rooms`, `room_players`, `matches`, `match_players`, `achievements` and `user_achievements`.

### Q53. Which tables store user information?

**Answer:** `users` stores identity and password hash. `player_profiles` stores avatar, colour, bio, XP, level and match statistics, linked by `user_id`.

### Q54. Which tables store room information?

**Answer:** `game_rooms` stores room code, game type, host, capacity, privacy, status and timestamps. `room_players` stores each member's host flag, ready flag and seat number.

### Q55. Which tables store match results?

**Answer:** `matches` stores game type, winner, draw flag, duration, final state and status. `match_players` stores each player's score, position and outcome.

### Q56. What achievements exist?

**Answer:** First Steps (`first_match`), Sweet Victory (`first_win`), On a Roll (`five_wins`), Explorer (`all_games`) and Veteran (`level_5`). They are seeded in both the SQL schema and memory store.

### Q57. How does `DATA_STORE=auto` work?

**Answer:** With no database password it selects the memory store immediately. When a password is configured, it tries MySQL with a five-second timeout and falls back to memory if the connection fails or stalls. `memory` and `mysql` can also be selected directly.

### Q58. What happens to data in memory mode after restart?

**Answer:** Users, rooms and matches are lost because they live in JavaScript Maps. The five achievement definitions are re-seeded. This is why the live demo data is temporary.

### Q59. Was MySQL tested live?

**Answer:** No. The implementation and schema exist, but no database credentials were supplied, and the live service is intentionally configured for memory mode. This limitation is written in the final testing report.

---

## G. Game logic

### Q60. What is a game engine?

**Answer:** A module containing the rules for one game. FunZone engines expose functions such as `create`, `apply`, `onTimeout`, `tick`, `result` and `view`.

### Q61. What does server-authoritative mean?

**Answer:** The server owns the real game state. Clients only send intended actions. The server checks turn order, validates values, applies rules, calculates scores and decides the winner.

### Q62. Why is this important for fairness?

**Answer:** A browser cannot cheat by sending a fake winning score or revealing hidden cards. The server never trusts client-calculated results.

### Q63. How does Tic Tac Toe decide a result?

**Answer:** Eight winning lines are checked after each move. A full board is a draw, a timeout gives the opponent the win, and the result reasons are `three-in-a-row`, `board-full` or `timeout`.

### Q64. How does Connect Four enforce gravity?

**Answer:** Each column is a stack. A drop places the piece at the next free row; full columns and out-of-range columns are rejected. Four connected pieces in any direction wins.

### Q65. How does Rock Paper Scissors scoring work?

**Answer:** Rock beats scissors, paper beats rock and scissors beats paper. If all active players choose the same move, all choosers get a point. If all three choices appear, nobody scores. After five rounds, the unique top scorer wins or the game is a draw.

### Q66. How does online Memory Match hide cards?

**Answer:** The engine's `view()` returns `null` for the symbol of any face-down card. Only matched cards, currently revealed cards and the last flip expose symbols to a client.

### Q67. How does Quick Tap calculate points?

**Answer:** A hit gives `clamp(20 - floor(elapsedSinceSpawn / 120), 5, 20)` points. A miss subtracts 2, never going below 0. There is an 80 ms cooldown per player.

### Q68. Why is local Quick Tap different?

**Answer:** Online Quick Tap is one shared 30-second match. Local Quick Tap gives each player a separate 10-second turn so the device can be passed fairly. The score engine is the same.

### Q69. What happens on a local turn timeout?

**Answer:** The local driver calls the engine's timeout handler, then hands the device to the next player instead of ending the whole match.

### Q70. How is local privacy implemented?

**Answer:** A full-screen `LocalHandoff` screen replaces the board and asks the previous player to look away. RPS shows `✅`/`❔` until reveal. Local mode uses raw engine state in browser memory, so handoff is a privacy UI, not a network-security boundary.

---

## H. Testing and deployment

### Q71. How many automated tests pass?

**Answer:** 32 tests pass and 0 fail. They are split into 7 game-engine tests, 6 API tests (including profile-save success and error handling), 9 local-game tests, 1 full Tic Tac Toe socket integration test, 4 other online-game socket integration tests and 5 MySQL/TLS configuration tests.

### Q72. What command runs the tests?

**Answer:** `npm test`, which runs `node --test server/tests/*.test.js`.

### Q73. What was tested live?

**Answer:** All five local games were played successfully through the deployed UI. One complete online Tic Tac Toe match was played with a browser host and an independent Node Socket.IO guest. Pages, health endpoint and latest build hashes were also checked.

### Q74. Were the other online games played live?

**Answer:** They were not manually completed on the live site during the final audit. Their server-authoritative flows were covered by passing automated Socket.IO integration tests. The final report states this clearly.

### Q75. What is Render?

**Answer:** Render is a cloud platform that builds and hosts the app. FunZone uses one free Node Web Service defined by `render.yaml`, serving the frontend, REST API and Socket.IO from one origin.

### Q76. What does `render.yaml` contain?

**Answer:** The free plan, Oregon region, build command, start command, health-check path, auto-deploy setting and environment variable keys. `JWT_SECRET` uses `generateValue: true`, so its value is generated by Render.

### Q77. How do you know Render has the latest commit?

**Answer:** Local `HEAD`, `origin/main` and GitHub's `main` tip are all `eedb4b2`. The live HTML serves asset hashes `index-CWLefblD.js` and `index-BOS7OokV.css`, exactly matching a fresh local build of that commit, and `/local` shows five local games.

### Q78. What does `/api/health` return?

**Answer:** A JSON object with `ok`, `status`, `mode`, `uptimeSeconds` and `timestamp`. During the audit it returned `healthy` with mode `memory`.

### Q79. Why does the first live request sometimes take longer?

**Answer:** Render's free instances sleep after inactivity. The first request wakes the service, which can take up to about a minute.

---

## I. GitHub, security and limitations

### Q80. What is the GitHub repository?

**Answer:** `https://github.com/khanaarzoo0987654321/funzone`, with the main branch named `main`.

### Q81. What is the latest commit hash?

**Answer:** `eedb4b2d7c8298e8ff5787a3da6dc83faa64ee11`, with the message “Add local pass-and-play multiplayer for all five games”.

### Q82. Why is `.env` not committed?

**Answer:** It contains environment-specific configuration and may contain secrets. `.gitignore` excludes `.env` and `.env.local`; only `.env.example` is committed as a safe template with variable names and no real values.

### Q83. How is the JWT secret protected on Render?

**Answer:** It is generated by Render through `generateValue: true` in `render.yaml`. No literal secret is in the repository, and no secret value was printed during the audit.

### Q84. What are the main security practices in FunZone?

**Answer:** Password hashing, JWT protection, server-side validation, rate-limited auth endpoints, Helmet headers, CORS allowlist, hidden online card symbols, safe API error messages and gitignored environment files.

### Q85. What is a known limitation of local mode?

**Answer:** Players must honestly pass the device. The handoff screen hides the board or choice, but a determined player could inspect browser memory. It is designed for friendly pass-and-play, not adversarial security.

### Q86. How was the profile-save issue resolved?

**Answer:** The old `ProfilePage.jsx` checked `if (result.ok)` on an Axios response, which has no `ok` property, so the success branch was skipped even though the server returned `{ profile }`. The page now reads `data.profile` inside `try/catch/finally` and shows server errors through `errorMessage()`. Both stores also map `avatarColor` to the `avatar_color` column, and an API test covers success, persistence, partial patches, 400 validation errors and 401 unauthenticated requests.

### Q87. What would you improve in the future?

**Answer:** Use managed MySQL for persistence, add Playwright browser tests, add friend invitations and spectators, improve accessibility and sound, add browser-level profile editor tests, and keep the older project documents in sync with new features.

### Q88. Give a 30-second summary for the viva.

**Answer:** “FunZone is a full-stack web app with five mini games. Players can compete online using room codes and Socket.IO, where the server validates every move and stores results, or play locally on one device with privacy handoff screens. It uses React and Vite on the frontend, Node, Express and Socket.IO on the backend, MySQL with a memory fallback, JWT and bcrypt for security, and is deployed on Render. The final audit verified 32 passing tests, a successful build, all five local games live, and a complete live online match.”

---

## J. Quick revision formulas

- **Online result rule:** win = 3 points, loss = 1, draw = 1 each.
- **XP rule:** win = 50, loss = 20, draw = 15; level = `floor(xp / 150) + 1`.
- **Room code:** six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- **Auth header:** `Authorization: Bearer <JWT>`.
- **Socket auth:** `io({ auth: { token } })`.
- **Disconnect grace:** 15 seconds.
- **Chat limit:** 160 characters, 50 stored, 25 sent in state.
- **Online timers:** TTT/C4 20 s, Memory 25 s, RPS 15 s per round, Quick Tap 30 s total.
- **Local Quick Tap:** 10 seconds per player turn.
- **Live data mode:** `memory`; restart clears demo data.
