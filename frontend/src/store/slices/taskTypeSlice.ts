import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { TaskType } from '../../types';

export interface TaskTypeCreateData {
  name: string;
  color: string;
  organizationId: string;
  description?: string;
  isActive?: boolean;
}

export interface TaskTypeUpdateData {
  name?: string;
  color?: string;
  organizationId?: string;
  description?: string;
  isActive?: boolean;
}

interface TaskTypeState {
  taskTypes: TaskType[];
  selectedTaskType: TaskType | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TaskTypeState = {
  taskTypes: [],
  selectedTaskType: null,
  status: 'idle',
  error: null
};

export const fetchTaskTypes = createAsyncThunk(
  'taskTypes/fetchTaskTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getTaskTypes();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Aufgabentypen');
    }
  }
);

export const createTaskType = createAsyncThunk(
  'taskTypes/createTaskType',
  async (taskTypeData: TaskTypeCreateData, { rejectWithValue }) => {
    try {
      return await apiService.createTaskType({
        ...taskTypeData,
        isActive: taskTypeData.isActive !== false
      });
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Aufgabentyps');
    }
  }
);

export const updateTaskType = createAsyncThunk(
  'taskTypes/updateTaskType',
  async ({ id, data }: { id: string; data: TaskTypeUpdateData }, { rejectWithValue }) => {
    try {
      return await apiService.updateTaskType(id, data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Aufgabentyps');
    }
  }
);

export const deleteTaskType = createAsyncThunk(
  'taskTypes/deleteTaskType',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteTaskType(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Aufgabentyps');
    }
  }
);

const taskTypeSlice = createSlice({
  name: 'taskTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedTaskType: (state, action: PayloadAction<TaskType | null>) => {
      state.selectedTaskType = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaskTypes.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTaskTypes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.taskTypes = action.payload;
      })
      .addCase(fetchTaskTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createTaskType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTaskType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.taskTypes.push(action.payload);
      })
      .addCase(createTaskType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateTaskType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTaskType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.taskTypes.findIndex((taskType) => taskType.id === action.payload.id);
        if (index !== -1) {
          state.taskTypes[index] = action.payload;
        }
      })
      .addCase(updateTaskType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(deleteTaskType.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteTaskType.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.taskTypes = state.taskTypes.filter((taskType) => taskType.id !== action.payload);
      })
      .addCase(deleteTaskType.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const { clearError, setSelectedTaskType } = taskTypeSlice.actions;
export default taskTypeSlice.reducer;