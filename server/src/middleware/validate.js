import { badRequest } from '../utils/AppError.js';
import { CHOICES } from '../games/rockPaperScissors.js';

const isString = (value) => typeof value === 'string';
const clean = (value) => (isString(value) ? value.trim() : '');

export function validateRegister(req, _res, next) {
  const { username, email, password } = req.body || {};
  const errors = [];
  if (clean(username).length < 3 || clean(username).length > 32) errors.push('Username must be 3–32 characters.');
  if (!/^[a-zA-Z0-9_.-]+$/.test(clean(username))) errors.push('Username may only contain letters, numbers, dots, dashes and underscores.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(email))) errors.push('Enter a valid email address.');
  if (isString(password) && password.length < 6) errors.push('Password must be at least 6 characters.');
  if (!isString(password)) errors.push('Password is required.');
  if (errors.length) return next(badRequest(errors[0], errors));
  req.body.username = clean(username);
  req.body.email = clean(email).toLowerCase();
  next();
}

export function validateLogin(req, _res, next) {
  const { identity, password } = req.body || {};
  if (clean(identity).length < 3 || !isString(password) || !password)
    return next(badRequest('Enter your username or email and password.'));
  req.body.identity = clean(identity);
  next();
}

export function validateRoomAction(action) {
  return (req, _res, next) => {
    const { type } = req.body || {};
    if (action === 'choice' && !CHOICES.includes(req.body?.choice))
      return next(badRequest('Choose rock, paper or scissors.'));
    if (type && type !== action) return next(badRequest('Unexpected action for this endpoint.'));
    next();
  };
}

export function validateProfile(req, _res, next) {
  const { avatar, avatarColor, bio } = req.body || {};
  if (avatar !== undefined && clean(avatar).length > 64) return next(badRequest('Invalid avatar.'));
  if (avatarColor !== undefined && !/^[a-z-]{3,16}$/.test(clean(avatarColor)))
    return next(badRequest('Invalid avatar colour.'));
  if (bio !== undefined && clean(bio).length > 240) return next(badRequest('Bio must be 240 characters or fewer.'));
  next();
}
