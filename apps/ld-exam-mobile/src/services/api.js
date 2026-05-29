import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_URL || 'http://10.0.2.2:3000'; // 10.0.2.2 = localhost on Android emulator

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — try refresh token before clearing session
let isRefreshing = false;
let refreshQueue = [];

const drainQueue = (err, token) => {
  refreshQueue.forEach((cb) => cb(err, token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        return Promise.reject(error.response?.data || error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((err, newToken) => {
            if (err) return reject(err);
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const data = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken }).then((r) => r.data);
        await AsyncStorage.setItem('auth_token', data.token);
        if (data.refreshToken) await AsyncStorage.setItem('refresh_token', data.refreshToken);
        if (data.user) await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        drainQueue(null, data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshErr) {
        drainQueue(refreshErr, null);
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (firebaseIdToken, fcmToken) =>
    api.post('/auth/login', { firebaseIdToken, fcmToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const studentAPI = {
  setupProfile: (data) => api.post('/students/profile', data),
  joinSchool: (joinCode) => api.post('/students/join-school', { joinCode }),
  getMyProfile: () => api.get('/students/me'),
  logActivity: (data) => api.post('/students/activity', data),
  // Practice
  getExercises: (type) => api.get('/ld/practice/exercises', { params: { type } }),
  getPracticeHistory: () => api.get('/ld/practice/history'),
  startSession: (sessionType) => api.post('/ld/practice/sessions/start', { session_type: sessionType }),
  recordAttempt: (sessionId, data) => api.post(`/ld/practice/sessions/${sessionId}/attempt`, data),
  completeSession: (sessionId, data) => api.post(`/ld/practice/sessions/${sessionId}/complete`, data),
  syncOfflineSession: (payload) => api.post('/ld/practice/sessions/sync', payload),
  transcribeAudio: (audioBase64, expected) => api.post('/ld/practice/stt', { audioBase64, expected }),
  getErrorSummary: () => api.get('/ld/practice/errors'),
  // Tests (Phase 4)
  getTestQuestions: (level) => api.get('/ld/tests/questions', { params: { level } }),
  submitTest: (data) => api.post('/ld/tests/submit', data),
  getTestHistory: () => api.get('/ld/tests/history'),
  getLevelStatus: () => api.get('/ld/tests/levels'),
  // Recommendations (Phase 4)
  getMyRecommendations: () => api.get('/ld/recommendations/me'),
  // Analytics (Phase 5)
  getMyAnalytics: () => api.get('/analytics/student/me'),
};

export const schoolAPI = {
  getMyClasses: () => api.get('/schools/classes'),
  getClassStudents: (classId) => api.get(`/schools/classes/${classId}/students`),
  getClassRecommendations: (classId) => api.get(`/ld/recommendations/class/${classId}`),
};

export default api;
