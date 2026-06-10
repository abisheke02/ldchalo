import api from './api';

// ─── Demo Data ──────────────────────────────────────────────────────

const DEMO_STUDENT = {
  name: 'Demo Student',
  level: 3,
  streak: 5,
  totalPracticeMinutes: 420,
  mastery: 62,
  ldType: 'dyslexia',
  riskScore: 45,
  lastScreeningDate: '2026-05-15',
  weeklyGoal: { target: 5, completed: 3 },
  categoryMastery: [
    { category: 'letter_recognition', mastery: 85, trend: 'up' },
    { category: 'phonics', mastery: 68, trend: 'up' },
    { category: 'rhyme_detection', mastery: 72, trend: 'stable' },
    { category: 'phoneme_blending', mastery: 55, trend: 'up' },
    { category: 'reading', mastery: 42, trend: 'up' },
    { category: 'number_sense', mastery: 78, trend: 'stable' },
    { category: 'arithmetic', mastery: 65, trend: 'down' },
    { category: 'sequencing', mastery: 60, trend: 'up' },
    { category: 'writing', mastery: 48, trend: 'up' },
  ],
  progressHistory: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    mastery: Math.min(100, 35 + i * 1.2 + Math.random() * 5),
  })),
  recentSessions: [
    { id: '1', date: '2026-06-10', score: 85, duration: 14, exercises: 18 },
    { id: '2', date: '2026-06-09', score: 78, duration: 12, exercises: 20 },
    { id: '3', date: '2026-06-08', score: 82, duration: 15, exercises: 20 },
    { id: '4', date: '2026-06-06', score: 72, duration: 11, exercises: 16 },
    { id: '5', date: '2026-06-05', score: 68, duration: 13, exercises: 20 },
  ],
  weekDays: [true, true, true, false, false, null, null], // Mon-Sun, null = future
  testReady: true,
  quote: "Every expert was once a beginner. Keep going! 🌟",
};

const DEMO_PARENT = {
  child: { name: 'Ravi Kumar', class: 'Class 4-B', school: 'Delhi Public School', age: 9 },
  ldType: 'dyslexia',
  currentLevel: 3,
  riskScore: 45,
  improvement: 38, // % improvement since first screening
  firstScreening: { date: '2026-02-10', level: 1, riskScore: 78 },
  latestScreening: { date: '2026-05-15', level: 3, riskScore: 45 },
  practiceStats: { daysThisWeek: 4, avgSessionMinutes: 13, streak: 5, totalSessions: 42 },
  strengths: ['number_sense', 'counting', 'sequencing'],
  weaknesses: ['phoneme_blending', 'reading', 'writing'],
  levelProgression: [
    { level: 1, status: 'passed', date: '2026-03-01' },
    { level: 2, status: 'passed', date: '2026-04-12' },
    { level: 3, status: 'current', date: null },
    { level: 4, status: 'locked', date: null },
    { level: 5, status: 'locked', date: null },
  ],
  teacherNotes: null,
  actionItems: [
    'Encourage 15 minutes of daily practice',
    'Focus on reading exercises — phoneme blending needs attention',
    'Schedule re-screening in August 2026',
    'Celebrate Level 2 achievement!',
  ],
};

const DEMO_ADMIN = {
  totalStudents: 156,
  screenedCount: 128,
  averageRiskScore: 42,
  activePractitioners: 67,
  ldDistribution: [
    { type: 'Dyslexia', count: 38, percentage: 30, color: '#7C3AED' },
    { type: 'Dyscalculia', count: 28, percentage: 22, color: '#3B82F6' },
    { type: 'Dysgraphia', count: 18, percentage: 14, color: '#EC4899' },
    { type: 'Mixed', count: 12, percentage: 9, color: '#F59E0B' },
    { type: 'Not Detected', count: 32, percentage: 25, color: '#10B981' },
  ],
  levelDistribution: [
    { level: 1, count: 22 },
    { level: 2, count: 35 },
    { level: 3, count: 38 },
    { level: 4, count: 24 },
    { level: 5, count: 9 },
  ],
  atRiskStudents: [
    { id: '1', name: 'Deepak G.', ldType: 'Mixed', riskScore: 88, lastPractice: '10 days ago', level: 1 },
    { id: '2', name: 'Meera R.', ldType: 'Mixed', riskScore: 82, lastPractice: '5 days ago', level: 1 },
    { id: '3', name: 'Vikram J.', ldType: 'Dyscalculia', riskScore: 78, lastPractice: '7 days ago', level: 1 },
    { id: '4', name: 'Ravi K.', ldType: 'Dyslexia', riskScore: 65, lastPractice: '3 days ago', level: 2 },
    { id: '5', name: 'Arjun B.', ldType: 'Dyslexia', riskScore: 61, lastPractice: '3 days ago', level: 2 },
  ],
  progressTrend: Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2025, 7 + i, 1).toLocaleDateString('en-IN', { month: 'short' }),
    avgMastery: 25 + i * 4 + Math.random() * 3,
    avgRisk: 70 - i * 3 - Math.random() * 2,
  })),
};

// ─── API with demo fallback ─────────────────────────────────────────
const analyticsApi = {
  getStudentProgress: async () => {
    try {
      return await api.get('/analytics/student').then(r => r.data);
    } catch {
      return DEMO_STUDENT;
    }
  },

  getParentView: async (childId) => {
    try {
      return await api.get(`/analytics/parent${childId ? `?childId=${childId}` : ''}`).then(r => r.data);
    } catch {
      return DEMO_PARENT;
    }
  },

  getAdminOverview: async () => {
    try {
      return await api.get('/analytics/admin').then(r => r.data);
    } catch {
      return DEMO_ADMIN;
    }
  },
};

export default analyticsApi;
