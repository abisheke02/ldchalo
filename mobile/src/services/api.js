import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r.data,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;

// Auth
export const authAPI = {
  login:     (email, password) => api.post('/auth/login', { email, password }),
  demo:      (role)            => api.post('/auth/demo', { role }),
  me:        ()                => api.get('/auth/me'),
};

// School ERP
export const schoolAPI = {
  dashboard:            ()                  => api.get('/analytics/dashboard'),
  classes:              ()                  => api.get('/schools/classes'),
  classStudents:        (classId)           => api.get(`/schools/classes/${classId}/students`),
  getAttendance:        (classId, date)     => api.get(`/school/attendance/class/${classId}`, { params: { date } }),
  markAttendance:       (data)              => api.post('/school/attendance/mark', data),
  getOutstandingFees:   ()                  => api.get('/school/fees/outstanding'),
  collectFee:           (studentId, amount, mode) => api.post('/school/fees/collect/counter', { student_id: studentId, amount, payment_mode: mode }),
  getStaff:             ()                  => api.get('/school/staff'),
  getCirculars:         ()                  => api.get('/school/communications/circulars'),
  getNotifications:     ()                  => api.get('/school/communications/notifications'),
};

// LD Platform
export const ldAPI = {
  screeningStatus:   ()               => api.get('/ld/screening/status'),
  screeningQs:       ()               => api.get('/ld/screening/questions'),
  submitScreening:   (answers)        => api.post('/ld/screening/submit', { answers }),
  getExercises:      (type)           => api.get('/ld/practice/exercises', { params: type ? { type } : {} }),
  startSession:      (type)           => api.post('/ld/practice/sessions/start', { session_type: type }),
  recordAttempt:     (sid, data)      => api.post(`/ld/practice/sessions/${sid}/attempt`, data),
  completeSession:   (sid, mins)      => api.post(`/ld/practice/sessions/${sid}/complete`, { duration_minutes: mins }),
  getTestLevels:     ()               => api.get('/ld/tests/levels'),
  getTestQs:         (level)          => api.get('/ld/tests/questions', { params: { level } }),
  submitTest:        (data)           => api.post('/ld/tests/submit', data),
  getRecommendations:()               => api.get('/ld/recommendations/me'),
  getConversations:  ()               => api.get('/ld/messages'),
  getThread:         (partnerId)      => api.get(`/ld/messages/${partnerId}`),
  sendMessage:       (receiverId, body) => api.post('/ld/messages', { receiverId, body }),
  getMyAnalytics:    ()               => api.get('/analytics/student/me'),
};
