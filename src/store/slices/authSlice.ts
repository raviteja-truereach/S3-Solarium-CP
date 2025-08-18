/**
 * Authentication Slice
 * Manages user authentication state
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
  token?: string;
  expiresAt?: number;
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string; // Added for real API
    role?: string; // Added for real API
  };
}

const initialState: AuthState = {
  isLoggedIn: false,
  token: undefined,
  expiresAt: undefined,
  user: undefined,
};

/**
 * Auth slice managing authentication state
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Handle successful login
     */
    loginSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        expiresAt: number;
        user: AuthState['user'];
      }>
    ) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.user = action.payload.user;
    },
    /**
     * Handle logout
     */
    logout: (state) => {
      state.isLoggedIn = false;
      state.token = undefined;
      state.user = undefined;
    },
    /**
     * Clear auth state
     */
    clearAuth: () => initialState,
    /**
     * Handle successful bootstrap from keychain
     */
    bootstrapSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        expiresAt: number;
        user: AuthState['user'];
      }>
    ) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.user = action.payload.user;
    },
    /**
     * Handle token expiration
     */
    tokenExpired: (state) => {
      state.isLoggedIn = false;
      state.token = undefined;
      state.expiresAt = undefined;
      state.user = undefined;
    },
  },
});

export const {
  loginSuccess,
  logout,
  clearAuth,
  bootstrapSuccess,
  tokenExpired,
} = authSlice.actions;
export default authSlice.reducer;
