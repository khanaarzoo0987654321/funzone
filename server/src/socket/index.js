import { joinSocket, leaveSocket, broadcast, toggleReady, startGame, handleAction, rematch, chat, debugLiveRooms } from './roomManager.js';

const member = (socket) => debugLiveRooms().get(socket.data.roomCode) || null;

const safe = (handler) => async (...args) => {
  try {
    await handler(...args);
  } catch (error) {
    console.error('[socket]', error);
    const socket = args[0];
    socket?.emit?.('room:error', { message: 'Something went wrong. Please try again.' });
  }
};

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.emit('connected', { userId: user.id, username: user.username, at: Date.now() });

    socket.on('room:join', safe(async (payload) => {
      await joinSocket(socket, payload?.code, user);
    }));

    socket.on('room:leave', safe(() => leaveSocket(socket)));

    socket.on('player:ready', safe(async (payload) => {
      const rt = member(socket);
      if (rt) await toggleReady(rt, user.id, payload?.ready !== false);
    }));

    socket.on('room:start', safe(async () => {
      const rt = member(socket);
      if (rt) await startGame(rt, user.id);
    }));

    socket.on('game:action', safe(async (payload) => {
      const rt = member(socket);
      if (rt) await handleAction(rt, user.id, payload?.action, socket);
    }));

    socket.on('room:rematch', safe(async () => {
      const rt = member(socket);
      if (rt) await rematch(rt, user.id);
    }));

    socket.on('chat:send', safe((payload) => {
      const rt = member(socket);
      if (rt) chat(rt, user, payload?.message);
    }));

    socket.on('room:sync', safe(async () => {
      const rt = member(socket);
      if (rt) broadcast(rt);
      else if (socket.data.lastRoomCode) await joinSocket(socket, socket.data.lastRoomCode, user);
    }));

    socket.on('disconnect', () => leaveSocket(socket));
  });
}
