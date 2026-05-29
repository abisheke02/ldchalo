// Supabase removed — auth is now handled by the local PostgreSQL backend.
export const supabase = {
  auth: {
    signInWithOtp: async () => ({ error: new Error('Supabase removed. Use email+password login.') }),
    verifyOtp:     async () => ({ error: new Error('Supabase removed. Use email+password login.') }),
    getUser:       async () => ({ data: { user: null }, error: null }),
    signOut:       async () => ({}),
  },
};
