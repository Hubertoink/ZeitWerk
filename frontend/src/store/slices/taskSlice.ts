import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { Task } from '../../types';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  selectedTask: null,
  status: 'idle',
  error: null
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_params: { startDate?: string; endDate?: string; employeeId?: number; organizationId?: number } = {}, { rejectWithValue }) => {
    try {
      return await apiService.getTasks();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Aufgaben');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: {
    taskTypeId: string;
    employeeId: string;
    date: string;
    time?: string;
    duration?: number;
    notes?: string;
    organizationId: string;
  }, { rejectWithValue }) => {
    try {
      return await apiService.createTask(taskData);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Aufgabe');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (
    { id, data }: { id: number; data: { date?: string; employeeId?: string; taskTypeId?: string; organizationId?: string; time?: string; duration?: number; notes?: string } },
    { rejectWithValue }
  ) => {
    try {
      return await apiService.updateTask(id.toString(), data);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Aufgabe');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiService.deleteTask(id.toString());
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Aufgabe');
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tasks = action.payload.map((task: Task) => ({
          ...task,
          date: typeof task.date === 'string' ? task.date : new Date().toISOString().split('T')[0],
          createdAt: task.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(createTask.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tasks.push({
          ...action.payload,
          date: typeof action.payload.date === 'string' ? action.payload.date : new Date().toISOString().split('T')[0],
          createdAt: action.payload.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      })
      .addCase(createTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateTask.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.tasks.findIndex((task) => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = {
            ...state.tasks[index],
            ...action.payload,
            updatedAt: new Date().toISOString()
          };
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = {
            ...state.selectedTask,
            ...action.payload,
            updatedAt: new Date().toISOString()
          };
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(deleteTask.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tasks = state.tasks.filter((task) => task.id !== action.payload.toString());
        if (state.selectedTask?.id === action.payload.toString()) {
          state.selectedTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const { setSelectedTask, clearError } = taskSlice.actions;
export default taskSlice.reducer;