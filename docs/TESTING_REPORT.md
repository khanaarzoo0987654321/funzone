# FunZone Testing Report

**Originally audited:** 19 November 2026  
**Last updated:** 21 November 2026  
**Environment:** Windows 11, Node.js v26.10.0, npm 11.19.1, Chrome via in-app browser  
**Data store used for automated tests:** in-memory (`DATA_STORE=memory`; no database credentials were supplied)

---

## 1. Automated test suite

Command:

```bash
npm test
```

Result: **32 tests, 32 passed, 0 failed, 0 skipped** (about 21 seconds).

| File | Tests | Result | What it covers |
| --- | ---: | --- | --- |
| `server/tests/games.test.js` | 7 | 7 pass | Game engines: Tic Tac Toe win/draw/timeout, Connect Four gravity/win/full column, RPS rounds and draw, Memory pairs and hidden cards, Quick Tap scoring and time-up |
| `server/tests/api.test.js` | 6 | 6 pass | Health/store mode, registration validation and duplicates, login + JWT protection, rooms, profile save success/validation/auth errors, leaderboard and match history |
| `server/tests/local_games.test.js` | 9 | 9 pass | Local catalogue and player ranges, isolated players, all five hot-seat games, privacy handoff, local timeout and rematch |
| `server/tests/multiplayer.test.js` | 1 | 1 pass | Two real Socket.IO clients complete and persist a Tic Tac Toe match |
| `server/tests/multiplayer_games.test.js` | 4 | 4 pass | Socket integration for RPS, Connect Four, Memory Match and Quick Tap |
| `server/tests/mysql_tls.test.js` | 5 | 5 pass | TLS defaults off, CA ignored when disabled, opt-in TLS, CA used only when enabled, env defaults |

Run subsets with `npm run test:games` and `npm run test:api`.

---

## 2. Build verification

```bash
npm run build
```

Result: passed with Vite 6.4.6; 160 modules transformed; no warnings or errors.

```text
dist/index.html                    0.95 kB  │ gzip:   0.59 kB
dist/assets/index-BOS7OokV.css     51.49 kB │ gzip:  10.84 kB
dist/assets/index-B8Gargke.js     371.39 kB │ gzip: 116.95 kB
```

---

## 3. Local multiplayer coverage

**Automated — 9 passing tests.** These cover the local catalogue and player ranges for all five games, isolated local player identities, turn alternation, hidden boards/choices during handoff, a per-player timed turn in Quick Tap, local timeout handoff and rematch.

**Manually played earlier on the live site** (recorded in `FINAL_TESTING_REPORT.md` on 20 November 2026; not repeated today):

| Game | Observed result |
| --- | --- |
| Tic Tac Toe | completed, 3/1 scores, handoff after each move |
| Connect Four | completed, 3/1 scores |
| Rock Paper Scissors | completed, 5/0, hidden `❔` choice until reveal |
| Memory Match | pair, mismatch and handoff verified |
| Quick Tap | 20/19 with separate 10-second turns |

Local results are shown on screen only; they are not saved online.

---

## 4. Online multiplayer coverage

**Automated — 5 passing socket tests.** One full Tic Tac Toe integration test covers REST membership before socket join, host-only start, turn order, a win, persistence and rematch. Four more tests cover RPS (five rounds), Connect Four (gravity and vertical win), Memory Match (hidden symbols and turn order) and Quick Tap (server-side hit/miss scoring).

**Manually played earlier on the live deployment** (20 November 2026): room `VN832H`, match `9fd330bd-6857-484d-82c7-08a94eeb1251`, host won 3/1 with reason `three-in-a-row`; the saved result and standings were visible.

**Manually completed live on 21 November 2026** against `https://funzone-k94k.onrender.com` using two independent browser origins (`localhost:5002` and `127.0.0.1:5002`) and two separate accounts. Room creation, REST join, socket join, readiness, host start, gameplay, server scoring, results and rematch were verified for each game:

| Game | Room | Saved match | Result | Notes |
| --- | --- | --- | --- | --- |
| Tic Tac Toe (earlier) | VN832H | `9fd330bd-6857-484d-82c7-08a94eeb1251` | Host won 3/1, `three-in-a-row` | Full online flow verified earlier. |
| Rock Paper Scissors | 92YLSM | `e89b7be0-2e32-4b4c-8664-327b6970a7e5` | `livetest917863b` won 2/0, `rounds-complete` | Five-round flow and rematch verified. Some individual rounds timed out because of slow scripted clicks; the match still completed and scored on the server. |
| Connect Four | PLRD5P | `02237677-b6f5-43ad-877e-d0d55ceedc86` | `livetest917863a` won 3/1, `connect-four` | A genuine vertical four-in-a-row was completed in 3 seconds; rematch verified. Earlier harness-timed matches were not counted as passes. |
| Memory Match | 4QPQAJ | `4f3cb464-f33f-4218-8a1a-8a0b0c39af40` | `livetest917863a` won 10/6, `all-pairs-found` | All 16 cards (8 pairs) matched; hidden symbols were never leaked to clients; rematch verified. |
| Quick Tap | G9WN7H | `33e4fce4-8f0c-486c-9d5f-2097ea066a91` | `livetest917863a` won 621/267, `time-up` | Hits 56/29 and misses 139/195 recorded server-side; shared 30-second match; rematch verified. |

No application defect was confirmed in these flows. The earlier timeouts were caused by slow test-harness interaction, not by the deployed game logic.

---

## 5. Profile save verification

The previously reported `result.ok` bug is fixed. An API test checks that a PATCH succeeds with `{ profile }`, that avatar, colour and bio persist through `/api/auth/me` and `/api/users/:id`, that a partial patch keeps other fields, and that 400 validation and 401 unauthenticated requests are rejected without changing the profile.

A local browser check was also performed on 20 November 2026 using a temporary account: the success toast appeared, the editor closed, and the avatar, cyan colour and bio survived a reload. A 241-character bio showed the validation message and left the Save button usable.

---

## 6. Manual browser verification (historical, 19 November 2026)

Two browser sessions were used with different origins to simulate two players:

- Tab A: `http://localhost:5173` as `browser_alice`
- Tab B: `http://127.0.0.1:5173` as `browser_bob`

| Flow | Result |
| --- | --- |
| Landing, catalogue and navigation | Pass |
| Two registrations and room creation with 6-character code | Pass |
| Join from second session, ready and host-only start | Pass |
| Waiting-room chat and copy-code control | Pass |
| Live Tic Tac Toe, results, saved badge and rematch | Pass |
| RPS / Connect Four / Memory / Quick Tap UI smoke checks | Pass |
| Leaderboard and profile rendering | Pass |
| Browser console (both tabs) | No errors |

Bugs fixed during that testing: missing `toast.info`, rematch navigation for the non-requesting player, wrong socket assertion target, and an incorrect Connect Four loser-score expectation.

---

## 7. Deployed website verification (Render free tier)

**Live URL:** https://funzone-k94k.onrender.com  
**Commit verified as deployed at that audit:** `eedb4b2d7c8298e8ff5787a3da6dc83faa64ee11`

Health returned `{"ok":true,"status":"healthy","mode":"memory"}`. Frontend, REST API and Socket.IO were served from the same HTTPS origin; registration, login, room creation, joining, ready/start, a full Tic Tac Toe match, results persistence and rematch all passed. The free instance sleeps after inactivity, so the first request can be slow.

The live bundle currently serves the earlier asset hash `index-CWLefblD.js`. The profile-save fix and TLS preparation made after that audit are **local changes only** — no deploy was performed.

---

## 8. MySQL and TLS status

- MySQL 8.0.46 is installed locally, but no credentials were supplied, so live MySQL mode remains **untested**.
- `database/schema.sql` defines 8 tables and 5 seeded achievements; `mysqlStore` uses parameterized queries and the same interface as `memoryStore`.
- TLS is now opt-in through `DB_SSL` and `DB_SSL_CA`, disabled by default. Five tests check the configuration without connecting to a database or using any certificate.
- No account, database, credential or certificate was created or entered. Render environment variables and production memory mode were not changed.

---

## 9. Conclusion

All 32 automated tests pass and the production build succeeds. Both play modes are covered: 9 local tests plus earlier live playthroughs of all five local games, and 5 online socket tests plus live online playthroughs of all five games. The remaining untested path is live MySQL (no credentials supplied). The newest local fixes are staged for deployment; this report will be updated with the actual Render status after the authorized deploy.
