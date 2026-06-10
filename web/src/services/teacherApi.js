import api from './api';

// ─── Demo Data: 12 Indian students ─────────────────────────────────
const DEMO_STUDENTS = [
  { id: 's1', name: 'Ravi K.', initials: 'RK', ldType: 'dyslexia', level: 2, riskScore: 65, streak: 4, lastPractice: 0, mastery: 42, class: '4A' },
  { id: 's2', name: 'Priya M.', initials: 'PM', ldType: 'dyscalculia', level: 3, riskScore: 45, streak: 7, lastPractice: 1, mastery: 58, class: '4A' },
  { id: 's3', name: 'Amit S.', initials: 'AS', ldType: 'not_detected', level: 4, riskScore: 12, streak: 12, lastPractice: 0, mastery: 78, class: '4A' },
  { id: 's4', name: 'Meera R.', initials: 'MR', ldType: 'mixed', level: 1, riskScore: 82, streak: 0, lastPractice: 5, mastery: 18, class: '4A' },
  { id: 's5', name: 'Rahul P.', initials: 'RP', ldType: 'dysgraphia', level: 2, riskScore: 55, streak: 2, lastPractice: 2, mastery: 35, class: '4A' },
  { id: 's6', name: 'Anita D.', initials: 'AD', ldType: 'dyslexia', level: 3, riskScore: 38, streak: 9, lastPractice: 0, mastery: 62, class: '4A' },
  { id: 's7', name: 'Vikram J.', initials: 'VJ', ldType: 'dyscalculia', level: 1, riskScore: 78, streak: 0, lastPractice: 7, mastery: 15, class: '4A' },
  { id: 's8', name: 'Sneha T.', initials: 'ST', ldType: 'not_detected', level: 5, riskScore: 8, streak: 21, lastPractice: 0, mastery: 92, class: '4A' },
  { id: 's9', name: 'Arjun B.', initials: 'AB', ldType: 'dyslexia', level: 2, riskScore: 61, streak: 1, lastPractice: 3, mastery: 38, class: '4A' },
  { id: 's10', name: 'Kavya N.', initials: 'KN', ldType: 'dysgraphia', level: 3, riskScore: 42, streak: 5, lastPractice: 1, mastery: 55, class: '4A' },
  { id: 's11', name: 'Deepak G.', initials: 'DG', ldType: 'mixed', level: 1, riskScore: 88, streak: 0, lastPractice: 10, mastery: 8, class: '4A' },
  { id: 's12', name: 'Lakshmi V.', initials: 'LV', ldType: 'dyscalculia', level: 4, riskScore: 28, streak: 6, lastPractice: 0, mastery: 71, class: '4A' },
];

const DEMO_STUDENT_DETAIL = (id) => {
  const s = DEMO_STUDENTS.find(x => x.id === id) || DEMO_STUDENTS[0];
  return {
    ...s,
    email: `${s.name.split(' ')[0].toLowerCase()}@school.in`,
    screeningDate: '2026-05-15',
    screeningLevel: s.level,
    categoryMastery: {
      letter_recognition: s.ldType === 'dyslexia' ? 35 : 72,
      phonics: s.ldType === 'dyslexia' ? 28 : 65,
      rhyme_detection: s.ldType === 'dyslexia' ? 40 : 80,
      number_sense: s.ldType === 'dyscalculia' ? 30 : 70,
      arithmetic: s.ldType === 'dyscalculia' ? 25 : 75,
      counting: s.ldType === 'dyscalculia' ? 38 : 82,
      sequencing: s.ldType === 'dysgraphia' ? 32 : 68,
      writing: s.ldType === 'dysgraphia' ? 28 : 72,
    },
    progressHistory: [
      { date: '2026-05-01', mastery: Math.max(5, s.mastery - 30) },
      { date: '2026-05-08', mastery: Math.max(10, s.mastery - 22) },
      { date: '2026-05-15', mastery: Math.max(15, s.mastery - 15) },
      { date: '2026-05-22', mastery: Math.max(20, s.mastery - 8) },
      { date: '2026-05-29', mastery: s.mastery - 3 },
      { date: '2026-06-05', mastery: s.mastery },
    ],
    practiceDays: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, s.lastPractice === 0 ? 1 : 0, s.lastPractice === 0 ? 1 : 0],
    testResults: [
      { date: '2026-05-20', level: s.level - 1 || 1, score: 85, passed: true },
      { date: '2026-06-01', level: s.level, score: 65, passed: false },
    ],
    notes: '',
    totalSessions: Math.floor(Math.random() * 30) + 10,
    totalPracticeMinutes: Math.floor(Math.random() * 500) + 100,
  };
};

const teacherApi = {
  /** Get class overview with all students */
  getClassOverview: async () => {
    try {
      const data = await api.get('/teacher/class').then(r => r.data);
      if (data?.students?.length) return data;
      throw new Error('empty');
    } catch {
      const students = DEMO_STUDENTS;
      const distribution = {
        dyslexia: students.filter(s => s.ldType === 'dyslexia').length,
        dyscalculia: students.filter(s => s.ldType === 'dyscalculia').length,
        dysgraphia: students.filter(s => s.ldType === 'dysgraphia').length,
        mixed: students.filter(s => s.ldType === 'mixed').length,
        not_detected: students.filter(s => s.ldType === 'not_detected').length,
      };
      return {
        className: 'Class 4A',
        students,
        totalStudents: students.length,
        screenedCount: students.length,
        practicingToday: students.filter(s => s.lastPractice === 0).length,
        atRiskCount: students.filter(s => s.lastPractice >= 5).length,
        distribution,
      };
    }
  },

  /** Get individual student detail */
  getStudentDetail: async (studentId) => {
    try {
      return await api.get(`/teacher/student/${studentId}`).then(r => r.data);
    } catch {
      return DEMO_STUDENT_DETAIL(studentId);
    }
  },

  /** Assign exercises to a student */
  assignExercise: async (studentId, exercises) => {
    try {
      return await api.post('/teacher/assign', { studentId, exercises }).then(r => r.data);
    } catch {
      return { success: true, message: 'Exercises assigned (demo mode)' };
    }
  },

  /** Add a teacher note */
  addNote: async (studentId, note) => {
    try {
      return await api.post('/teacher/note', { studentId, note }).then(r => r.data);
    } catch {
      return { success: true, message: 'Note saved (demo mode)' };
    }
  },

  /** Send practice reminder */
  sendReminder: async (studentId) => {
    try {
      return await api.post('/teacher/reminder', { studentId }).then(r => r.data);
    } catch {
      return { success: true, message: 'Reminder sent (demo mode)' };
    }
  },
};

export default teacherApi;
