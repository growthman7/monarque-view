import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';
import { tokenStore } from '../services/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    authService.me().then(setUser).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => { const u = await authService.login(email, password); setUser(u); return u; }, []);
  const demoLogin = useCallback(async (email) => { const u = await authService.demoLogin(email); setUser(u); return u; }, []);
  const register = useCallback(async (data) => { const u = await authService.register(data); setUser(u); return u; }, []);
  const logout = useCallback(async () => { await authService.logout(); setUser(null); }, []);
  const updateProfile = useCallback(async (d) => { const u = await authService.updateProfile(d); setUser(u); return u; }, []);

  const value = useMemo(() => ({ user, ready, login, demoLogin, register, logout, updateProfile }), [user, ready, login, demoLogin, register, logout, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
