import { env } from '../config/env.js';
import { memoryStore } from './memoryStore.js';
import { mysqlStore } from './mysqlStore.js';

let store;

/**
 * Select a data store. "auto" uses MySQL only when credentials are configured
 * AND a connection succeeds; otherwise it falls back to the in-memory demo
 * store so the platform is always runnable on a fresh machine.
 */
export async function initStore() {
  const mode = env.dataStore;

  if (mode === 'memory') {
    store = memoryStore;
  } else if (mode === 'mysql') {
    store = mysqlStore;
  } else {
    const hasCredentials = Boolean(env.db.password);
    if (!hasCredentials) {
      store = memoryStore;
    } else {
      try {
        await Promise.race([
          mysqlStore.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('MySQL connection timed out')), 5000)),
        ]);
        store = mysqlStore;
      } catch (error) {
        console.warn(`[db] MySQL unavailable (${error.message}). Falling back to in-memory demo store.`);
        store = memoryStore;
      }
    }
  }

  if (store !== mysqlStore) await store.init();
  console.log(`[db] Active data store: ${store.mode}${store.mode === 'memory' ? ' (demo data is reset on restart)' : ''}`);
  return store;
}

export function getStore() {
  if (!store) throw new Error('Data store has not been initialised.');
  return store;
}

export const isMysql = () => store === mysqlStore;
