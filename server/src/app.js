import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { AppError } from './utils/AppError.js';
import { env, isProduction } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Vite dev injects inline styles/scripts
  }));
  app.use(cors({
    origin: env.clientUrl.split(',').map((url) => url.trim()),
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.nodeEnv === 'test' ? 1000 : 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.use('/api', routes);

  const dist = path.resolve(__dirname, '../../dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next(new AppError(404, 'API endpoint not found.'));
    res.sendFile(path.join(dist, 'index.html'), (error) => {
      if (error) next(new AppError(404, 'Page not found.'));
    });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
    if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    console.error('[http error]', error);
    res.status(500).json({ error: isProduction ? 'Something went wrong on our end.' : error.message });
  });

  return app;
}
