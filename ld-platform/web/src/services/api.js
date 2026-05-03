import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 — one retry per request
let isRefreshing = false;
let refreshQueue = [];

const drainQueue = (error, token) => {
  refreshQueue.forEach((cb) => cb(error, token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
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
        const data = await axios.post('/api/auth/refresh', { refreshToken }).then((r) => r.data);
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        if (data.user) localStorage.setItem('user_data', JSON.stringify(data.user));
        drainQueue(null, data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshErr) {
        drainQueue(refreshErr, null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  login: (token, type = 'firebase') =>
    api.post('/auth/login', type === 'supabase' ? { supabaseToken: token } : { firebaseIdToken: token }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  demo: (role = 'teacher') => api.post(`/auth/demo?role=${role}`),
};

export const schoolAPI = {
  // Onboarding
  registerSchool: (data) => api.post('/schools/register', data),
  joinByCode: (code) => api.post('/schools/join-by-code', { code }),
  getInfo: () => api.get('/schools/info'),
  inviteTeacher: (data) => api.post('/schools/invite-teacher', data),
  acceptInvite: (token) => api.post(`/schools/accept-invite/${token}`),
  linkParent: (data) => api.post('/schools/link-parent', data),
  // Classes
  createClass: (data) => api.post('/schools/classes', data),
  getMyClasses: () => api.get('/schools/classes'),
  getClassStudents: (classId) => api.get(`/schools/classes/${classId}/students`),
  getClass: (classId) => api.get(`/schools/classes/${classId}`),
  getSubscription: () => api.get('/schools/subscription'),
};

export const studentAPI = {
  getStudent: (id) => api.get(`/students/${id}`),
  getTestHistory: (id) => api.get(`/tests/student/${id}`),
  getErrorSummary: () => api.get('/practice/errors'),
};

export const recommendationAPI = {
  getClassRecs: (classId) => api.get(`/recommendations/class/${classId}`),
  generate: (userId, audience) => api.post('/recommendations/generate', { userId, audience }),
};

export const analyticsAPI = {
  classHeatmap: (classId) => api.get(`/analytics/class/${classId}/heatmap`),
  classAtRisk: (classId) => api.get(`/analytics/class/${classId}/at-risk`),
  student: (id) => api.get(`/analytics/student/${id}`),
  adminOverview: () => api.get('/analytics/admin/overview'),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages'),
  getThread: (partnerId) => api.get(`/messages/${partnerId}`),
  send: (receiverId, body) => api.post('/messages', { receiverId, body }),
};

export const paymentsAPI = {
  getPlans: () => api.get('/payments/plans'),
  createOrder: (data) => api.post('/payments/create-order', data),
  verify: (data) => api.post('/payments/verify', data),
  getSubscription: (schoolId) => api.get(`/payments/subscription/${schoolId}`),
};

export const complianceAPI = {
  recordConsent: (consentType = 'data_processing') =>
    api.post('/compliance/consent', { consentType, granted: true }),
  getConsentStatus: () => api.get('/compliance/consent-status'),
  requestDataExport: () => api.post('/compliance/data-export'),
  deleteAccount: () => api.delete('/compliance/delete-account'),
};

export const adminAPI = {
  getSchools: () => api.get('/admin/schools'),
  updateSchool: (id, data) => api.put(`/admin/schools/${id}`, data),
  getOverview: () => api.get('/analytics/admin/overview'),
  triggerCron: (job) => api.post(`/admin/cron/${job}`),
  getExercises: (params) => api.get('/admin/exercises', { params }),
  createExercise: (data) => api.post('/admin/exercises', data),
  updateExercise: (id, data) => api.patch(`/admin/exercises/${id}`, data),
  deleteExercise: (id) => api.delete(`/admin/exercises/${id}`),
  getQuestions: (params) => api.get('/admin/questions', { params }),
  createQuestion: (data) => api.post('/admin/questions', data),
  updateQuestion: (id, data) => api.patch(`/admin/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`),
};

export const reportsAPI = {
  downloadStudentPDF: (studentId) => `/api/reports/student/${studentId}`,
};

export default api;
