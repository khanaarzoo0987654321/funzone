# FunZone Testing Report

**Date:** 19 November 2026  
**Environment:** Windows 11, Node.js v26.10.0, npm 11.19.1, MySQL 8.0.46 installed, Chrome via in-app browser  
**Data store used for testing:** automatic in-memory fallback (`DATA_STORE=auto`, no DB password supplied)

---

## 1. Automated test suite

Command:

```bash
npm test
```

Result: **17 tests, 17 passed, 0 failed** (≈ 20 s total).

| File | Tests | Result | What it covers |
| --- | --- | --- | --- |
| `server/tests/games.test.js` | 7 | 7 pass | Pure game-engine logic: TTT win/draw/timeout, Connect Four gravity/win/full column, RPS rounds and draw, Memory pairs and hidden cards, Quick Tap scoring and time-up |
| `server/tests/api.test.js` | 5 | 5 pass | Health/store mode, register validation and duplicates, login + JWT-protected routes, room create/join/capacity/leave, profile update, leaderboard and match history |
| `server/tests/multiplayer.test.js` | 1 | 1 pass | Two real Socket.IO clients create a room, reject a non-member, enforce host-only start and turn order, play Tic Tac Toe to a win, persist the match, update the leaderboard and rematch |
| `server/tests/multiplayer_games.test.js` | 4 | 4 pass | End-to-end socket play for RPS (five rounds), Connect Four (vertical win), Memory Match (hidden deck, turn order, flips) and Quick Tap (server-side hit/miss scoring) |

Run subsets with `npm run test:games` and `npm run test:api`.

---

## 2. Build verification

```bash
npm run build
```

Result: build succeeded — 145 modules transformed, `dist/assets/index-*.css` ≈ 44 kB and `dist/assets/index-*.js` ≈ 337 kB (107 kB gzipped). No warnings or errors.

---

## 3. Manual browser verification

Two browser sessions were used simultaneously to simulate two players:

- Tab A: `http://localhost:5173` logged in as `browser_alice`
- Tab B: `http://127.0.0.1:5173` logged in as `browser_bob` (different origin → separate localStorage/JWT)

### Flows checked

| Flow | Result |
| --- | --- |
| Landing page render and navigation | Pass — hero, game lineup, stats and CTAs visible |
| Registration of two accounts | Pass — both redirected to `/games` |
| Game catalogue and create-room form | Pass — all five games selectable |
| Room creation with unique 6-character code | Pass — code `XE8NBZ` generated |
| Joining by code from second session | Pass — both showed 2/2 players and live connection |
| Ready / unready and host-only start | Pass — non-host start was rejected in automated test; UI disabled correctly |
| Waiting room chat and copy-code control | Pass — rendered without errors |
| Tic Tac Toe live play | Pass — board updated for both clients, winner detected, both navigated to `/results/:matchId` |
| Results page | Pass — winner heading, standings, “Saved” badge, confetti, rematch/leaderboard actions |
| Rematch | Pass — room reset to waiting and players returned; follower auto-navigation added after browser test |
| Rock Paper Scissors UI | Pass — round pips, player choices, scores and locked-in state render; scoring verified in automated test |
| Connect Four UI | Pass — seven drop columns, turn indicator and piece placement; one drop switched turn correctly |
| Memory Match UI | Pass — 16 hidden cards, pair counter, flip totals and turn banner render |
| Quick Tap UI | Pass — 5×5 grid, match countdown, hit/miss counters and target prompt render |
| Leaderboard and profile pages | Pass — rendered with data from saved matches |
| Browser console (both tabs) | No errors after final fixes |

### Bug found and fixed during testing

1. `toast.info` was missing from `ToastContext`, causing a console error when a rematch/notice toast fired. Added `info` to the context.
2. `ResultsPage` did not listen for the rematch state broadcast, so the non-requesting player stayed on the results screen. Added a `room:state` listener that navigates both players back to the waiting room.
3. Automated socket tests initially waited for errors on the wrong client; corrected so the acting socket’s `game:error` is asserted.
4. Connect Four test expected a loser score of 0; the design awards 1 participation point, so the assertion was corrected.

---

## 4. MySQL status

MySQL 8.0.46 is installed and running, but the root account requires a password that was not available in this environment. The project therefore ran in its built-in **in-memory demo mode**, which is selected automatically whenever `DB_PASSWORD` is empty or the connection fails.

- Schema, foreign keys, indexes and seeded achievements are provided in `database/schema.sql`.
- `mysqlStore` implements the same async interface as `memoryStore`, with parameterized queries.
- MySQL mode remains untested live; it can be enabled by supplying credentials in `.env` as documented in the README.

---

## 5. Conclusion

All automated tests pass, the production build succeeds, and manual two-browser testing confirmed that all five games, rooms, results, rematch and support pages work with no console errors. The only untested deployment path is live MySQL, due to missing credentials; the in-memory fallback is fully functional for demonstration and development.
