import { useAuthContext } from './AuthContext';

/**
 * Enhanced hook to consume unified auth state from the AuthProvider.
 * This prevents auth race conditions across the app.
 */
export function useAuth() {
  return useAuthContext();
}