import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api-service';
import { OrganizationUnit } from '../../types';

interface OrganizationState {
  organizations: OrganizationUnit[];
  selectedOrganization: OrganizationUnit | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OrganizationState = {
  organizations: [],
  selectedOrganization: null,
  status: 'idle',
  error: null,
};

// Async Thunks
export const fetchOrganizations = createAsyncThunk(
  'organizations/fetchOrganizations',
  async (_, { rejectWithValue }) => {
    try {
  // debug removed
      const data = await apiService.getOrganizations();
  // debug removed
      return data;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Laden der Organisationen');
    }
  }
);

export const createOrganization = createAsyncThunk(
  'organizations/createOrganization',
  async (organizationData: Omit<OrganizationUnit, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
  // debug removed
      const data = await apiService.createOrganization(organizationData);
  // debug removed
      return data;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Organisation');
    }
  }
);

export const updateOrganization = createAsyncThunk(
  'organizations/updateOrganization',
  async ({ id, data }: { id: string; data: Partial<OrganizationUnit> }, { rejectWithValue }) => {
    try {
  // debug removed
      const result = await apiService.updateOrganization(id, data);
  // debug removed
      return result;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Organisation');
    }
  }
);

export const deleteOrganization = createAsyncThunk(
  'organizations/deleteOrganization',
  async (id: string, { rejectWithValue }) => {
    try {
  // debug removed
      await apiService.deleteOrganization(id);
  // debug removed
      return id;
    } catch (error: any) {
  // suppress console noise
      return rejectWithValue(error.message || 'Fehler beim Löschen der Organisation');
    }
  }
);

const organizationSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    setSelectedOrganization: (state, action: PayloadAction<OrganizationUnit | null>) => {
      state.selectedOrganization = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Organizations
      .addCase(fetchOrganizations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.organizations = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Create Organization
      .addCase(createOrganization.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.organizations.push(action.payload);
        state.error = null;
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Update Organization
      .addCase(updateOrganization.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateOrganization.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.organizations.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.organizations[index] = action.payload;
          // Aktualisiere auch selectedOrganization wenn es die gleiche Organisation ist
          if (state.selectedOrganization && state.selectedOrganization.id === action.payload.id) {
            state.selectedOrganization = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(updateOrganization.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Delete Organization
      .addCase(deleteOrganization.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteOrganization.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.organizations = state.organizations.filter(org => org.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteOrganization.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedOrganization, clearError } = organizationSlice.actions;

export default organizationSlice.reducer;
