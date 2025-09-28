// Electron API Types
export interface ElectronAPI {
  getDatabaseStats: () => Promise<{
    fileSize: string;
    totalRecords: number;
    employees: number;
    shifts: number;
    shiftTypes: number;
    organizations: number;
  }>;
  
  // Dialog methods
  showConfirmationDialog: (title: string, message: string) => Promise<boolean>;
  
  // Window control methods
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
