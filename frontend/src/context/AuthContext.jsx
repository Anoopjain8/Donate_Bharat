import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setAuthToken, refreshAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((u) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Restore the session via the httpOnly refresh cookie (no token in localStorage).
      try {
        const res = await authAPI.me();
        if (mounted) persistUser(res.data.user);
      } catch {
        try {
          await refreshAccessToken();
          const res = await authAPI.me();
          if (mounted) persistUser(res.data.user);
        } catch {
          if (mounted) persistUser(null);
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [persistUser]);

  const login = useCallback(
    async (email, password) => {
      const res = await authAPI.login({ email, password });
      setAuthToken(res.data.accessToken);
      persistUser(res.data.user);
      return res.data.user;
    },
    [persistUser]
  );

  const register = useCallback(
    async (data) => {
      const res = await authAPI.register(data);
      setAuthToken(res.data.accessToken);
      persistUser(res.data.user);
      return res.data.user;
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      /* best effort */
    }
    setAuthToken(null);
    persistUser(null);
  }, [persistUser]);

  const updateUser = useCallback(
    (patch) => persistUser({ ...user, ...patch }),
    [persistUser, user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
