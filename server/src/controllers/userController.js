import { getStore } from '../db/index.js';
import { notFound } from '../utils/AppError.js';
import { publicUser } from './authController.js';
import { checkAchievements } from '../services/achievements.js';

export async function getProfile(req, res) {
  const store = getStore();
  const user = await store.findUserById(req.params.id);
  if (!user) throw notFound('Player not found.');
  const [profile, achievements, matches] = await Promise.all([
    store.getProfile(user.id),
    store.listUserAchievements(user.id),
    store.listMatches({ userId: user.id, limit: 5 }),
  ]);
  res.json({
    player: publicUser(user, profile),
    achievements,
    recentMatches: matches,
  });
}

export async function updateProfile(req, res) {
  const store = getStore();
  const profile = await store.updateProfile(req.user.id, req.body);
  await checkAchievements(req.user.id);
  res.json({ profile });
}

export async function listAchievements(req, res) {
  const store = getStore();
  const all = await store.listAchievements();
  const mine = await store.listUserAchievements(req.user.id);
  const unlockedCodes = new Set(mine.map((a) => a.code));
  res.json({ achievements: all.map((a) => ({ ...a, unlocked: unlockedCodes.has(a.code) })) });
}
