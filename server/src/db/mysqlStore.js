/**
 * MySQL implementation of the FunZone data store.
 * Every query is parameterized. No user input is ever interpolated into SQL.
 */
import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { uuid, iso, nowIso, roomCode } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

const normalizeUser = (row) =>
  row ? { ...row, created_at: iso(row.created_at), updated_at: iso(row.updated_at) } : null;

const normalizeProfile = (row) => (row ? { ...row, updated_at: iso(row.updated_at) } : null);

const normalizeRoom = (row) =>
  row
    ? {
        ...row,
        is_private: Number(row.is_private),
        created_at: iso(row.created_at),
        closed_at: iso(row.closed_at),
      }
    : null;

const normalizePlayer = (row) =>
  row
    ? {
        ...row,
        is_host: Number(row.is_host),
        is_ready: Number(row.is_ready),
        joined_at: iso(row.joined_at),
      }
    : null;

const normalizeMatch = (row) => {
  if (!row) return null;
  let finalState = row.final_state;
  if (typeof finalState === 'string') {
    try {
      finalState = JSON.parse(finalState);
    } catch {
      finalState = null;
    }
  }
  return {
    ...row,
    is_draw: Number(row.is_draw),
    final_state: finalState,
    started_at: iso(row.started_at),
    ended_at: iso(row.ended_at),
  };
};

function dbError(error) {
  if (error?.code === 'ER_DUP_ENTRY') {
    if (String(error.message).includes('users_email')) return Object.assign(new Error('EMAIL_TAKEN'), { code: 'EMAIL_TAKEN' });
    if (String(error.message).includes('users_username')) return Object.assign(new Error('USERNAME_TAKEN'), { code: 'USERNAME_TAKEN' });
    if (String(error.message).includes('uq_rooms_code')) return Object.assign(new Error('ROOM_CODE_TAKEN'), { code: 'ROOM_CODE_TAKEN' });
  }
  throw error;
}

export const mysqlStore = {
  mode: 'mysql',

  async init() {
    const config = {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      charset: 'utf8mb4',
      namedPlaceholders: true,
      waitForConnections: true,
      connectionLimit: 10,
    };

    if (env.db.autoSetup) {
      const root = path.resolve(__dirname, '../../../database/schema.sql');
      const sql = await fs.readFile(root, 'utf8');
      const bootstrap = await mysql.createConnection({ ...config, database: undefined });
      // Execute statements one by one (CREATE DATABASE / USE / DROP / CREATE).
      for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        // Skip comment-only fragments but keep comment+SQL fragments intact.
        if (/^\s*--(.*\n)*\s*$/.test(statement)) continue;
        await bootstrap.query(statement);
      }
      await bootstrap.end();
    }

    pool = mysql.createPool({ ...config, database: env.db.database });
    await pool.query('SELECT 1');
    return { ok: true, mode: 'mysql' };
  },

  async health() {
    await pool.query('SELECT 1');
    return { ok: true, mode: 'mysql' };
  },

  // ---------- users ----------
  async createUser({ username, email, passwordHash, avatar = 'rocket', avatarColor = 'violet' }) {
    const id = uuid();
    try {
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, username, email, passwordHash, nowIso(), nowIso()],
      );
      await pool.query(
        `INSERT INTO player_profiles (user_id, avatar, avatar_color, updated_at) VALUES (?, ?, ?, ?)`,
        [id, avatar, avatarColor, nowIso()],
      );
    } catch (error) {
      dbError(error);
    }
    return this.findUserById(id);
  },

  async findUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return normalizeUser(rows[0]);
  },

  async findUserByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    return normalizeUser(rows[0]);
  },

  async findUserById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return normalizeUser(rows[0]);
  },

  async updateUser(id, patch) {
    const fields = [];
    const values = [];
    for (const key of ['username', 'email', 'password_hash']) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(patch[key]);
      }
    }
    if (!fields.length) return this.findUserById(id);
    fields.push('updated_at = ?');
    values.push(nowIso(), id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findUserById(id);
  },

  // ---------- profiles ----------
  async getProfile(userId) {
    const [rows] = await pool.query('SELECT * FROM player_profiles WHERE user_id = ?', [userId]);
    return normalizeProfile(rows[0]);
  },

  async updateProfile(userId, patch) {
    const fields = [];
    const values = [];
    for (const key of ['avatar', 'avatar_color', 'bio']) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(patch[key]);
      }
    }
    if (!fields.length) return this.getProfile(userId);
    fields.push('updated_at = ?');
    values.push(nowIso(), userId);
    await pool.query(`UPDATE player_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
    return this.getProfile(userId);
  },

  async recordMatchStats({ scores, winnerId, isDraw }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [userId, entry] of Object.entries(scores || {})) {
        const outcome = isDraw ? 'draw' : winnerId === userId ? 'win' : 'loss';
        const xp = isDraw ? 15 : outcome === 'win' ? 50 : 20;
        const win = outcome === 'win' ? 1 : 0;
        const loss = outcome === 'loss' ? 1 : 0;
        const draw = outcome === 'draw' ? 1 : 0;
        await connection.query(
          `UPDATE player_profiles
             SET total_matches = total_matches + 1,
                 wins = wins + ?, losses = losses + ?, draws = draws + ?,
                 xp = xp + ?,
                 level = GREATEST(1, FLOOR((xp + ?) / 150) + 1),
                 updated_at = ?
           WHERE user_id = ?`,
          [win, loss, draw, xp, xp, nowIso(), userId],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // ---------- rooms ----------
  async createRoom({ gameType, hostId, maxPlayers = 2, isPrivate = true, code = roomCode() }) {
    const id = uuid();
    await pool.query(
      `INSERT INTO game_rooms (id, code, game_type, host_id, max_players, is_private, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)`,
      [id, code.toUpperCase(), gameType, hostId, maxPlayers, isPrivate ? 1 : 0, nowIso()],
    );
    return this.getRoomById(id);
  },

  async getRoomByCode(code) {
    const [rows] = await pool.query('SELECT * FROM game_rooms WHERE code = ? LIMIT 1', [String(code).toUpperCase()]);
    return normalizeRoom(rows[0]);
  },

  async getRoomById(id) {
    const [rows] = await pool.query('SELECT * FROM game_rooms WHERE id = ? LIMIT 1', [id]);
    return normalizeRoom(rows[0]);
  },

  async updateRoom(id, patch) {
    const fields = [];
    const values = [];
    for (const key of ['status', 'host_id', 'closed_at']) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(patch[key]);
      }
    }
    if (!fields.length) return this.getRoomById(id);
    values.push(id);
    await pool.query(`UPDATE game_rooms SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getRoomById(id);
  },

  async listRooms(status = 'waiting') {
    const [rows] = await pool.query('SELECT * FROM game_rooms WHERE status = ? ORDER BY created_at DESC LIMIT 50', [status]);
    return rows.map(normalizeRoom);
  },

  async deleteRoom(id) {
    await pool.query('DELETE FROM game_rooms WHERE id = ?', [id]);
  },

  // ---------- room players ----------
  async getRoomPlayer(roomId, userId) {
    const [rows] = await pool.query('SELECT * FROM room_players WHERE room_id = ? AND user_id = ? LIMIT 1', [roomId, userId]);
    return normalizePlayer(rows[0]);
  },

  async addRoomPlayer({ roomId, userId, isHost = false, seat = 0 }) {
    const existing = await this.getRoomPlayer(roomId, userId);
    if (existing) return existing;
    await pool.query(
      `INSERT INTO room_players (id, room_id, user_id, is_host, is_ready, seat, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), roomId, userId, isHost ? 1 : 0, isHost ? 1 : 0, seat, nowIso()],
    );
    return this.getRoomPlayer(roomId, userId);
  },

  async removeRoomPlayer(roomId, userId) {
    await pool.query('DELETE FROM room_players WHERE room_id = ? AND user_id = ?', [roomId, userId]);
  },

  async listRoomPlayers(roomId) {
    const [rows] = await pool.query(
      `SELECT rp.*, u.username, p.avatar, p.avatar_color
         FROM room_players rp
         JOIN users u ON u.id = rp.user_id
         LEFT JOIN player_profiles p ON p.user_id = rp.user_id
        WHERE rp.room_id = ? ORDER BY rp.seat ASC`,
      [roomId],
    );
    return rows.map(normalizePlayer);
  },

  async setPlayerReady(roomId, userId, ready) {
    await pool.query('UPDATE room_players SET is_ready = ? WHERE room_id = ? AND user_id = ?', [ready ? 1 : 0, roomId, userId]);
    return this.getRoomPlayer(roomId, userId);
  },

  async transferHost(roomId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE room_players SET is_host = 0 WHERE room_id = ?', [roomId]);
      await connection.query('UPDATE room_players SET is_host = 1 WHERE room_id = ? AND user_id = ?', [roomId, userId]);
      await connection.query('UPDATE game_rooms SET host_id = ? WHERE id = ?', [userId, roomId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getRoomPlayer(roomId, userId);
  },

  // ---------- matches ----------
  async createMatch({ roomId, gameType }) {
    const id = uuid();
    await pool.query(
      `INSERT INTO matches (id, room_id, game_type, status, started_at) VALUES (?, ?, ?, 'playing', ?)`,
      [id, roomId, gameType, nowIso()],
    );
    return normalizeMatch((await pool.query('SELECT * FROM matches WHERE id = ?', [id]))[0][0]);
  },

  async finishMatch(matchId, { winnerId = null, isDraw = false, durationSeconds = 0, finalState = null, scores = {} }) {
    await pool.query(
      `UPDATE matches SET winner_id = ?, is_draw = ?, duration_seconds = ?, final_state = ?, status = 'finished', ended_at = ?
        WHERE id = ?`,
      [winnerId, isDraw ? 1 : 0, durationSeconds, finalState ? JSON.stringify(finalState) : null, nowIso(), matchId],
    );

    const ordered = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    for (let index = 0; index < ordered.length; index += 1) {
      const [userId, entry] = ordered[index];
      await pool.query(
        `INSERT INTO match_players (id, match_id, user_id, score, position, outcome) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score), position = VALUES(position), outcome = VALUES(outcome)`,
        [
          uuid(),
          matchId,
          userId,
          entry.score,
          index + 1,
          isDraw ? 'draw' : winnerId === userId ? 'win' : 'loss',
        ],
      );
    }
    return this.getMatch(matchId);
  },

  async getMatch(id) {
    const [rows] = await pool.query('SELECT * FROM matches WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return null;
    const [players] = await pool.query(
      `SELECT mp.*, u.username, p.avatar, p.avatar_color
         FROM match_players mp
         JOIN users u ON u.id = mp.user_id
         LEFT JOIN player_profiles p ON p.user_id = mp.user_id
        WHERE mp.match_id = ? ORDER BY mp.score DESC`,
      [id],
    );
    return { ...normalizeMatch(rows[0]), players };
  },

  async listMatches({ userId = null, limit = 20, gameType = null } = {}) {
    const conditions = [];
    const params = [];
    if (userId) {
      conditions.push('EXISTS (SELECT 1 FROM match_players mp WHERE mp.match_id = m.id AND mp.user_id = ?)');
      params.push(userId);
    }
    if (gameType) {
      conditions.push('m.game_type = ?');
      params.push(gameType);
    }
    params.push(Math.min(Math.max(Number(limit) || 20, 1), 100));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT m.* FROM matches m ${where} ORDER BY m.started_at DESC LIMIT ?`,
      params,
    );
    return Promise.all(rows.map((row) => this.getMatch(row.id)));
  },

  // ---------- leaderboard ----------
  async listLeaderboard({ gameType = null, limit = 50 } = {}) {
    const params = [];
    let join = '';
    let where = '';
    if (gameType) {
      join = `JOIN matches m ON m.status = 'finished' AND m.game_type = ?
              JOIN match_players mp ON mp.match_id = m.id AND mp.user_id = p.user_id`;
      params.push(gameType);
      where = 'GROUP BY p.user_id';
    }
    params.push(Math.min(Math.max(Number(limit) || 50, 1), 100));
    const [rows] = await pool.query(
      `SELECT p.user_id, u.username, p.avatar, p.avatar_color, p.level, p.xp, p.wins, p.losses, p.draws, p.total_matches,
              CASE WHEN p.total_matches = 0 THEN 0 ELSE ROUND(p.wins / p.total_matches * 100) END AS win_rate
         FROM player_profiles p
         JOIN users u ON u.id = p.user_id
         ${join}
         ${where}
        ORDER BY p.xp DESC, p.wins DESC
        LIMIT ?`,
      params,
    );
    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  },

  // ---------- achievements ----------
  async listAchievements() {
    const [rows] = await pool.query('SELECT * FROM achievements ORDER BY id');
    return rows;
  },

  async listUserAchievements(userId) {
    const [rows] = await pool.query(
      `SELECT ua.user_id, ua.unlocked_at, a.*
         FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC`,
      [userId],
    );
    return rows.map((row) => ({ ...row, unlocked_at: iso(row.unlocked_at) }));
  },

  async unlockAchievement(userId, code) {
    const [rows] = await pool.query('SELECT id FROM achievements WHERE code = ? LIMIT 1', [code]);
    if (!rows[0]) return null;
    try {
      await pool.query(
        'INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)',
        [uuid(), userId, rows[0].id, nowIso()],
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') return null;
      throw error;
    }
    return { user_id: userId, code, unlocked_at: nowIso() };
  },

  async close() {
    if (pool) await pool.end();
  },
};
