import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { Shift } from '../../types';

interface ShiftData {
  id: number;
  shift_type_id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  organization_id: number;
  shift_type_name?: string;
  shift_type_color?: string;
  employee_first_name?: string;
  employee_last_name?: string;
  employee_position?: string;
}

interface ShiftState {
  shifts: any[]; // Mix of old format for WeekView compatibility and new format
  selectedShift: any | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ShiftState = {
  shifts: [],
  selectedShift: null,
  status: 'idle',
  error: null,
};

// Async Thunks
export const fetchShifts = createAsyncThunk(
  'shifts/fetchShifts',
  async (_params: { startDate?: string; endDate?: string; employeeId?: number; organizationId?: number } = {}, { rejectWithValue }) => {
    try {
  const shifts = await apiService.getShifts();
      return shifts;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Laden der Schichten');
    }
  }
);

export const fetchShiftById = createAsyncThunk(
  'shifts/fetchShiftById',
  async (id: number, { rejectWithValue }) => {
    try {
      // For now, get all shifts and filter
      const shifts = await apiService.getShifts();
      const shift = shifts.find((s: Shift) => s.id === id.toString());
      if (!shift) {
        throw new Error('Schicht nicht gefunden');
      }
      return shift;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Schicht');
    }
  }
);

export const createShift = createAsyncThunk(
  'shifts/createShift',
  async (shiftData: {
    shiftTypeId: string;
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    organizationUnitId: string;
  }, { rejectWithValue }) => {
    try {
  // debug removed
      
      // Convert to new API format
      const shiftForAPI = {
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        employeeId: shiftData.employeeId,
        shiftTypeId: shiftData.shiftTypeId,
        organizationId: shiftData.organizationUnitId,
        notes: shiftData.notes || ''
      };
      
  const result = await apiService.createShift(shiftForAPI);
      
      return result;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Schicht');
    }
  }
);

export const updateShift = createAsyncThunk(
  'shifts/updateShift',
  async (
    { id, data }: { id: number; data: { date?: string; start_time?: string; end_time?: string; startTime?: string; endTime?: string; employeeId?: string; organizationId?: string | null; notes?: string } },
    { rejectWithValue }
  ) => {
    try {
  // debug removed
      
  // Convert to new API format (support both snake_case and camelCase inputs)
  const updateData: any = {};
  if (data.date) updateData.date = data.date;
  if (data.start_time) updateData.startTime = data.start_time;
  if (data.end_time) updateData.endTime = data.end_time;
  if (data.startTime) updateData.startTime = data.startTime;
  if (data.endTime) updateData.endTime = data.endTime;
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
      
  const result = await apiService.updateShift(id.toString(), updateData);
      
      return result;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Schicht');
    }
  }
);

export const deleteShift = createAsyncThunk(
  'shifts/deleteShift',
  async (id: number, { rejectWithValue }) => {
    try {
  // debug removed
      
      await apiService.deleteShift(id.toString());
      
      return id;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Löschen der Schicht');
    }
  }
);

const shiftSlice = createSlice({
  name: 'shifts',
  initialState,
  reducers: {
    setSelectedShift: (state, action: PayloadAction<ShiftData | null>) => {
      state.selectedShift = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Shifts
      .addCase(fetchShifts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchShifts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Ensure all dates are strings, not Date objects
        state.shifts = action.payload.map((shift: any) => ({
          ...shift,
          date: typeof shift.date === 'string' ? shift.date : new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        state.error = null;
      })
      .addCase(fetchShifts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch Shift by ID
      .addCase(fetchShiftById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchShiftById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedShift = action.payload;
        state.error = null;
      })
      .addCase(fetchShiftById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create Shift
      .addCase(createShift.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createShift.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const newShift = {
          ...action.payload,
          date: typeof action.payload.date === 'string' ? action.payload.date : new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.shifts.push(newShift);
        state.error = null;
      })
      .addCase(createShift.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update Shift
      .addCase(updateShift.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateShift.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.shifts.findIndex(shift => shift.id === action.payload.id);
        if (index !== -1) {
          state.shifts[index] = action.payload;
        }
        if (state.selectedShift?.id === action.payload.id) {
          state.selectedShift = action.payload;
        }
        state.error = null;
      })
      .addCase(updateShift.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete Shift
      .addCase(deleteShift.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteShift.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.shifts = state.shifts.filter(shift => shift.id !== action.payload);
        if (state.selectedShift?.id === action.payload) {
          state.selectedShift = null;
        }
        state.error = null;
      })
      .addCase(deleteShift.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedShift, clearError } = shiftSlice.actions;

export default shiftSlice.reducer;
