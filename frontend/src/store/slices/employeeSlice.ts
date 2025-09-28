import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { Employee } from '../../types';

export interface EmployeeCreateData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  photoPath?: string;
  employeeNumber?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  organizationId: string;
  isActive?: boolean;
  notes?: string;
  weeklyHours?: number;
}

export interface EmployeeUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  photoPath?: string;
  employeeNumber?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  organizationId?: string;
  isActive?: boolean;
  notes?: string;
  weeklyHours?: number;
}

interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: EmployeeState = {
  employees: [],
  selectedEmployee: null,
  status: 'idle',
  error: null
};

// Async Thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
  // debug log removed
      const data = await apiService.getEmployees();
  // debug log removed
      
      return data;
    } catch (error: any) {
  // keep concise error via rejectWithValue; suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Laden der Mitarbeiter');
    }
  }
);

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (employeeData: EmployeeCreateData, { rejectWithValue }) => {
    try {
      const employeeToCreate = {
        ...employeeData,
        isActive: employeeData.isActive ?? true
      };
      const data = await apiService.createEmployee(employeeToCreate);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Mitarbeiters');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: string; data: EmployeeUpdateData }, { rejectWithValue }) => {
    try {
      const result = await apiService.updateEmployee(id, data);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Mitarbeiters');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteEmployee(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Mitarbeiters');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create employee
      .addCase(createEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees.push(action.payload);
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update employee
      .addCase(updateEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.employees.findIndex(emp => emp.id === action.payload.id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete employee
      .addCase(deleteEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees = state.employees.filter(emp => emp.id !== action.payload);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const { clearError, setSelectedEmployee } = employeeSlice.actions;
export default employeeSlice.reducer;
