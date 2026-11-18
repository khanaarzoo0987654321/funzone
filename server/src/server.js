import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initStore } from './db/index.js';
import { socketAuth } from './middleware/auth.js';
import { setIo, startGameLoop } from './socket/roomManager.js';
import { registerSocketHandlers } from './socket/index.js';

async function main() {
  await initStore();

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.clientUrl.split(',').map((url) => url.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(socketAuth);
  setIo(io);
  registerSocketHandlers(io);
  startGameLoop();

  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`[funzone] HTTP + Socket.IO listening on http://localhost:${env.port}`);
    console.log(`[funzone] Client URL: ${env.clientUrl}`);
  });

  const shutdown = async () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[startup] Failed to start FunZone:', error);
  process.exit(1);
});
