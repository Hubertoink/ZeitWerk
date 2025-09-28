import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WeekViewData } from '../../types';

interface CalendarState {
  currentView: 'week' | 'month';
  currentDate: string; // ISO string instead of Date
  weekData: WeekViewData | null;
  selectedDate: string | null; // ISO string instead of Date
  isLoading: boolean;
  error: string | null;
}

const initialState: CalendarState = {
  currentView: 'week',
  currentDate: new Date().toISOString(),
  weekData: null,
  selectedDate: null,
  isLoading: false,
  error: null,
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<'week' | 'month'>) => {
      state.currentView = action.payload;
    },
    setCurrentDate: (state, action: PayloadAction<string>) => {
      state.currentDate = action.payload;
    },
    setWeekData: (state, action: PayloadAction<WeekViewData>) => {
      state.weekData = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    navigateWeek: (state, action: PayloadAction<'prev' | 'next'>) => {
      const direction = action.payload === 'next' ? 1 : -1;
      const currentDate = new Date(state.currentDate);
      currentDate.setDate(currentDate.getDate() + (7 * direction));
      state.currentDate = currentDate.toISOString();
    },
    navigateMonth: (state, action: PayloadAction<'prev' | 'next'>) => {
      const direction = action.payload === 'next' ? 1 : -1;
      const currentDate = new Date(state.currentDate);
      currentDate.setMonth(currentDate.getMonth() + direction);
      state.currentDate = currentDate.toISOString();
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentView,
  setCurrentDate,
  setWeekData,
  setSelectedDate,
  navigateWeek,
  navigateMonth,
  setLoading,
  setError,
} = calendarSlice.actions;

export default calendarSlice.reducer;
