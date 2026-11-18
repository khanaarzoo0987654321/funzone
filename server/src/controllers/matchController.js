import { getStore } from '../db/index.js';
import { notFound } from '../utils/AppError.js';

export async function listMatches(req, res) {
  const store = getStore();
  const userId = req.query.userId || (req.query.mine === 'true' ? req.user.id : null);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const matches = await store.listMatches({ userId, limit, gameType: req.query.gameType || null });
  res.json({ matches, count: matches.length });
}

export async function getMatch(req, res) {
  const store = getStore();
  const match = await store.getMatch(req.params.id);
  if (!match) throw notFound('Match not found.');
  res.json({ match });
}
