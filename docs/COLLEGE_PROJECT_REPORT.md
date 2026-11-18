# FunZone — Real-Time Multiplayer Mini Games Platform

### A BSc Information Technology mini-project report

**Submitted by:** [Student Name]  
**Roll number:** [Roll Number]  
**Course:** Bachelor of Science, Information Technology  
**Year:** [Academic Year]  
**Project guide:** [Guide Name]  

---

## Abstract

FunZone is a browser-based multiplayer gaming platform that allows two to eight players to compete in five miniature games in real time. The system was designed to solve a common problem in college gaming: organising a quick, fair match usually requires installs, accounts on third-party services or manual scorekeeping. FunZone provides a single link, a six-character room code and server-verified results.

The application uses a React single-page frontend, a Node.js/Express REST API with Socket.IO for real-time communication, and a MySQL database with an in-memory fallback for development. Authentication uses JWT and bcryptjs password hashing. Every game action is validated by authoritative server-side engines, so clients cannot submit fake scores. The project includes rooms with host controls, ready states, timers, chat, rematches, leaderboards, match history, profiles and achievements.

Testing covered 17 automated unit, API and socket integration tests, a successful production build and manual two-browser playthroughs. All tests passed. The project demonstrates practical application of web architecture, real-time systems, database design, authentication and secure game logic.

---

## 1. Introduction

Online gaming is one of the most accessible forms of digital interaction, but casual group play is often blocked by setup friction. FunZone was built as a lightweight platform where a user can register, choose a game, create a room and invite friends with a short code. No downloads or external accounts are required.

The project also serves as a demonstration of several IT concepts studied during the course: client–server architecture, REST APIs, WebSockets, relational database design, authentication, validation, concurrency and responsive user-interface design.

### 1.1 Aim

To design and implement a complete, secure and easy-to-use real-time multiplayer mini-games web application.

### 1.2 Objectives

1. Build a responsive React frontend with all required screens.
2. Implement five playable games with fair, server-side rule validation.
3. Support rooms with codes, capacity, host controls and ready states.
4. Use Socket.IO for live state synchronisation, chat and reconnection.
5. Store users, rooms, matches, profiles and achievements in a relational schema.
6. Secure the application with JWT, password hashing, validation and rate limiting.
7. Test the system with automated tests and manual multi-user browser sessions.
8. Produce complete documentation for installation, APIs and testing.

---

## 2. Literature / technology survey

| Area | Choice | Justification |
| --- | --- | --- |
| Frontend | React 18 + Vite | Component-based UI and fast development/build |
| Styling | Custom CSS design system | Full control over gradients, animations and responsiveness without a heavy framework |
| Backend | Node.js + Express | JavaScript across the stack; simple REST routing and middleware |
| Real time | Socket.IO | Room abstraction, automatic reconnection, event-based messaging |
| Database | MySQL 8 | Relational integrity with foreign keys; JSON column for final game state |
| Development fallback | In-memory store | Same async interface as MySQL so the app runs without credentials |
| Auth | JWT + bcryptjs | Stateless API auth and salted password hashing without native compilation |
| Testing | Node.js built-in test runner + socket.io-client | No extra test framework needed; real integration coverage |

---

## 3. System analysis

### 3.1 Functional requirements

- Users can register, log in, view/edit profiles and see achievements.
- Users can browse five games and create or join rooms.
- A room shows all players, their ready state, connection state and chat.
- Only the host can start a match, and only when the minimum number of players are ready.
- Each game enforces its own rules, timers and scoring on the server.
- At the end, all players see a results page with standings and the saved match.
- Players can request a rematch or browse a global leaderboard.

### 3.2 Non-functional requirements

- **Security:** hashed passwords, signed tokens, protected routes, input validation, rate limits, Helmet headers, CORS allowlist and parameterized SQL.
- **Performance:** lightweight JSON events, 250 ms server tick, no polling for game state.
- **Reliability:** disconnect grace period, reconnection sync and room cleanup.
- **Usability:** clear room codes, toasts, loading/empty states and mobile-friendly layout.
- **Maintainability:** modular folders, shared store interface and isolated game engines.

### 3.3 Use cases

1. **Register / login** — obtain a JWT and access the dashboard.
2. **Host a match** — choose a game, create a room, share the code, ready up and start.
3. **Join a match** — enter a code, ready up and play.
4. **Play** — send intents; receive authoritative state updates.
5. **Review results** — view the winner, scores and rematch.
6. **Track progress** — leaderboard, history, profile and achievements.

---

## 4. System design

### 4.1 Architecture

```text
Browser (React SPA)
   │  REST /api/* (axios, JWT)
   │  Socket.IO events (token auth)
   ▼
Express + Socket.IO server
   ├─ routes/controllers  ──► services/achievements
   ├─ socket roomManager  ──► authoritative game engines + tick loop
   └─ db/index.js selector
         ├─ mysqlStore  ──► MySQL 8 (production)
         └─ memoryStore ──► in-memory demo (development)
```

### 4.2 Database design

The schema in `database/schema.sql` contains:

| Table | Purpose |
| --- | --- |
| `users` | Accounts with unique username/email and bcrypt hash |
| `player_profiles` | Avatar, colour, bio, XP, level and W/L/D stats |
| `game_rooms` | Room code, game type, host, capacity, status and timestamps |
| `room_players` | Membership, host flag, ready flag and seat |
| `matches` | Game type, winner, draw flag, duration, final JSON state, timestamps |
| `match_players` | Per-player score, position and outcome |
| `achievements` / `user_achievements` | Definitions and unlocked achievements |

Keys: every table has a `CHAR(36)` primary key; unique constraints prevent duplicate users, room codes and duplicate memberships; foreign keys cascade or restrict appropriately; indexes cover status, game type, player and date lookups.

### 4.3 Game engine contract

Every game implements the same interface:

```js
{
  id,
  create(players) -> state,
  apply(state, action, userId) -> { ok, error?, events? },
  onTimeout(state),
  tick(state, now),
  result(state),
  view(state, userId) -> client-safe state
}
```

This made it possible to add five different games without changing the room manager. `MemoryMatch.view` is especially important: it replaces face-down card symbols with `null`, so inspecting network traffic cannot reveal the deck.

### 4.4 Data flow of a move

1. Player clicks a cell/button; the React component emits `game:action` with an intent.
2. The socket handler checks room membership and calls `handleAction`.
3. The engine verifies status, turn, action type and value.
4. On success the engine mutates server state and may call `finish`.
5. `room:state` is broadcast to every connected player with a personalised view.
6. If the game ended, `game:ended` carries the summary; the frontend opens `/results/:id`.
7. The server records the match, updates stats and checks achievements.

---

## 5. Implementation highlights

### 5.1 Authentication

`bcryptjs` hashes passwords before storage. The server signs a JWT containing the user ID and enforces it with `authenticate` middleware on private REST routes and `socketAuth` on socket connections. Tokens are stored in browser localStorage and removed on 401.

### 5.2 Room lifecycle

A room moves through `waiting → playing → finished`. Codes are randomly generated and unique. Joining validates capacity and status. The host alone can start. On disconnect, a short grace period allows reconnection before the player is removed; if the host leaves, ownership is transferred. Empty rooms are cleaned up.

### 5.3 Fair play

Clients never send scores. For example, Quick Tap sends only `{ type: 'tap', cell }`; the server compares it with its own target, computes points from reaction time, applies a cooldown, penalises misses and ends the match after 30 seconds.

### 5.4 User interface

The UI uses a dark violet/pink gradient theme with glass cards, animated backgrounds, avatars, online dots, toasts, confetti on wins and responsive grids. Every page has loading, empty and error states so the app never appears broken while data is fetched.

---

## 6. Testing

Testing used three layers:

1. **Unit tests** for pure game logic (7 tests).
2. **API tests** using `fetch` against a temporary Express server (5 tests).
3. **Socket integration tests** with real client/server pairs (5 tests across two files).

Total: **17 automated tests, all passing.** A production build completed without errors.

Manual testing used two browser origins (`localhost` and `127.0.0.1`) with separate accounts. The full Tic Tac Toe flow, rematch and results were played end to end; the other four games were opened and their interactive controls verified in the same session. Browser consoles were clean after fixes.

Full details are in [TESTING_REPORT.md](TESTING_REPORT.md).

---

## 7. Results

The completed system satisfies all functional objectives:

- Five games are playable and fairly validated by the server.
- Rooms, ready states, host control, chat and reconnect work in real time.
- Results, history, leaderboard, profiles and achievements persist through the store layer.
- The interface is polished and responsive on desktop and mobile widths.
- The project can be started with a single `npm run dev`.

During testing, MySQL credentials were unavailable, so the automatic in-memory store was used. The MySQL implementation and schema are complete and can be enabled by supplying credentials.

---

## 8. Conclusion

FunZone demonstrates how modern web technologies can deliver a complete multiplayer gaming experience without external services. The project strengthened understanding of real-time communication, authoritative server design, relational data modelling, authentication and user-centred interface design. All planned features were implemented and tested successfully.

---

## 9. Future scope

1. Add matchmaking queues and private friend lists.
2. Add more games and tournament brackets.
3. Persist chat history and add moderation tools.
4. Add sound effects and accessibility options.
5. Deploy with Docker and a managed MySQL instance.
6. Add unit tests for React components with a frontend test runner.

---

## 10. References

1. React documentation — https://react.dev/
2. Vite documentation — https://vite.dev/
3. Express documentation — https://expressjs.com/
4. Socket.IO documentation — https://socket.io/docs/v4/
5. MySQL 8 reference manual — https://dev.mysql.com/doc/
6. MDN Web Docs — https://developer.mozilla.org/
7. OWASP Authentication Cheat Sheet — https://cheatsheetseries.owasp.org/

---

## Appendix A — How to run

```bash
npm install
npm run dev
# Open http://localhost:5173
```

See [README.md](../README.md) for full setup and [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoints and socket events.
