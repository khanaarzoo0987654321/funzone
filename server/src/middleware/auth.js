import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/AppError.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user) return next(unauthorized('Your session has expired. Please sign in again.'));
  req.user = user;
  next();
}

export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  const user = token ? verifyToken(token) : null;
  if (!user) {
    const error = new Error('Authentication failed');
    error.data = { message: 'Please sign in before connecting.' };
    return next(error);
  }
  socket.data.user = user;
  next();
}
