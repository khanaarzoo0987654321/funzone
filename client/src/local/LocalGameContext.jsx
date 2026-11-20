import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createLocalSession, rematchSession } from './localSession.js';

const LocalGameContext = createContext(null);

export function LocalGameProvider({ children }) {
  const [session, setSession] = useState(null);

  const start = useCallback((gameId, names) => {
    setSession(createLocalSession(gameId, names));
  }, []);

  const update = useCallback((updater) => {
    setSession((previous) => (typeof updater === 'function' ? updater(previous) : updater));
  }, []);

  const rematch = useCallback(() => {
    setSession((previous) => rematchSession(previous));
  }, []);

  const clear = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({ session, start, update, rematch, clear }),
    [session, start, update, rematch, clear],
  );

  return <LocalGameContext.Provider value={value}>{children}</LocalGameContext.Provider>;
}

export function useLocalGame() {
  const context = useContext(LocalGameContext);
  if (!context) throw new Error('useLocalGame must be used inside LocalGameProvider.');
  return context;
}
