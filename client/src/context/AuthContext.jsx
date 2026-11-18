import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, clearToken, errorMessage, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    let active = true;
    if (!getToken()) return undefined;
    authApi
      .me()
      .then(({ data }) => { if (active) setUser(data.user); })
      .catch(() => { if (active) clearToken(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    async login(identity, password) {
      try {
        const { data } = await authApi.login({ identity, password });
        setToken(data.token);
        setUser(data.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: errorMessage(error, 'Unable to sign in.') };
      }
    },
    async register(payload) {
      try {
        const { data } = await authApi.register(payload);
        setToken(data.token);
        setUser(data.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: errorMessage(error, 'Unable to create your account.') };
      }
    },
    async refresh() {
      try {
        const { data } = await authApi.me();
        setUser(data.user);
        return data.user;
      } catch {
        return null;
      }
    },
    async updateProfile(patch) {
      try {
        const { data } = await authApi.updateProfile(patch);
        setUser((current) => ({ ...current, ...data.profile }));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: errorMessage(error) };
      }
    },
    logout() {
      clearToken();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
