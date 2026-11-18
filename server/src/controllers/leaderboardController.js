import { getStore } from '../db/index.js';

export async function leaderboard(req, res) {
  const store = getStore();
  const gameType = req.query.gameType && req.query.gameType !== 'all' ? req.query.gameType : null;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const players = await store.listLeaderboard({ gameType, limit });
  const me = players.find((p) => p.user_id === req.user.id) || null;
  res.json({ players, me, gameType: gameType || 'all' });
}
