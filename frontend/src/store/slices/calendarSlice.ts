import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WeekViewData } from '../../types';

interface CalendarState {
  currentView: 'week' | 'month';
  weekDate: string; // ISO string representing the focused week start
  monthDate: string; // ISO string representing the focused month
  weekData: WeekViewData | null;
  selectedDate: string | null; // ISO string instead of Date
  isLoading: boolean;
  error: string | null;
}

const initialDateIso = new Date().toISOString();

const initialState: CalendarState = {
  currentView: 'week',
  weekDate: initialDateIso,
  monthDate: initialDateIso,
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
    setWeekDate: (state, action: PayloadAction<string>) => {
      state.weekDate = action.payload;
      state.monthDate = action.payload;
      state.selectedDate = action.payload;
    },
    setMonthDate: (state, action: PayloadAction<string>) => {
      state.monthDate = action.payload;
    },
    setWeekData: (state, action: PayloadAction<WeekViewData>) => {
      state.weekData = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    navigateWeek: (state, action: PayloadAction<'prev' | 'next'>) => {
      const direction = action.payload === 'next' ? 1 : -1;
      const currentDate = new Date(state.weekDate);
      currentDate.setDate(currentDate.getDate() + (7 * direction));
      const nextWeekIso = currentDate.toISOString();
      state.weekDate = nextWeekIso;
      state.monthDate = nextWeekIso;
      state.selectedDate = nextWeekIso;
    },
    navigateMonth: (state, action: PayloadAction<'prev' | 'next'>) => {
      const direction = action.payload === 'next' ? 1 : -1;
      const currentDate = new Date(state.monthDate);
      currentDate.setMonth(currentDate.getMonth() + direction);
      state.monthDate = currentDate.toISOString();
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
  setWeekDate,
  setMonthDate,
  setWeekData,
  setSelectedDate,
  navigateWeek,
  navigateMonth,
  setLoading,
  setError,
} = calendarSlice.actions;

export default calendarSlice.reducer;
