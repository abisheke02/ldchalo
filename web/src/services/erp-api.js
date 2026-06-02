/**
 * ERP API service — all routes for School ERP modules
 * Uses the unified packages/api backend (PORT 3000)
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const authHeader = () => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const get    = (path)        => request('GET',    path);
const post   = (path, body)  => request('POST',   path, body);
const put    = (path, body)  => request('PUT',    path, body);
const del    = (path)        => request('DELETE', path);
const patch  = (path, body)  => request('PATCH',  path, body);

// ─── Generic master helpers ───────────────────────────────────────────────────
export const master = {
  list:    (resource)      => get(`/api/masters/${resource}`),
  create:  (resource, data) => post(`/api/masters/${resource}`, data),
  update:  (resource, id, data) => put(`/api/masters/${resource}/${id}`, data),
  remove:  (resource, id)  => del(`/api/masters/${resource}/${id}`),
  save:    (resource, data) => data.id
    ? put(`/api/masters/${resource}/${data.id}`, data)
    : post(`/api/masters/${resource}`, data),
};

// ─── Schools / Auth ───────────────────────────────────────────────────────────
export const schoolApi = {
  getProfile:     ()      => get('/api/schools/profile'),
  updateProfile:  (data)  => put('/api/schools/profile', data),
  getBranches:    ()      => get('/api/schools/branches'),
  saveBranch:     (data)  => data.id ? put(`/api/schools/branches/${data.id}`, data) : post('/api/schools/branches', data),
  deleteBranch:   (id)    => del(`/api/schools/branches/${id}`),
};

export const authApi = {
  getUsers:       ()      => get('/api/admin/users'),
  saveUser:       (data)  => data.id ? put(`/api/admin/users/${data.id}`, data) : post('/api/admin/users', data),
  deleteUser:     (id)    => del(`/api/admin/users/${id}`),
  getRoles:       ()      => get('/api/admin/roles'),
  saveRole:       (data)  => data.id ? put(`/api/admin/roles/${data.id}`, data) : post('/api/admin/roles', data),
  deleteRole:     (id)    => del(`/api/admin/roles/${id}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  getStudents:       (classId, date) => get(`/api/school/attendance/students?class_id=${classId}&date=${date}`),
  markStudents:      (data)  => post('/api/school/attendance/mark', data),
  getStaff:          (date)  => get(`/api/school/attendance/staff?date=${date}`),
  markStaff:         (data)  => post('/api/school/attendance/staff/mark', data),
  getLeaveRequests:  (status) => get(`/api/school/attendance/leaves?status=${status || ''}`),
  approveLeave:      (id, action, remarks) => patch(`/api/school/attendance/leaves/${id}`, { action, remarks }),
  submitLeaveRequest:(data)  => post('/api/school/attendance/leaves', data),
  report:            (type, params) => get(`/api/school/attendance/reports/${type}?${new URLSearchParams(params)}`),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentApi = {
  list:            (params) => get(`/api/students?${new URLSearchParams(params || {})}`),
  get:             (id)     => get(`/api/students/${id}`),
  save:            (data)   => data.id ? put(`/api/students/${data.id}`, data) : post('/api/students', data),
  remove:          (id)     => del(`/api/students/${id}`),
  promote:         (data)   => post('/api/students/promote', data),
  changeSect:      (data)   => post('/api/students/section-change', data),
  idCard:          (ids)    => post('/api/students/id-cards', { ids }),
  report:          (type, params) => get(`/api/students/reports/${type}?${new URLSearchParams(params || {})}`),
  certificate:     (type, studentId, params) => post(`/api/students/certificates/${type}`, { studentId, ...params }),
  healthRecord:    (studentId) => get(`/api/students/${studentId}/health`),
  saveHealth:      (studentId, data) => post(`/api/students/${studentId}/health`, data),
  observation:     (studentId) => get(`/api/students/${studentId}/observations`),
  saveObservation: (studentId, data) => post(`/api/students/${studentId}/observations`, data),
  tcRequest:       (data)   => post('/api/students/tc-request', data),
};

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staffApi = {
  list:           (params) => get(`/api/school/staff?${new URLSearchParams(params || {})}`),
  get:            (id)     => get(`/api/school/staff/${id}`),
  save:           (data)   => data.id ? put(`/api/school/staff/${data.id}`, data) : post('/api/school/staff', data),
  remove:         (id)     => del(`/api/school/staff/${id}`),
  subjectAlloc:   ()       => get('/api/school/staff/subject-allocation'),
  saveSubjectAlloc:(data)  => post('/api/school/staff/subject-allocation', data),
  evaluation:     (staffId)=> get(`/api/school/staff/${staffId}/evaluations`),
  saveEvaluation: (data)   => post('/api/school/staff/evaluations', data),
  report:         (type, params) => get(`/api/school/staff/reports/${type}?${new URLSearchParams(params || {})}`),
};

// ─── Front Office ─────────────────────────────────────────────────────────────
export const frontOfficeApi = {
  getEnquiries:     (params) => get(`/api/school/admissions/enquiries?${new URLSearchParams(params || {})}`),
  saveEnquiry:      (data)   => data.id ? put(`/api/school/admissions/enquiries/${data.id}`, data) : post('/api/school/admissions/enquiries', data),
  deleteEnquiry:    (id)     => del(`/api/school/admissions/enquiries/${id}`),
  getApplications:  (params) => get(`/api/school/admissions/applications?${new URLSearchParams(params || {})}`),
  saveApplication:  (data)   => data.id ? put(`/api/school/admissions/applications/${data.id}`, data) : post('/api/school/admissions/applications', data),
  allocateSection:  (data)   => post('/api/school/admissions/allocate-section', data),
  gatePass:         (data)   => post('/api/school/admissions/gate-pass', data),
  importData:       (type, file) => {
    const fd = new FormData(); fd.append('file', file); fd.append('type', type);
    return fetch(`${BASE}/api/school/admissions/import/${type}`, { method: 'POST', headers: authHeader(), body: fd }).then(r => r.json());
  },
  report:           (type, params) => get(`/api/school/admissions/reports/${type}?${new URLSearchParams(params || {})}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  fees:             (params) => get(`/api/reports/fees?${new URLSearchParams(params || {})}`),
  attendance:       (params) => get(`/api/reports/attendance?${new URLSearchParams(params || {})}`),
  students:         (params) => get(`/api/reports/students?${new URLSearchParams(params || {})}`),
  staff:            (params) => get(`/api/reports/staff?${new URLSearchParams(params || {})}`),
  analytics:        (params) => get(`/api/analytics?${new URLSearchParams(params || {})}`),
};

export default { master, schoolApi, authApi, attendanceApi, studentApi, staffApi, frontOfficeApi, reportsApi };
