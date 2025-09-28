import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      localStorage.setItem('authToken', action.payload.token);
    },
    loginFailure: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      localStorage.removeItem('authToken');
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      localStorage.removeItem('authToken');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
