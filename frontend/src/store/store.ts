import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import employeeSlice from './slices/employeeSlice';
import organizationSlice from './slices/organizationSlice';
import shiftSlice from './slices/shiftSlice';
import shiftTypeSlice from './slices/shiftTypeSlice';
import taskSlice from './slices/taskSlice';
import taskTypeSlice from './slices/taskTypeSlice';
import calendarSlice from './slices/calendarSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    employees: employeeSlice,
    organizations: organizationSlice,
    shifts: shiftSlice,
    shiftTypes: shiftTypeSlice,
    tasks: taskSlice,
    taskTypes: taskTypeSlice,
    calendar: calendarSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'auth/loginStart', 'auth/loginFailure'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
  ignoredPaths: ['calendar.weekDate', 'calendar.monthDate'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
