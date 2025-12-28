// Supabase has been replaced with REST API
// This file is kept for compatibility with legacy code only
// DO NOT USE - Use the API client from @/api instead

export const supabase = {
  from: () => {
    throw new Error('Supabase has been removed. Use API client from @/api instead');
  },
  auth: {
    getUser: () => {
      throw new Error('Use useAuth() hook instead');
    },
    signOut: () => {
      throw new Error('Use useAuth() hook instead');
    },
  },
};
