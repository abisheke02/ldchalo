// ─── LD Types ─────────────────────────────────────────────────────────────────

const LD_TYPES = Object.freeze({
  DYSLEXIA:    'dyslexia',
  DYSGRAPHIA:  'dysgraphia',
  DYSCALCULIA: 'dyscalculia',
  MIXED:       'mixed',
  NONE:        'not_detected',
});

const LD_LABELS = Object.freeze({
  dyslexia:    'Dyslexia',
  dysgraphia:  'Dysgraphia',
  dyscalculia: 'Dyscalculia',
  mixed:       'Mixed LD',
  not_detected:'Not Detected',
});

const LD_COLORS = Object.freeze({
  dyslexia:    { bg: '#DBEAFE', text: '#1D4ED8' },
  dysgraphia:  { bg: '#FEF3C7', text: '#92400E' },
  dyscalculia: { bg: '#FCE7F3', text: '#9D174D' },
  mixed:       { bg: '#EDE9FE', text: '#5B21B6' },
  not_detected:{ bg: '#F3F4F6', text: '#6B7280' },
});

// ─── User Roles ───────────────────────────────────────────────────────────────

const ROLES = Object.freeze({
  STUDENT:   'student',
  TEACHER:   'teacher',
  PRINCIPAL: 'principal',
  PARENT:    'parent',
  ADMIN:     'admin',
  STAFF:     'staff',
});

// ─── Attendance Statuses ──────────────────────────────────────────────────────

const ATTENDANCE = Object.freeze({
  PRESENT:  'present',
  ABSENT:   'absent',
  LATE:     'late',
  HOLIDAY:  'holiday',
  UNMARKED: 'unmarked',
});

const ATTENDANCE_COLORS = Object.freeze({
  present:  '#10B981',
  absent:   '#EF4444',
  late:     '#F59E0B',
  holiday:  '#8B5CF6',
  unmarked: '#9CA3AF',
});

// ─── Fee Statuses ─────────────────────────────────────────────────────────────

const FEE_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID:    'paid',
  OVERDUE: 'overdue',
  WAIVED:  'waived',
});

const PAYMENT_MODES = Object.freeze(['cash', 'upi', 'card', 'online', 'cheque', 'dd']);

// ─── Exam / Grade ─────────────────────────────────────────────────────────────

const GRADE_LABELS = Object.freeze({
  '1': 'Class 1', '2': 'Class 2',  '3': 'Class 3',  '4': 'Class 4',
  '5': 'Class 5', '6': 'Class 6',  '7': 'Class 7',  '8': 'Class 8',
  '9': 'Class 9', '10': 'Class 10','11': 'Class 11', '12': 'Class 12',
});

// ─── API Error Codes ──────────────────────────────────────────────────────────

const ERROR_CODES = Object.freeze({
  UNAUTHORIZED:      'UNAUTHORIZED',
  FORBIDDEN:         'FORBIDDEN',
  NOT_FOUND:         'NOT_FOUND',
  VALIDATION_ERROR:  'VALIDATION_ERROR',
  DUPLICATE:         'DUPLICATE',
  RATE_LIMITED:      'RATE_LIMITED',
  SERVER_ERROR:      'SERVER_ERROR',
  PAYMENT_FAILED:    'PAYMENT_FAILED',
});

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date, opts = {}) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts });

const formatPhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).map((n) => n[0]?.toUpperCase() ?? '').slice(0, 2).join('');

const riskLevel = (score) => {
  if (score >= 70) return { label: 'High',   color: '#EF4444' };
  if (score >= 40) return { label: 'Medium', color: '#F59E0B' };
  return               { label: 'Low',    color: '#10B981' };
};

const attendancePercent = (present, total) =>
  total === 0 ? 0 : Math.round((present / total) * 100);

// ─── Pagination ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20;

const paginate = (array, page = 1, size = DEFAULT_PAGE_SIZE) => {
  const start = (page - 1) * size;
  return {
    data:    array.slice(start, start + size),
    page,
    size,
    total:   array.length,
    hasMore: start + size < array.length,
  };
};

module.exports = {
  LD_TYPES, LD_LABELS, LD_COLORS,
  ROLES,
  ATTENDANCE, ATTENDANCE_COLORS,
  FEE_STATUS, PAYMENT_MODES,
  GRADE_LABELS,
  ERROR_CODES,
  formatINR, formatDate, formatPhone, getInitials,
  riskLevel, attendancePercent,
  DEFAULT_PAGE_SIZE, paginate,
};
