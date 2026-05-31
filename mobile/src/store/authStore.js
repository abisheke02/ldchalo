import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set, get) => ({
  token:    null,
  user:     null,
  isLoading: true,

  init: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const raw   = await AsyncStorage.getItem('user_data');
    const user  = raw ? JSON.parse(raw) : null;
    set({ token, user, isLoading: false });
  },

  loginWithToken: async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
