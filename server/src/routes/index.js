import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateRegister, validateLogin, validateProfile } from '../middleware/validate.js';
import { asyncHandler } from '../utils/AppError.js';
import { getStore } from '../db/index.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as rooms from '../controllers/roomController.js';
import * as matches from '../controllers/matchController.js';
import * as leaderboard from '../controllers/leaderboardController.js';

const router = Router();

router.get('/health', asyncHandler(async (_req, res) => {
  const health = await getStore().health();
  res.json({
    ok: true,
    status: 'healthy',
    mode: health.mode,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}));

// Public
router.post('/auth/register', validateRegister, asyncHandler(auth.register));
router.post('/auth/login', validateLogin, asyncHandler(auth.login));
router.get('/games', rooms.listGames);

// Authenticated
router.use(authenticate);

router.get('/auth/me', asyncHandler(auth.me));
router.post('/auth/onboarding', asyncHandler(auth.onboarding));

router.get('/users/:id', asyncHandler(users.getProfile));
router.patch('/users/me', validateProfile, asyncHandler(users.updateProfile));
router.get('/achievements', asyncHandler(users.listAchievements));

router.get('/games-meta', rooms.listGames);
router.post('/rooms', asyncHandler(rooms.createRoom));
router.get('/rooms/:code', asyncHandler(rooms.getRoom));
router.post('/rooms/:code/join', asyncHandler(rooms.joinRoom));
router.post('/rooms/:code/leave', asyncHandler(rooms.leaveRoom));

router.get('/matches', asyncHandler(matches.listMatches));
router.get('/matches/:id', asyncHandler(matches.getMatch));

router.get('/leaderboard', asyncHandler(leaderboard.leaderboard));

export default router;
