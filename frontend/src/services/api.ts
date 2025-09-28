// Universal API - Automatically detects Electron vs HTTP environment
import { apiService } from './api-service';

// Legacy auth service for compatibility
export const authService = {
  login: async (email: string = 'admin@demo.de', password: string = 'demo123') => {
    // In Electron mode, use simple demo auth
    if (apiService.isElectronMode()) {
      return {
        success: true,
        user: { id: 1, email: 'admin@demo.de', name: 'Admin' },
        token: 'demo-token'
      };
    } else {
      // HTTP mode (not implemented in this serverless version)
      throw new Error('HTTP authentication not available in serverless mode');
    }
  },
  
  logout: async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    return { success: true };
  }
};

// Export individual functions for direct use in Redux slices
export const getEmployees = apiService.getEmployees.bind(apiService);
export const createEmployee = apiService.createEmployee.bind(apiService);
export const updateEmployee = apiService.updateEmployee.bind(apiService);
export const deleteEmployee = apiService.deleteEmployee.bind(apiService);

export const getShiftTypes = apiService.getShiftTypes.bind(apiService);
export const createShiftType = apiService.createShiftType.bind(apiService);
export const updateShiftType = apiService.updateShiftType.bind(apiService);
export const deleteShiftType = apiService.deleteShiftType.bind(apiService);

export const getShifts = apiService.getShifts.bind(apiService);
export const createShift = apiService.createShift.bind(apiService);
export const updateShift = apiService.updateShift.bind(apiService);
export const deleteShift = apiService.deleteShift.bind(apiService);

export const getOrganizations = apiService.getOrganizations.bind(apiService);

// Create a stats service placeholder
export const getStats = async () => {
  const employees = await apiService.getEmployees();
  const shifts = await apiService.getShifts();
  const shiftTypes = await apiService.getShiftTypes();
  const organizations = await apiService.getOrganizations();
  
  return {
    totalEmployees: employees.length,
    totalShifts: shifts.length,
    totalShiftTypes: shiftTypes.length,
    totalOrganizations: organizations.length,
    activeEmployees: employees.filter(emp => emp.isActive).length,
    openShifts: shifts.filter(shift => !shift.employeeId).length
  };
};

// Legacy service objects for compatibility
export const employeeService = {
  getAll: getEmployees,
  create: createEmployee,
  update: updateEmployee,
  delete: deleteEmployee
};

export const shiftTypeService = {
  getAll: getShiftTypes,
  create: createShiftType,
  update: updateShiftType,
  delete: deleteShiftType
};

export const shiftService = {
  getAll: getShifts,
  create: createShift,
  update: updateShift,
  delete: deleteShift
};

export const organizationService = {
  getAll: getOrganizations,
  create: apiService.createOrganization.bind(apiService),
  update: apiService.updateOrganization.bind(apiService),
  delete: apiService.deleteOrganization.bind(apiService)
};

export const statsService = {
  getStats,
  resetDatabase: apiService.resetDatabase.bind(apiService),
  createBackup: apiService.createBackup.bind(apiService)
};

// Default export for compatibility
export default apiService;
