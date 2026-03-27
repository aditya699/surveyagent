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
      } catch (err) {
        // If 403 email_not_verified, keep tokens but don't set user fully
        if (err.response?.status === 403 && err.response?.data?.detail === 'email_not_verified') {
          setUser(null);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await sendFormData('/api/v1/auth/login', { email, password });
      const { access_token, refresh_token, email_verified } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      if (!email_verified) {
        // Redirect to verify page — don't fetch /me (would get 403)
        return { email_verified: false, email };
      }

      const meResponse = await api.get('/api/v1/auth/me');
      setUser(meResponse.data.user);
      return meResponse.data.user;
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail === 'email_not_verified') {
        // Backend sent fresh OTP, redirect to verify
        return { email_verified: false, email };
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (name, email, password, orgName) => {
    const response = await sendFormData('/api/v1/auth/register', {
      name, email, password, org_name: orgName,
    });
    const { access_token, refresh_token, email_verified } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    if (!email_verified) {
      return { email_verified: false, email };
    }

    const meResponse = await api.get('/api/v1/auth/me');
    setUser(meResponse.data.user);
    return meResponse.data.user;
  }, []);

  const verifyOtp = useCallback(async (email, code) => {
    const response = await api.post('/api/v1/auth/verify-otp', { email, code });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const meResponse = await api.get('/api/v1/auth/me');
    setUser(meResponse.data.user);
    return meResponse.data.user;
  }, []);

  const resendOtp = useCallback(async (email) => {
    await api.post('/api/v1/auth/resend-otp', { email });
  }, []);

  const registerViaInvite = useCallback(async (inviteToken, name, password) => {
    const response = await api.post('/api/v1/auth/register-invite', {
      invite_token: inviteToken,
      name,
      password,
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

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    verifyOtp,
    resendOtp,
    registerViaInvite,
    updateProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
