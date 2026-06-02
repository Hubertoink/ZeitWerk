declare module 'exceljs' {
  const ExcelJS: any;
  export = ExcelJS;
}
declare module 'exceljs/dist/exceljs.min.js' {
  const ExcelJS: any;
  export default ExcelJS;
}

declare global {
interface IElectronAPI {
  // Employee operations
  getEmployees: (organizationId?: number | string) => Promise<any[]>;
  getEmployeeById: (id: number | string) => Promise<any>;
  createEmployee: (employee: any) => Promise<any>;
  updateEmployee: (id: number | string, updates: any) => Promise<any>;
  deleteEmployee: (id: number | string) => Promise<any>;

  // Shift operations
  getShifts: (filters?: any) => Promise<any[]>;
  getShiftById: (id: number | string) => Promise<any>;
  createShift: (shift: any) => Promise<any>;
  updateShift: (id: number | string, updates: any) => Promise<any>;
  deleteShift: (id: number | string) => Promise<any>;
  getShiftsByEmployee: (employeeId: number | string, startDate: string, endDate: string) => Promise<any[]>;

  // ShiftType operations
  getShiftTypes: (organizationId?: number | string) => Promise<any[]>;
  getShiftTypeById: (id: number | string) => Promise<any>;
  createShiftType: (shiftType: any) => Promise<any>;
  updateShiftType: (id: number | string, updates: any) => Promise<any>;
  deleteShiftType: (id: number | string) => Promise<any>;

  // Organization operations
  getOrganizations: () => Promise<any[]>;
  getOrganizationById: (id: number | string) => Promise<any>;
  createOrganization: (organization: any) => Promise<any>;
  updateOrganization: (id: number | string, updates: any) => Promise<any>;
  deleteOrganization: (id: number | string) => Promise<any>;

  // Database management
  resetDatabase: () => Promise<any>;
  createBackup: () => Promise<string>;
  importBackup: () => Promise<any>;
  importBackupFromData: (data: any) => Promise<any>;
  getDatabaseStats: () => Promise<any>;

  // Auth operations
  login: (credentials: any) => Promise<any>;
  verifyToken: (token: string) => Promise<any>;

  // App control
  closeApp: () => Promise<void>;
  minimizeApp: () => Promise<void>;
  maximizeApp: () => Promise<void>;
  relaunchApp: () => Promise<{ success: boolean; message?: string }>;
  showConfirmationDialog: (title: string, message: string) => Promise<boolean>;

  // System info
  getVersion: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  platform: string;
  
  // File operations
  selectFile: (options: any) => Promise<any>;
  saveFile: (options: any) => Promise<any>;
  showSaveDialog?: (options: any) => Promise<any>; // Optional legacy alias
  writeFile: (filePath: string, content: string, options?: { base64?: boolean; encoding?: string }) => Promise<{ success: boolean; path?: string; message?: string }>;
  importEmployeePhoto: () => Promise<{ success: boolean; path?: string; fileUrl?: string; filename?: string; message?: string }>;
  toFileUrl: (absolutePath: string) => string;

  // Export folder helpers
  getExportFolder: () => Promise<string | null>;
  setExportFolder: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  clearExportFolder: () => Promise<{ success: boolean; error?: string }>;
  writeExportFile: (fileName: string, content: string, options?: { base64?: boolean; encoding?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  generatePdfFromHtml?: (html: string, options?: { fileName?: string; landscape?: boolean }) => Promise<{ success: boolean; path?: string; error?: string }>;
  
  // Database Path Management
  getDatabasePathInfo: () => Promise<{
    currentPath: string;
    fallbackPath: string;
    customPath: string | null;
    useCustomPath: boolean;
    autoBackup: boolean;
    lastSync: string | null;
    pathExists: boolean;
    pathSize: number;
    fallbackExists: boolean;
    fallbackSize: number;
    stats: any;
  }>;
  setCustomDatabasePath: (newPath: string, copyExisting?: boolean) => Promise<{
    success: boolean;
    newPath?: string;
    message?: string;
    error?: string;
  }>;
  resetDatabasePath: (copyToDefault?: boolean) => Promise<{
    success: boolean;
    newPath?: string;
    message?: string;
    error?: string;
  }>;
  validateDatabasePath: (testPath: string) => Promise<{
    valid: boolean;
    error?: string;
  }>;
  syncDatabases: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  showDirectoryDialog: () => Promise<{
    canceled: boolean;
    path?: string;
    error?: string;
  }>;
  // Legacy aliases kept for compatibility
  getDatabasePathInfoLegacy?: () => Promise<any>;
  
  // Notifications
  showNotification: (title: string, body: string) => Promise<void>;
  
  // Utility
  isElectron: () => boolean;
  appSettings: {
    get: () => Promise<any>;
    set: (patch: any) => Promise<any>;
  };
  
  // Window events
  onAppReady: (callback: () => void) => void;
  onAppClose: (callback: () => void) => void;
}
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
    nodeAPI: {
      process: {
        platform: string;
        version: string;
      }
    }
  }
}

// This export is necessary to make the file a module
export {};

// Backwards compatibility alias if other code references ElectronAPI
type ElectronAPI = IElectronAPI;

declare global {
  // If another declaration provides ElectronAPI, augment it
  interface ElectronAPI {
    relaunchApp: () => Promise<{ success: boolean; message?: string }>;
    appSettings: {
      get: () => Promise<any>;
      set: (patch: any) => Promise<any>;
    };
    // Database Path Management
    getDatabasePathInfo: IElectronAPI['getDatabasePathInfo'];
    setCustomDatabasePath: IElectronAPI['setCustomDatabasePath'];
    resetDatabasePath: IElectronAPI['resetDatabasePath'];
    validateDatabasePath: IElectronAPI['validateDatabasePath'];
    syncDatabases: IElectronAPI['syncDatabases'];
    showDirectoryDialog: IElectronAPI['showDirectoryDialog'];
    importEmployeePhoto: IElectronAPI['importEmployeePhoto'];
    toFileUrl: IElectronAPI['toFileUrl'];
  }
}
