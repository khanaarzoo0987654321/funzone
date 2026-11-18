import { getStore } from '../db/index.js';

const ACHIEVEMENTS = {
  first_match: (p) => p.total_matches >= 1,
  first_win: (p) => p.wins >= 1,
  five_wins: (p) => p.wins >= 5,
  all_games: (_p, games) => games.size >= 5,
  level_5: (p) => p.level >= 5,
};

export async function checkAchievements(userId) {
  const store = getStore();
  const [profile, matches] = await Promise.all([
    store.getProfile(userId),
    store.listMatches({ userId, limit: 100 }),
  ]);
  if (!profile) return [];
  const games = new Set(matches.map((m) => m.game_type));
  const unlocked = [];
  for (const [code, condition] of Object.entries(ACHIEVEMENTS)) {
    if (condition(profile, games)) {
      const result = await store.unlockAchievement(userId, code);
      if (result) unlocked.push(code);
    }
  }
  return unlocked;
}
