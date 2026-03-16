import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { sendFormData, sendFormPut } from '../api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // On mount: validate existing token by calling GET /api/v1/auth/me
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/v1/auth/me');
        setUser(response.data.user);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await sendFormData('/api/v1/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const meResponse = await api.get('/api/v1/auth/me');
    setUser(meResponse.data.user);
    return meResponse.data.user;
  }, []);

  const register = useCallback(async (name, email, password, orgName) => {
    const response = await sendFormData('/api/v1/auth/register', {
      name, email, password, org_name: orgName,
    });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const meResponse = await api.get('/api/v1/auth/me');
    setUser(meResponse.data.user);
    return meResponse.data.user;
  }, []);

  const updateProfile = useCallback(async (data) => {
    await sendFormPut('/api/v1/auth/update-profile', data);
    // Re-fetch canonical user data from /me
    const meResponse = await api.get('/api/v1/auth/me');
    setUser(meResponse.data.user);
    return meResponse.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/');
  }, [navigate]);

  const value = { user, loading, isAuthenticated, login, register, updateProfile, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
