import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, demoLogin } from '../services/api';

export const useAuthStore = create((set, get) => ({
  token: null,
  user:  null,
  loading: false,
  error: null,

  init: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      set({ token });
      const user = await getProfile();
      set({ user });
    } catch {
      await AsyncStorage.removeItem('auth_token');
      set({ token: null, user: null });
    }
  },

  loginWithToken: async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ token: null, user: null });
  },
}));

export const useSchoolStore = create((set) => ({
  school: null,
  stats: null,

  setSchool: (school) => set({ school }),
  setStats:  (stats)  => set({ stats }),
}));

export const useAttendanceStore = create((set) => ({
  records: [],       // today's attendance records
  summary: {},       // { [studentId]: { present, absent, total } }
  loading: false,

  setRecords: (records) => set({ records }),
  setSummary: (summary) => set({ summary }),
  setLoading: (loading) => set({ loading }),

  markPresent: (studentId) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.studentId === studentId ? { ...r, status: 'present' } : r
      ),
    })),

  markAbsent: (studentId) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.studentId === studentId ? { ...r, status: 'absent' } : r
      ),
    })),
}));

export const useStudentStore = create((set) => ({
  students: [],
  selected: null,
  loading: false,
  page: 1,
  hasMore: true,

  setStudents: (students) => set({ students }),
  appendStudents: (more) => set((s) => ({ students: [...s.students, ...more] })),
  setSelected: (selected) => set({ selected }),
  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  setHasMore: (hasMore) => set({ hasMore }),
}));

export const useFeesStore = create((set) => ({
  dueFees: [],
  history: [],
  loading: false,

  setDueFees: (dueFees) => set({ dueFees }),
  setHistory: (history) => set({ history }),
  setLoading: (loading) => set({ loading }),
}));
