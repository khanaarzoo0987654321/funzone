import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env lives at the project root (two levels above config/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const number = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: number(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'funzone-dev-secret-change-me-before-deploying',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dataStore: (process.env.DATA_STORE || 'auto').toLowerCase(),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: number(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'funzone',
    autoSetup: (process.env.DB_AUTO_SETUP || 'false').toLowerCase() === 'true',
  },
};

export const isProduction = env.nodeEnv === 'production';
