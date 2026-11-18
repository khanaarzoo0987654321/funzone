import bcrypt from 'bcryptjs';
import { getStore } from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import { unauthorized, conflict } from '../utils/AppError.js';
import { checkAchievements } from '../services/achievements.js';

export const publicUser = (user, profile = null) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  created_at: user.created_at,
  ...(profile
    ? {
        avatar: profile.avatar,
        avatar_color: profile.avatar_color,
        bio: profile.bio,
        xp: profile.xp,
        level: profile.level,
        total_matches: profile.total_matches,
        wins: profile.wins,
        losses: profile.losses,
        draws: profile.draws,
      }
    : {}),
});

export async function register(req, res) {
  const store = getStore();
  const { username, email, password, avatar, avatarColor } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await store.createUser({ username, email, passwordHash, avatar, avatarColor });
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') throw conflict('An account with that email already exists.');
    if (error.code === 'USERNAME_TAKEN') throw conflict('That username is already taken.');
    throw error;
  }

  const profile = await store.getProfile(user.id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user, profile) });
}

export async function login(req, res) {
  const store = getStore();
  const { identity, password } = req.body;
  const user =
    (await store.findUserByEmail(identity)) || (await store.findUserByUsername(identity));
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    throw unauthorized('Incorrect username/email or password.');

  const profile = await store.getProfile(user.id);
  const token = signToken(user);
  res.json({ token, user: publicUser(user, profile) });
}

export async function me(req, res) {
  const store = getStore();
  const user = await store.findUserById(req.user.id);
  if (!user) throw unauthorized('Your account no longer exists. Please sign in again.');
  const [profile, achievements] = await Promise.all([
    store.getProfile(user.id),
    store.listUserAchievements(user.id),
  ]);
  res.json({ user: publicUser(user, profile), achievements });
}

export async function onboarding(req, res) {
  const unlocked = await checkAchievements(req.user.id);
  res.json({ unlocked });
}
