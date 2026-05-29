import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_URL || 'http://10.0.2.2:3000'; // 10.0.2.2 = localhost on Android emulator

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const loginWithFirebase = (firebaseIdToken, fcmToken) =>
  api.post('/api/auth/login', { firebaseIdToken, fcmToken }).then((r) => r.data);

export const demoLogin = (role = 'teacher') =>
  api.post(`/api/auth/demo?role=${role}`).then((r) => r.data);

// ─── Students ─────────────────────────────────────────────────────────────────

export const getStudents = (params = {}) =>
  api.get('/api/students', { params }).then((r) => r.data);

export const getStudent = (id) =>
  api.get(`/api/students/${id}`).then((r) => r.data);

// ─── Attendance ───────────────────────────────────────────────────────────────

export const getTodayAttendance = (classId) => {
  const date = new Date().toISOString().slice(0, 10);
  return api.get(`/api/school/attendance/class/${classId}`, { params: { date } }).then((r) => r.data);
};

export const markAttendance = ({ class_id, date, attendance }) =>
  api.post('/api/school/attendance/mark', { class_id, date, attendance }).then((r) => r.data);

export const getAttendanceSummary = (studentId, month, year) =>
  api.get(`/api/school/attendance/student/${studentId}/report`, { params: { month, year } }).then((r) => r.data);

// ─── Fees ─────────────────────────────────────────────────────────────────────

export const getFeesDue = (params = {}) =>
  api.get('/api/school/fees/outstanding', { params }).then((r) => r.data);

export const collectFee = (studentId, amount, mode) =>
  api.post('/api/school/fees/collect/counter', { student_id: studentId, amount, payment_mode: mode }).then((r) => r.data);

// ─── School / Profile ─────────────────────────────────────────────────────────

export const getProfile = () =>
  api.get('/api/auth/me').then((r) => r.data);

export const getSchoolInfo = () =>
  api.get('/api/schools/info').then((r) => r.data);

export const getDashboardStats = () =>
  api.get('/api/analytics/dashboard').then((r) => r.data);

export default api;
