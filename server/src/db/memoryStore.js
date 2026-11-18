/**
 * In-memory data store.
 * Mirrors the public interface of mysqlStore so the rest of the application
 * never needs to know which backend is active. Used for local demo/testing
 * when MySQL credentials are not configured.
 */
import { uuid, nowIso, clone, roomCode } from '../utils/helpers.js';

const ACHIEVEMENTS = [
  { id: '10000000-0000-4000-8000-000000000001', code: 'first_match', name: 'First Steps', description: 'Play your first match', icon: 'gamepad' },
  { id: '10000000-0000-4000-8000-000000000002', code: 'first_win', name: 'Sweet Victory', description: 'Win your first match', icon: 'trophy' },
  { id: '10000000-0000-4000-8000-000000000003', code: 'five_wins', name: 'On a Roll', description: 'Win 5 matches', icon: 'fire' },
  { id: '10000000-0000-4000-8000-000000000004', code: 'all_games', name: 'Explorer', description: 'Play all five games', icon: 'compass' },
  { id: '10000000-0000-4000-8000-000000000005', code: 'level_5', name: 'Veteran', description: 'Reach level 5', icon: 'star' },
];

const db = {
  users: new Map(),
  profiles: new Map(),
  rooms: new Map(),
  roomPlayers: new Map(),
  matches: new Map(),
  matchPlayers: new Map(),
  achievements: new Map(ACHIEVEMENTS.map((a) => [a.id, a])),
  userAchievements: new Map(),
};

const list = (map, filter = () => true) =>
  [...map.values()].filter(filter).map(clone);

const one = (value) => (value ? clone(value) : null);

const attachUsers = (playerRows) =>
  playerRows.map((p) => {
    const user = db.users.get(p.user_id);
    return {
      ...clone(p),
      username: user?.username || 'Unknown',
      avatar: user?.profile?.avatar || 'rocket',
      avatar_color: user?.profile?.avatar_color || 'violet',
    };
  });

// Profiles are stored on the profile map; keep lookup cheap
function ensureProfile(userId) {
  if (!db.profiles.has(userId)) {
    db.profiles.set(userId, {
      user_id: userId,
      avatar: 'rocket',
      avatar_color: 'violet',
      bio: '',
      xp: 0,
      level: 1,
      total_matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      updated_at: nowIso(),
    });
  }
  return db.profiles.get(userId);
}

export const memoryStore = {
  mode: 'memory',

  async init() {
    return { ok: true, mode: 'memory' };
  },

  async health() {
    return { ok: true, mode: 'memory' };
  },

  // ---------- users ----------
  async createUser({ username, email, passwordHash, avatar = 'rocket', avatarColor = 'violet' }) {
    if ([...db.users.values()].some((u) => u.email.toLowerCase() === email.toLowerCase()))
      throw Object.assign(new Error('EMAIL_TAKEN'), { code: 'EMAIL_TAKEN' });
    if ([...db.users.values()].some((u) => u.username.toLowerCase() === username.toLowerCase()))
      throw Object.assign(new Error('USERNAME_TAKEN'), { code: 'USERNAME_TAKEN' });

    const id = uuid();
    const timestamp = nowIso();
    const user = {
      id,
      username,
      email,
      password_hash: passwordHash,
      created_at: timestamp,
      updated_at: timestamp,
    };
    db.users.set(id, user);
    ensureProfile(id);
    db.users.get(id).profile = db.profiles.get(id);
    db.profiles.get(id).avatar = avatar;
    db.profiles.get(id).avatar_color = avatarColor;
    return one(user);
  },

  async findUserByEmail(email) {
    return one([...db.users.values()].find((u) => u.email.toLowerCase() === String(email).toLowerCase()));
  },

  async findUserByUsername(username) {
    return one([...db.users.values()].find((u) => u.username.toLowerCase() === String(username).toLowerCase()));
  },

  async findUserById(id) {
    return one(db.users.get(id));
  },

  async updateUser(id, patch) {
    const user = db.users.get(id);
    if (!user) return null;
    Object.assign(user, patch, { updated_at: nowIso() });
    if (user.profile) db.users.get(id).profile = user.profile;
    return one(user);
  },

  // ---------- profiles ----------
  async getProfile(userId) {
    return one(ensureProfile(userId));
  },

  async updateProfile(userId, patch) {
    const profile = ensureProfile(userId);
    const allowed = ['avatar', 'avatar_color', 'bio'];
    for (const key of allowed) if (patch[key] !== undefined) profile[key] = patch[key];
    profile.updated_at = nowIso();
    return one(profile);
  },

  async recordMatchStats({ scores, winnerId, isDraw }) {
    for (const [userId, entry] of Object.entries(scores || {})) {
      const profile = ensureProfile(userId);
      const outcome = isDraw ? 'draw' : winnerId === userId ? 'win' : 'loss';
      profile.total_matches += 1;
      if (outcome === 'win') profile.wins += 1;
      else if (outcome === 'loss') profile.losses += 1;
      else profile.draws += 1;
      profile.xp += isDraw ? 15 : outcome === 'win' ? 50 : 20;
      profile.level = Math.max(1, Math.floor(profile.xp / 150) + 1);
      profile.updated_at = nowIso();
    }
  },

  // ---------- rooms ----------
  async createRoom({ gameType, hostId, maxPlayers = 2, isPrivate = true, code = roomCode() }) {
    const room = {
      id: uuid(),
      code: code.toUpperCase(),
      game_type: gameType,
      host_id: hostId,
      max_players: maxPlayers,
      is_private: isPrivate ? 1 : 0,
      status: 'waiting',
      created_at: nowIso(),
      closed_at: null,
    };
    db.rooms.set(room.id, room);
    return one(room);
  },

  async getRoomByCode(code) {
    return one([...db.rooms.values()].find((r) => r.code === String(code).toUpperCase()));
  },

  async getRoomById(id) {
    return one(db.rooms.get(id));
  },

  async updateRoom(id, patch) {
    const room = db.rooms.get(id);
    if (!room) return null;
    Object.assign(room, patch);
    return one(room);
  },

  async listRooms(status = 'waiting') {
    return list(db.rooms, (r) => r.status === status);
  },

  async deleteRoom(id) {
    db.rooms.delete(id);
    for (const [key, p] of db.roomPlayers) if (p.room_id === id) db.roomPlayers.delete(key);
  },

  // ---------- room players ----------
  async getRoomPlayer(roomId, userId) {
    return one([...db.roomPlayers.values()].find((p) => p.room_id === roomId && p.user_id === userId));
  },

  async addRoomPlayer({ roomId, userId, isHost = false, seat = 0 }) {
    const existing = await this.getRoomPlayer(roomId, userId);
    if (existing) return existing;
    const row = {
      id: uuid(),
      room_id: roomId,
      user_id: userId,
      is_host: isHost ? 1 : 0,
      is_ready: isHost ? 1 : 0,
      seat,
      joined_at: nowIso(),
    };
    db.roomPlayers.set(row.id, row);
    return one(row);
  },

  async removeRoomPlayer(roomId, userId) {
    for (const [key, p] of db.roomPlayers)
      if (p.room_id === roomId && p.user_id === userId) db.roomPlayers.delete(key);
  },

  async listRoomPlayers(roomId) {
    return attachUsers(list(db.roomPlayers, (p) => p.room_id === roomId)).sort((a, b) => a.seat - b.seat);
  },

  async setPlayerReady(roomId, userId, ready) {
    const row = [...db.roomPlayers.values()].find((p) => p.room_id === roomId && p.user_id === userId);
    if (!row) return null;
    row.is_ready = ready ? 1 : 0;
    return one(row);
  },

  async transferHost(roomId, userId) {
    const row = [...db.roomPlayers.values()].find((p) => p.room_id === roomId && p.user_id === userId);
    if (!row) return null;
    for (const p of db.roomPlayers.values()) if (p.room_id === roomId) p.is_host = 0;
    row.is_host = 1;
    return one(row);
  },

  // ---------- matches ----------
  async createMatch({ roomId, gameType }) {
    const match = {
      id: uuid(),
      room_id: roomId,
      game_type: gameType,
      winner_id: null,
      is_draw: 0,
      duration_seconds: 0,
      final_state: null,
      status: 'playing',
      started_at: nowIso(),
      ended_at: null,
    };
    db.matches.set(match.id, match);
    return one(match);
  },

  async finishMatch(matchId, { winnerId = null, isDraw = false, durationSeconds = 0, finalState = null, scores = {} }) {
    const match = db.matches.get(matchId);
    if (!match) return null;
    Object.assign(match, {
      winner_id: winnerId,
      is_draw: isDraw ? 1 : 0,
      duration_seconds: durationSeconds,
      final_state: finalState,
      status: 'finished',
      ended_at: nowIso(),
    });

    const ordered = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    ordered.forEach(([userId, entry], index) => {
      const row = {
        id: uuid(),
        match_id: matchId,
        user_id: userId,
        score: entry.score,
        position: index + 1,
        outcome: isDraw ? 'draw' : winnerId === userId ? 'win' : 'loss',
      };
      db.matchPlayers.set(row.id, row);
    });
    return this.getMatch(matchId);
  },

  async getMatch(id) {
    const match = db.matches.get(id);
    if (!match) return null;
    const players = list(db.matchPlayers, (p) => p.match_id === id).map((p) => {
      const user = db.users.get(p.user_id);
      return {
        ...p,
        username: user?.username || 'Unknown',
        avatar: user?.profile?.avatar || 'rocket',
        avatar_color: user?.profile?.avatar_color || 'violet',
      };
    });
    return { ...clone(match), players: players.sort((a, b) => b.score - a.score) };
  },

  async listMatches({ userId = null, limit = 20, gameType = null } = {}) {
    let rows = [...db.matches.values()];
    if (userId) rows = rows.filter((m) => [...db.matchPlayers.values()].some((p) => p.match_id === m.id && p.user_id === userId));
    if (gameType) rows = rows.filter((m) => m.game_type === gameType);
    rows.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    return rows.slice(0, limit).map((m) => this.getMatchSync(m.id));
  },

  getMatchSync(id) {
    const match = db.matches.get(id);
    if (!match) return null;
    const players = list(db.matchPlayers, (p) => p.match_id === id).map((p) => {
      const user = db.users.get(p.user_id);
      return {
        ...p,
        username: user?.username || 'Unknown',
        avatar: user?.profile?.avatar || 'rocket',
        avatar_color: user?.profile?.avatar_color || 'violet',
      };
    });
    return { ...clone(match), players: players.sort((a, b) => b.score - a.score) };
  },

  // ---------- leaderboard ----------
  async listLeaderboard({ gameType = null, limit = 50 } = {}) {
    let rows = [...db.profiles.values()];
    if (gameType) {
      const matchIds = new Set([...db.matches.values()].filter((m) => m.game_type === gameType).map((m) => m.id));
      const userIds = new Set(
        [...db.matchPlayers.values()].filter((p) => matchIds.has(p.match_id)).map((p) => p.user_id),
      );
      rows = rows.filter((p) => userIds.has(p.user_id));
    }
    rows.sort((a, b) => b.xp - a.xp || b.wins - a.wins);
    return rows.slice(0, limit).map((p, index) => {
      const user = db.users.get(p.user_id);
      return {
        rank: index + 1,
        user_id: p.user_id,
        username: user?.username || 'Unknown',
        avatar: p.avatar,
        avatar_color: p.avatar_color,
        level: p.level,
        xp: p.xp,
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        total_matches: p.total_matches,
        win_rate: p.total_matches ? Math.round((p.wins / p.total_matches) * 100) : 0,
      };
    });
  },

  // ---------- achievements ----------
  async listAchievements() {
    return list(db.achievements);
  },

  async listUserAchievements(userId) {
    return list(db.userAchievements, (a) => a.user_id === userId).map((a) => ({
      ...a,
      ...clone(db.achievements.get(a.achievement_id)),
    }));
  },

  async unlockAchievement(userId, code) {
    const achievement = [...db.achievements.values()].find((a) => a.code === code);
    if (!achievement) return null;
    const key = `${userId}:${code}`;
    if (db.userAchievements.has(key)) return null;
    const row = { id: uuid(), user_id: userId, achievement_id: achievement.id, unlocked_at: nowIso() };
    db.userAchievements.set(key, row);
    return one(row);
  },

  /** Test helper: wipe all data between test runs. */
  async reset() {
    for (const map of Object.values(db)) map.clear();
    for (const a of ACHIEVEMENTS) db.achievements.set(a.id, a);
  },
};
