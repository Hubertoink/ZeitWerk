// Temporary universal-api.ts - redirects to new api-service.ts
// This file exists only to prevent 404 errors during migration

import { apiService } from './api-service';

// Create a universalAPI object that mimics the old interface
const universalAPI = {
  // Organization methods (working)
  getOrganizations: () => apiService.getOrganizations(),
  createOrganization: (org: any) => apiService.createOrganization(org),
  updateOrganization: (id: string, org: any) => apiService.updateOrganization(id, org),
  deleteOrganization: (id: string) => apiService.deleteOrganization(id),
  
  // Employee methods (not implemented yet)
  getEmployees: () => apiService.getEmployees(),
    getEmployeeById: (_id: string) => Promise.reject('Employee methods not implemented yet'),
    createEmployee: (_employee: any) => Promise.reject('Employee methods not implemented yet'),
    updateEmployee: (_id: string, _employee: any) => Promise.reject('Employee methods not implemented yet'),
    deleteEmployee: (_id: string) => Promise.reject('Employee methods not implemented yet'),
  
  // Shift methods (not implemented yet)
  getShifts: (_orgId?: number, _startDate?: string, _endDate?: string) => Promise.reject('Shift methods not implemented yet'),
    createShift: (_shift: any) => Promise.reject('Shift methods not implemented yet'),
    updateShift: (_id: number, _shift: any) => Promise.reject('Shift methods not implemented yet'),
    deleteShift: (_id: number) => Promise.reject('Shift methods not implemented yet'),
  
  // ShiftType methods (not implemented yet)
  getShiftTypes: () => Promise.reject('ShiftType methods not implemented yet'),
    createShiftType: (_shiftType: any) => Promise.reject('ShiftType methods not implemented yet'),
    updateShiftType: (_id: string, _shiftType: any) => Promise.reject('ShiftType methods not implemented yet'),
    deleteShiftType: (_id: string) => Promise.reject('ShiftType methods not implemented yet'),
  
  // Utility methods
  isElectronMode: () => apiService.isElectronMode(),
};

// Export the universalAPI object (this was missing!)
export { universalAPI };

// Export all the service helpers for backward compatibility
export const employeeService = {
  getAll: () => apiService.getEmployees(),
  getById: (_id: string) => Promise.reject('Not implemented yet'),
  create: (_employee: any) => Promise.reject('Not implemented yet'),
  update: (_id: string, _employee: any) => Promise.reject('Not implemented yet'),
  delete: (_id: string) => Promise.reject('Not implemented yet'),
};

export const shiftTypeService = {
  getAll: () => Promise.reject('Not implemented yet'),
  create: (_shiftType: any) => Promise.reject('Not implemented yet'),
  update: (_id: string, _shiftType: any) => Promise.reject('Not implemented yet'),
  delete: (_id: string) => Promise.reject('Not implemented yet'),
};

export const shiftService = {
  getAll: (_startDate?: string, _endDate?: string) => Promise.reject('Not implemented yet'),
  create: (_shift: any) => Promise.reject('Not implemented yet'),
  update: (_id: number, _shift: any) => Promise.reject('Not implemented yet'),
  delete: (_id: number) => Promise.reject('Not implemented yet'),
};

export const organizationService = {
  getAll: () => apiService.getOrganizations(),
  create: (organization: any) => apiService.createOrganization(organization),
  update: (id: string, organization: any) => apiService.updateOrganization(id, organization),
  delete: (id: string) => apiService.deleteOrganization(id),
};

export const statsService = {
  getStats: () => Promise.reject('Not implemented yet'),
  resetDatabase: () => Promise.reject('Not implemented yet'),
  createBackup: () => Promise.reject('Not implemented yet'),
};

// Export as default for compatibility
export default apiService;