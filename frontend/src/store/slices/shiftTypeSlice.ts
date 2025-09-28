import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { ShiftType } from '../../types';

export interface ShiftTypeCreateData {
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  organizationId: string;
  description?: string;
  isFlexible?: boolean;
  isAllDay?: boolean;
  countsTowardHours?: boolean;
  category?: 'regular' | 'absence' | 'special';
  priority?: number;
  isActive?: boolean;
}

export interface ShiftTypeUpdateData {
  name?: string;
  color?: string;
  startTime?: string;
  endTime?: string;
  organizationId?: string;
  description?: string;
  isFlexible?: boolean;
  isAllDay?: boolean;
  countsTowardHours?: boolean;
  category?: 'regular' | 'absence' | 'special';
  priority?: number;
  isActive?: boolean;
}

interface ShiftTypeState {
  shiftTypes: ShiftType[];
  selectedShiftType: ShiftType | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ShiftTypeState = {
  shiftTypes: [],
  selectedShiftType: null,
  status: 'idle',
  error: null
};

// Async Thunks
export const fetchShiftTypes = createAsyncThunk(
  'shiftTypes/fetchShiftTypes',
  async (_, { rejectWithValue }) => {
    try {
  // debug removed
      const data = await apiService.getShiftTypes();
  // debug removed
      return data;
    } catch (error: any) {
  // suppress console noise; forward error via rejectWithValue
      return rejectWithValue(error.message || 'Fehler beim Laden der Schichttypen');
    }
  }
);

export const createShiftType = createAsyncThunk(
  'shiftTypes/createShiftType',
  async (shiftTypeData: ShiftTypeCreateData, { rejectWithValue }) => {
    try {
  // debug removed
      const data = await apiService.createShiftType({ ...shiftTypeData, isActive: true });
  // debug removed
      return data;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Schichttyps');
    }
  }
);

export const updateShiftType = createAsyncThunk(
  'shiftTypes/updateShiftType',
  async ({ id, data }: { id: string; data: ShiftTypeUpdateData }, { rejectWithValue }) => {
    try {
  // debug removed
      const result = await apiService.updateShiftType(id, data);
  // debug removed
      return result;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Schichttyps');
    }
  }
);

export const deleteShiftType = createAsyncThunk(
  'shiftTypes/deleteShiftType',
  async (id: string, { rejectWithValue }) => {
    try {
  // debug removed
      await apiService.deleteShiftType(id);
  // debug removed
      return id;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Löschen des Schichttyps');
    }
  }
);

const shiftTypeSlice = createSlice({
  name: 'shiftTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedShiftType: (state, action: PayloadAction<ShiftType | null>) => {
      state.selectedShiftType = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch shift types
      .addCase(fetchShiftTypes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchShiftTypes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.shiftTypes = action.payload;
      })
      .addCase(fetchShiftTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create shift type
      .addCase(createShiftType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createShiftType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.shiftTypes.push(action.payload);
      })
      .addCase(createShiftType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update shift type
      .addCase(updateShiftType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateShiftType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.shiftTypes.findIndex(st => st.id === action.payload.id);
        if (index !== -1) {
          state.shiftTypes[index] = action.payload;
        }
      })
      .addCase(updateShiftType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete shift type
      .addCase(deleteShiftType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteShiftType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.shiftTypes = state.shiftTypes.filter(st => st.id !== action.payload);
      })
      .addCase(deleteShiftType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const { clearError, setSelectedShiftType } = shiftTypeSlice.actions;
export default shiftTypeSlice.reducer;
