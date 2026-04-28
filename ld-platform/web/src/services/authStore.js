import { create } from 'zustand';
import { authAPI } from './api';
import { identifyUser, resetAnalytics } from './analytics';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('auth_token') || null,
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),

  login: async (token, type = 'supabase') => {
    const result = await authAPI.login(token, type);
    localStorage.setItem('auth_token', result.token);
    if (result.refreshToken) localStorage.setItem('refresh_token', result.refreshToken);
    localStorage.setItem('user_data', JSON.stringify(result.user));
    set({ token: result.token, user: result.user });
    identifyUser(result.user);
    // Return full result so callers can read isNewUser
    return result;
  },

  demoLogin: async (role = 'teacher') => {
    const result = await authAPI.demo(role);
    localStorage.setItem('auth_token', result.token);
    localStorage.removeItem('refresh_token'); // demo sessions don't use refresh
    localStorage.setItem('user_data', JSON.stringify(result.user));
    set({ token: result.token, user: result.user });
    identifyUser(result.user);
    return result.user;
  },

  setDemoAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.removeItem('refresh_token');
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
    identifyUser(user);
  },

  logout: async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    resetAnalytics();
    set({ token: null, user: null });
    window.location.href = '/login';
  },
}));

export default useAuthStore;
