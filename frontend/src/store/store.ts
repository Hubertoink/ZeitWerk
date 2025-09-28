import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import employeeSlice from './slices/employeeSlice';
import organizationSlice from './slices/organizationSlice';
import shiftSlice from './slices/shiftSlice';
import shiftTypeSlice from './slices/shiftTypeSlice';
import calendarSlice from './slices/calendarSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    employees: employeeSlice,
    organizations: organizationSlice,
    shifts: shiftSlice,
    shiftTypes: shiftTypeSlice,
    calendar: calendarSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'auth/loginStart', 'auth/loginFailure'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['calendar.currentDate'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
