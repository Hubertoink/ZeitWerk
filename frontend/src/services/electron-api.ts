// Serverless API Service for Frontend
// This replaces HTTP API calls with IPC communication to Electron main process

import { Employee, ShiftType, Shift, OrganizationUnit } from '../types';

interface DatabaseStats {
  employees: number;
  organizations: number;
  shiftTypes: number;
  shifts: number;
  dbSize: number;
}

// Using global IElectronAPI from global.d.ts

class ElectronAPIService {
  private api!: IElectronAPI;

  constructor() {
    // Try to bind to the Electron preload bridge if available.
    // Do NOT throw here to avoid crashing during module import in environments
    // where the preload didn't initialize yet or during web previews.
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      this.api = (window as any).electronAPI as IElectronAPI;
    } else {
      // Provide a minimal stub so methods can fail gracefully when called.
      // Individual methods will catch and surface friendly errors.
      this.api = {} as any;
    }
  }

  // ===================
  // EMPLOYEE OPERATIONS
  // ===================

  async getEmployees(organizationId: number = 1): Promise<Employee[]> {
    try {
      return await this.api.getEmployees(organizationId);
    } catch (error) {
      console.error('ElectronAPI Error - getEmployees:', error);
      throw new Error('Fehler beim Laden der Mitarbeiter');
    }
  }

  async getEmployeeById(id: number): Promise<Employee> {
    try {
      return await this.api.getEmployeeById(id);
    } catch (error) {
      console.error('ElectronAPI Error - getEmployeeById:', error);
      throw new Error('Fehler beim Laden des Mitarbeiters');
    }
  }

  async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      return await this.api.createEmployee(employee);
    } catch (error) {
      console.error('ElectronAPI Error - createEmployee:', error);
      throw new Error('Fehler beim Erstellen des Mitarbeiters');
    }
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee> {
    try {
      return await this.api.updateEmployee(id, employee);
    } catch (error) {
      console.error('ElectronAPI Error - updateEmployee:', error);
      throw new Error('Fehler beim Aktualisieren des Mitarbeiters');
    }
  }

  async deleteEmployee(id: number): Promise<boolean> {
    try {
      return await this.api.deleteEmployee(id);
    } catch (error) {
      console.error('ElectronAPI Error - deleteEmployee:', error);
      throw new Error('Fehler beim Löschen des Mitarbeiters');
    }
  }

  // ===================
  // SHIFT TYPE OPERATIONS
  // ===================

  async getShiftTypes(organizationId: number = 1): Promise<ShiftType[]> {
    try {
      return await this.api.getShiftTypes(organizationId);
    } catch (error) {
      console.error('ElectronAPI Error - getShiftTypes:', error);
      throw new Error('Fehler beim Laden der Schichttypen');
    }
  }

  async createShiftType(shiftType: Omit<ShiftType, 'id'>): Promise<ShiftType> {
    try {
      return await this.api.createShiftType(shiftType);
    } catch (error) {
      console.error('ElectronAPI Error - createShiftType:', error);
      throw new Error('Fehler beim Erstellen des Schichttyps');
    }
  }

  async updateShiftType(id: number, shiftType: Partial<ShiftType>): Promise<ShiftType> {
    try {
      return await this.api.updateShiftType(id, shiftType);
    } catch (error) {
      console.error('ElectronAPI Error - updateShiftType:', error);
      throw new Error('Fehler beim Aktualisieren des Schichttyps');
    }
  }

  async deleteShiftType(id: number): Promise<boolean> {
    try {
      return await this.api.deleteShiftType(id);
    } catch (error) {
      console.error('ElectronAPI Error - deleteShiftType:', error);
      throw new Error('Fehler beim Löschen des Schichttyps');
    }
  }

  // ===================
  // SHIFT OPERATIONS
  // ===================

  async getShifts(organizationId: number = 1, startDate?: string, endDate?: string): Promise<Shift[]> {
    try {
      const filters: any = {};
      if (organizationId) filters.organizationId = organizationId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      return await this.api.getShifts(filters);
    } catch (error) {
      console.error('ElectronAPI Error - getShifts:', error);
      throw new Error('Fehler beim Laden der Schichten');
    }
  }

  async createShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
    try {
      return await this.api.createShift(shift);
    } catch (error) {
      console.error('ElectronAPI Error - createShift:', error);
      throw new Error('Fehler beim Erstellen der Schicht');
    }
  }

  async updateShift(id: number, shift: Partial<Shift>): Promise<Shift> {
    try {
      return await this.api.updateShift(id, shift);
    } catch (error) {
      console.error('ElectronAPI Error - updateShift:', error);
      throw new Error('Fehler beim Aktualisieren der Schicht');
    }
  }

  async deleteShift(id: number): Promise<boolean> {
    try {
      return await this.api.deleteShift(id);
    } catch (error) {
      console.error('ElectronAPI Error - deleteShift:', error);
      throw new Error('Fehler beim Löschen der Schicht');
    }
  }

  // ===================
  // ORGANIZATION OPERATIONS
  // ===================

  async getOrganizations(): Promise<OrganizationUnit[]> {
    try {
      return await this.api.getOrganizations();
    } catch (error) {
      console.error('ElectronAPI Error - getOrganizations:', error);
      throw new Error('Fehler beim Laden der Organisationen');
    }
  }

  // ===================
  // DATABASE MANAGEMENT
  // ===================

  async resetDatabase(): Promise<boolean> {
    try {
      return await this.api.resetDatabase();
    } catch (error) {
      console.error('ElectronAPI Error - resetDatabase:', error);
      throw new Error('Fehler beim Zurücksetzen der Datenbank');
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      return await this.api.getDatabaseStats();
    } catch (error) {
      console.error('ElectronAPI Error - getDatabaseStats:', error);
      throw new Error('Fehler beim Laden der Datenbank-Statistiken');
    }
  }

  async getShiftYears(): Promise<Array<{ year: number; count: number }>> {
    try {
      return await (this.api as any).getShiftYears();
    } catch (error) {
      console.error('ElectronAPI Error - getShiftYears:', error);
      return [];
    }
  }

  async purgeShiftsByYear(year: number): Promise<{ success: boolean; deleted: number }>{
    try {
      return await (this.api as any).purgeShiftsByYear(year);
    } catch (error) {
      console.error('ElectronAPI Error - purgeShiftsByYear:', error);
      return { success: false, deleted: 0 };
    }
  }

  async createBackup(): Promise<string> {
    try {
      return await this.api.createBackup();
    } catch (error) {
      console.error('ElectronAPI Error - createBackup:', error);
      throw new Error('Fehler beim Erstellen des Backups');
    }
  }

  async importBackup(): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      return await this.api.importBackup();
    } catch (error) {
      console.error('ElectronAPI Error - importBackup:', error);
      throw new Error('Fehler beim Importieren des Backups');
    }
  }

  async importBackupFromData(data: any): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      return await this.api.importBackupFromData(data);
    } catch (error) {
      console.error('ElectronAPI Error - importBackupFromData:', error);
      throw new Error('Fehler beim Importieren der Backup-Daten');
    }
  }

  // ===================
  // UTILITY FUNCTIONS
  // ===================

  isElectron(): boolean {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        return (window as any).electronAPI.isElectron();
      }
      // Fallback: detect Electron via userAgent (useful if preload didn’t bind yet)
      return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent || '');
    } catch {
      return false;
    }
  }

  getPlatform(): string {
    return this.api.platform;
  }

  async getAppVersion(): Promise<string> {
    try {
      // getAppVersion exposed in preload as 'app:getVersion'
      return await this.api.getAppVersion();
    } catch (error) {
      console.error('ElectronAPI Error - getAppVersion:', error);
      return '1.0.0';
    }
  }

  async showSaveDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<{ canceled: boolean; filePath?: string }> {
    try {
      // Prefer saveFile; keep compatibility if showSaveDialog is present
      if (this.api.saveFile) {
        return await this.api.saveFile(options);
      }
      if (this.api.showSaveDialog) {
        return await this.api.showSaveDialog(options);
      }
      return { canceled: true };
    } catch (error) {
      console.error('ElectronAPI Error - showSaveDialog:', error);
      return { canceled: true };
    }
  }

  async openExternal(url: string): Promise<boolean> {
    try {
      // Open external using the shell via preload is not exposed; fallback to window.open
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      } catch (_) {
        return false;
      }
    } catch (error) {
      console.error('ElectronAPI Error - openExternal:', error);
      return false;
    }
  }

  // ===================
  // EXPORT FUNCTIONALITY
  // ===================

  async exportToCSV(data: any[], filename: string): Promise<boolean> {
    try {
      const result = await this.showSaveDialog({
        title: 'CSV-Datei speichern',
        defaultPath: filename,
        filters: [
          { name: 'CSV-Dateien', extensions: ['csv'] },
          { name: 'Alle Dateien', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        // Convert data to CSV
        const csvContent = this.convertToCSV(data);
        // Write file using Node.js APIs through main process
        const writeRes = await this.api.writeFile(result.filePath, csvContent);
        return !!writeRes?.success;
      }

      return false;
    } catch (error) {
      console.error('CSV export error:', error);
      return false;
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}

// Create singleton instance
export const electronAPI = new ElectronAPIService();

// Legacy compatibility - provide same interface as HTTP API
export const employeeService = {
  getAll: () => electronAPI.getEmployees(),
  create: (employee: Omit<Employee, 'id'>) => electronAPI.createEmployee(employee),
  update: (id: number, employee: Partial<Employee>) => electronAPI.updateEmployee(id, employee),
  delete: (id: number) => electronAPI.deleteEmployee(id),
};

export const shiftTypeService = {
  getAll: () => electronAPI.getShiftTypes(),
  create: (shiftType: Omit<ShiftType, 'id'>) => electronAPI.createShiftType(shiftType),
  update: (id: number, shiftType: Partial<ShiftType>) => electronAPI.updateShiftType(id, shiftType),
  delete: (id: number) => electronAPI.deleteShiftType(id),
};

export const shiftService = {
  getAll: (startDate?: string, endDate?: string) => electronAPI.getShifts(1, startDate, endDate),
  create: (shift: Omit<Shift, 'id'>) => electronAPI.createShift(shift),
  update: (id: number, shift: Partial<Shift>) => electronAPI.updateShift(id, shift),
  delete: (id: number) => electronAPI.deleteShift(id),
};

export const organizationService = {
  getAll: () => electronAPI.getOrganizations(),
};

export default electronAPI;
