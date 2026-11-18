# FunZone API & Socket.IO Documentation

Base URL (development): `http://localhost:5000/api`

All responses are JSON. Errors use `{ "error": "message", "details"?: [...] }`.

Authenticated endpoints require:

```http
Authorization: Bearer <JWT>
```

Socket.IO connections must also pass the token:

```js
io('http://localhost:5000', { auth: { token } });
```

---

## 1. REST endpoints

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Server status and active data store (`memory` or `mysql`) |
| POST | `/auth/register` | Create account, returns JWT + user |
| POST | `/auth/login` | Login with username/email + password, returns JWT + user |
| GET | `/games` | List the five games and their metadata |

**Register / login body**

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "pass1234"
}
```

Login accepts `{ "identity": "alice" | "alice@example.com", "password": "pass1234" }`.

**Success shape**

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "uuid", "username": "alice", "email": "alice@example.com" }
}
```

### Authenticated

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/auth/me` | Current user + profile + achievements |
| POST | `/auth/onboarding` | Save chosen avatar/colour on first login |
| GET | `/users/:id` | Public profile of another player |
| PATCH | `/users/me` | Update avatar, colour or bio |
| GET | `/achievements` | All achievements and which ones you unlocked |
| GET | `/games-meta` | Same game catalogue, requires auth |
| POST | `/rooms` | Create a room |
| GET | `/rooms/:code` | Room details + players |
| POST | `/rooms/:code/join` | Join an existing waiting room |
| POST | `/rooms/:code/leave` | Leave a room |
| GET | `/matches?mine=true` | Your match history |
| GET | `/matches/:id` | Full details of one match |
| GET | `/leaderboard` | Ranked players with W/L/D, points and win rate |

**Create room body**

```json
{ "gameType": "tic_tac_toe", "maxPlayers": 2, "isPrivate": true }
```

Valid `gameType` values: `tic_tac_toe`, `rock_paper_scissors`, `connect_four`, `memory_match`, `quick_tap`.

**Create room response (excerpt)**

```json
{
  "room": { "id": "uuid", "code": "XE8NBZ", "game_type": "tic_tac_toe", "status": "waiting", "max_players": 2 },
  "players": [{ "user_id": "uuid", "username": "alice", "is_host": true, "is_ready": false }],
  "game": { "id": "tic_tac_toe", "name": "Tic Tac Toe", "minPlayers": 2, "maxPlayers": 2 }
}
```

---

## 2. Socket.IO events

### Client → server

| Event | Payload | Description |
| --- | --- | --- |
| `room:join` | `{ code }` | Join the room socket namespace; validates membership |
| `room:leave` | — | Leave the current room |
| `player:ready` | `{ ready: true|false }` | Toggle your ready state |
| `room:start` | — | Host-only: begin the match when everyone is ready |
| `game:action` | `{ action }` | Submit a game intent (see below) |
| `room:rematch` | — | Reset a finished room back to waiting |
| `chat:send` | `{ message }` | Send a room chat message (max 160 chars) |
| `room:sync` | — | Request a fresh room state / reconnect |

### Server → client

| Event | Payload | Description |
| --- | --- | --- |
| `connected` | `{ userId, username, at }` | Socket authenticated |
| `room:state` | Room view | Full room + personalized game view, broadcast on every change |
| `game:ended` | Result summary | Winner, scores, reason, match record; frontend navigates to results |
| `game:error` | `{ message }` | Invalid action (wrong turn, invalid cell, too fast…) |
| `room:error` | `{ message }` | Room-level error (not a member, full room…) |
| `notification` | `{ type, message }` | Toast message (info/success/warning/error) |

### `room:state` shape

```js
{
  code: 'XE8NBZ',
  gameType: 'tic_tac_toe',
  status: 'waiting' | 'playing' | 'finished',
  hostId: 'uuid',
  minPlayers: 2,
  maxPlayers: 2,
  players: [{ id, username, avatar, avatarColor, ready, connected, isHost }],
  gameState: { /* game-specific, private-safe view */ },
  matchId: 'uuid' | null,
  deadline: 1730000000000 | null,
  serverNow: 1730000000000,
  chat: [{ id, userId, username, text, at }]
}
```

### Game intents (`game:action`)

| Game | Action examples |
| --- | --- |
| Tic Tac Toe | `{ type: 'move', cell: 0 }` (cell 0–8) |
| Connect Four | `{ type: 'drop', column: 3 }` (column 0–6) |
| Rock Paper Scissors | `{ type: 'choice', choice: 'rock' }` (`rock`, `paper`, `scissors`) |
| Memory Match | `{ type: 'flip', index: 5 }` (card index 0–15) |
| Quick Tap | `{ type: 'tap', cell: 12 }` (tile index 0–24) |

The server recalculates scores from its own state. Memory Match hides face-down symbols in `gameState.deck` (`symbol: null`) so clients cannot cheat.

---

## 3. Typical multiplayer sequence

```js
// After REST login/register returns a token:
const socket = io('http://localhost:5000', { auth: { token } });

socket.emit('room:join', { code: 'XE8NBZ' });
socket.on('room:state', (state) => { /* render waiting room or game */ });

socket.emit('player:ready', { ready: true });
// Host only:
socket.emit('room:start');

// During play:
socket.emit('game:action', { action: { type: 'move', cell: 4 } });

socket.on('game:ended', (result) => {
  // result.match.id -> navigate to /results/:id
});

socket.emit('room:rematch');
```

---

## 4. Error codes

| HTTP | Meaning |
| --- | --- |
| 400 | Validation failed or invalid game type |
| 401 | Missing/invalid/expired JWT |
| 404 | Room, match or user not found |
| 409 | Duplicate username/email, room full or game already started |
| 429 | Too many login/register attempts |

Socket errors arrive as `room:error` or `game:error` with `{ message }`.

A Postman collection with ready-to-run requests is in [postman_collection.json](postman_collection.json).
