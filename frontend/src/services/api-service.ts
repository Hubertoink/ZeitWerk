// API Service - Final Working Version
import { Employee, ShiftType, Shift, OrganizationUnit, Task, TaskType } from '../types';

// Check if we're running in Electron
const isElectronApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

// HTTP API Base URL
const API_BASE = 'http://localhost:5001/api';

// Universal API Service that works in both Electron and Web environments
class APIService {
  // Simple in-memory caches to reduce repeated IPC calls (Electron only)
  private _cacheEmployees: { data: Employee[]; ts: number } | null = null;
  private _cacheShiftTypes: { data: ShiftType[]; ts: number } | null = null;
  private _cacheTaskTypes: { data: TaskType[]; ts: number } | null = null;
  private _cacheTTLms = 60_000; // 60s TTL

  private isCacheValid(entry: { ts: number } | null): boolean {
    return !!entry && (Date.now() - entry.ts) < this._cacheTTLms;
  }

  private async getEmployeesCached(): Promise<Employee[]> {
    if (isElectronApp()) {
      if (this.isCacheValid(this._cacheEmployees)) {
        return this._cacheEmployees!.data;
      }
      const rawEmployees = await (window as any).electronAPI.getEmployees();
      const mapped: Employee[] = rawEmployees.map((emp: any) => ({
        id: emp.id.toString(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        photoUrl: emp.photoUrl || undefined,
        photoPath: emp.photoPath || undefined,
        employeeNumber: emp.employeeNumber || '',
        position: emp.position || '',
        department: emp.department || '',
        hireDate: emp.hireDate || new Date().toISOString(),
        exitDate: emp.exitDate || undefined,
        organizationId: emp.organizationId.toString(),
        isActive: emp.isActive,
        notes: emp.notes || '',
        weeklyHours: typeof emp.weeklyHours === 'number' ? emp.weeklyHours : (emp.weeklyHours ? parseFloat(emp.weeklyHours) : undefined),
        dailyHoursPlan: emp.dailyHoursPlan || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      this._cacheEmployees = { data: mapped, ts: Date.now() };
      return mapped;
    }
    // HTTP mode: no caching here to respect server freshness
    const response = await fetch(`${API_BASE}/employees`);
    if (!response.ok) throw new Error('Failed to fetch employees');
    return await response.json();
  }

  private async getShiftTypesCached(): Promise<ShiftType[]> {
    if (isElectronApp()) {
      if (this.isCacheValid(this._cacheShiftTypes)) {
        return this._cacheShiftTypes!.data;
      }
      const rawShiftTypes = await (window as any).electronAPI.getShiftTypes();
      const mapped: ShiftType[] = rawShiftTypes.map((type: any) => ({
        id: type.id.toString(),
        name: type.name,
        color: type.color,
        startTime: type.startTime,
        endTime: type.endTime,
        isFlexible: type.isFlexible,
        isAllDay: type.isAllDay,
        countsTowardHours: type.countsTowardHours,
        description: type.description || '',
        organizationId: type.organizationId ? type.organizationId.toString() : null,
        category: type.category || 'regular',
        priority: type.priority || 1,
        isActive: type.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      this._cacheShiftTypes = { data: mapped, ts: Date.now() };
      return mapped;
    }
    const response = await fetch(`${API_BASE}/shift-types`);
    if (!response.ok) throw new Error('Failed to fetch shift types');
    return await response.json();
  }

  private async getTaskTypesCached(): Promise<TaskType[]> {
    if (isElectronApp()) {
      if (this.isCacheValid(this._cacheTaskTypes)) {
        return this._cacheTaskTypes!.data;
      }
      const rawTaskTypes = await (window as any).electronAPI.getTaskTypes();
      const mapped: TaskType[] = rawTaskTypes.map((type: any) => ({
        id: type.id.toString(),
        name: type.name,
        color: type.color,
        description: type.description || '',
        organizationId: type.organizationId ? type.organizationId.toString() : null,
        isActive: type.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      this._cacheTaskTypes = { data: mapped, ts: Date.now() };
      return mapped;
    }
    const response = await fetch(`${API_BASE}/task-types`);
    if (!response.ok) throw new Error('Failed to fetch task types');
    return await response.json();
  }
  
  async getOrganizations(): Promise<OrganizationUnit[]> {
    if (isElectronApp()) {
      const rawOrganizations = await (window as any).electronAPI.getOrganizations();
      return rawOrganizations.map((org: any) => ({
        id: org.id.toString(),
        name: org.name,
        description: org.description || '',
        parentId: org.parentId || undefined,
        color: org.color || '#1976d2',
        address: org.address || '',
        contactEmail: org.contactEmail || '',
        contactPhone: org.contactPhone || '',
        openingHours: org.openingHours || undefined,  // 🔧 WICHTIG: openingHours mitmappen!
        isActive: org.isActive !== undefined ? org.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } else {
      const response = await fetch(`${API_BASE}/organizations`);
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return await response.json();
    }
  }

  async getEmployees(): Promise<Employee[]> {
    if (isElectronApp()) {
      const rawEmployees = await (window as any).electronAPI.getEmployees();
      return rawEmployees.map((emp: any) => ({
        id: emp.id.toString(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        photoUrl: emp.photoUrl || undefined,
        photoPath: emp.photoPath || undefined,
        employeeNumber: emp.employeeNumber || '',
        position: emp.position || '',
        department: emp.department || '',
        hireDate: emp.hireDate || new Date().toISOString(),
        exitDate: emp.exitDate || undefined,
        organizationId: emp.organizationId.toString(),
        isActive: emp.isActive,
        notes: emp.notes || '',
        weeklyHours: typeof emp.weeklyHours === 'number' ? emp.weeklyHours : (emp.weeklyHours ? parseFloat(emp.weeklyHours) : undefined),
        dailyHoursPlan: emp.dailyHoursPlan || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } else {
      const response = await fetch(`${API_BASE}/employees`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      return await response.json();
    }
  }

  async createOrganization(organization: Omit<OrganizationUnit, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrganizationUnit> {
    if (isElectronApp()) {
      const orgToCreate = {
        name: organization.name,
        description: organization.description || '',
        parentId: organization.parentId || null,
        color: organization.color || '#1976d2',
        address: organization.address || '',
        contactEmail: organization.contactEmail || '',
        contactPhone: organization.contactPhone || '',
        openingHours: organization.openingHours || undefined,  // 🔧 openingHours hinzufügen!
        isActive: organization.isActive
      };
      
      const rawOrg = await (window as any).electronAPI.createOrganization(orgToCreate);
      
      return {
        id: rawOrg.id.toString(),
        name: rawOrg.name,
        description: rawOrg.description || '',
        parentId: rawOrg.parentId || undefined,
        color: rawOrg.color || '#1976d2',
        address: rawOrg.address || '',
        contactEmail: rawOrg.contactEmail || '',
        contactPhone: rawOrg.contactPhone || '',
        openingHours: rawOrg.openingHours || undefined,  // 🔧 openingHours in Response mitmappen!
        isActive: rawOrg.isActive !== undefined ? rawOrg.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization)
      });
      if (!response.ok) throw new Error('Failed to create organization');
      return await response.json();
    }
  }

  async updateOrganization(id: string, organization: Partial<OrganizationUnit>): Promise<OrganizationUnit> {
    if (isElectronApp()) {
      const orgToUpdate: any = {};
      if (organization.name) orgToUpdate.name = organization.name;
      if (organization.description !== undefined) orgToUpdate.description = organization.description;
      if (organization.parentId !== undefined) orgToUpdate.parentId = organization.parentId || null;
      if (organization.color !== undefined) orgToUpdate.color = organization.color;
      if (organization.address !== undefined) orgToUpdate.address = organization.address;
      if (organization.contactEmail !== undefined) orgToUpdate.contactEmail = organization.contactEmail;
      if (organization.contactPhone !== undefined) orgToUpdate.contactPhone = organization.contactPhone;
      if (organization.openingHours !== undefined) orgToUpdate.openingHours = organization.openingHours;  // 🔧 openingHours hinzufügen!
      if (organization.isActive !== undefined) orgToUpdate.isActive = organization.isActive;
      
      const rawOrg = await (window as any).electronAPI.updateOrganization(parseInt(id), orgToUpdate);
      
      return {
        id: rawOrg.id.toString(),
        name: rawOrg.name,
        description: rawOrg.description || '',
        parentId: rawOrg.parentId || undefined,
        color: rawOrg.color || '#1976d2',
        address: rawOrg.address || '',
        contactEmail: rawOrg.contactEmail || '',
        contactPhone: rawOrg.contactPhone || '',
        openingHours: rawOrg.openingHours || undefined,  // 🔧 openingHours in Response mitmappen!
        isActive: rawOrg.isActive !== undefined ? rawOrg.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization)
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return await response.json();
    }
  }

  async deleteOrganization(id: string): Promise<void> {
    if (isElectronApp()) {
      await (window as any).electronAPI.deleteOrganization(parseInt(id));
    } else {
      const response = await fetch(`${API_BASE}/organizations/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete organization');
    }
  }

  // Employee Methods
  async createEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    if (isElectronApp()) {
      const empToCreate = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        photoUrl: employee.photoUrl,
        photoPath: (employee as any).photoPath,
        employeeNumber: employee.employeeNumber,
        position: employee.position,
        department: employee.department,
        hireDate: employee.hireDate,
        exitDate: employee.exitDate,
        organizationId: parseInt(employee.organizationId),
        isActive: employee.isActive,
        notes: (employee as any).notes,
        weeklyHours: (employee as any).weeklyHours,
        dailyHoursPlan: (employee as any).dailyHoursPlan
      };
      
      const rawEmp = await (window as any).electronAPI.createEmployee(empToCreate);
      
      return {
        id: rawEmp.id.toString(),
        firstName: rawEmp.firstName,
        lastName: rawEmp.lastName,
        email: rawEmp.email,
        phone: rawEmp.phone,
        photoUrl: rawEmp.photoUrl || undefined,
        photoPath: rawEmp.photoPath || undefined,
        employeeNumber: rawEmp.employeeNumber || '',
        position: rawEmp.position || '',
        department: rawEmp.department || '',
        hireDate: rawEmp.hireDate || new Date().toISOString(),
        exitDate: rawEmp.exitDate || undefined,
        organizationId: rawEmp.organizationId.toString(),
        isActive: rawEmp.isActive,
        notes: rawEmp.notes || '',
        weeklyHours: typeof rawEmp.weeklyHours === 'number' ? rawEmp.weeklyHours : (rawEmp.weeklyHours ? parseFloat(rawEmp.weeklyHours) : undefined),
        dailyHoursPlan: rawEmp.dailyHoursPlan || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      if (!response.ok) throw new Error('Failed to create employee');
      return await response.json();
    }
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    if (isElectronApp()) {
      const empToUpdate: any = {};
      if (employee.firstName) empToUpdate.firstName = employee.firstName;
      if (employee.lastName) empToUpdate.lastName = employee.lastName;
      if (employee.email) empToUpdate.email = employee.email;
      if (employee.phone) empToUpdate.phone = employee.phone;
  if (employee.employeeNumber) empToUpdate.employeeNumber = employee.employeeNumber;
  if ((employee as any).photoUrl !== undefined) empToUpdate.photoUrl = (employee as any).photoUrl;
  if ((employee as any).photoPath !== undefined) empToUpdate.photoPath = (employee as any).photoPath;
      if (employee.position) empToUpdate.position = employee.position;
      if (employee.department) empToUpdate.department = employee.department;
      if (employee.hireDate !== undefined) empToUpdate.hireDate = employee.hireDate;
      if (employee.exitDate !== undefined) empToUpdate.exitDate = employee.exitDate;
      if (employee.organizationId) empToUpdate.organizationId = parseInt(employee.organizationId);
      if (employee.isActive !== undefined) empToUpdate.isActive = employee.isActive;
      if ((employee as any).notes !== undefined) empToUpdate.notes = (employee as any).notes;
      if ((employee as any).weeklyHours !== undefined) empToUpdate.weeklyHours = (employee as any).weeklyHours;
      if ((employee as any).dailyHoursPlan !== undefined) empToUpdate.dailyHoursPlan = (employee as any).dailyHoursPlan;
      
      const rawEmp = await (window as any).electronAPI.updateEmployee(parseInt(id), empToUpdate);
      
      return {
        id: rawEmp.id.toString(),
        firstName: rawEmp.firstName,
        lastName: rawEmp.lastName,
        email: rawEmp.email,
        phone: rawEmp.phone,
        photoUrl: rawEmp.photoUrl || undefined,
        photoPath: rawEmp.photoPath || undefined,
        employeeNumber: rawEmp.employeeNumber || '',
        position: rawEmp.position || '',
        department: rawEmp.department || '',
        hireDate: rawEmp.hireDate || new Date().toISOString(),
        exitDate: rawEmp.exitDate || undefined,
        organizationId: rawEmp.organizationId.toString(),
        isActive: rawEmp.isActive,
        notes: rawEmp.notes || '',
        weeklyHours: typeof rawEmp.weeklyHours === 'number' ? rawEmp.weeklyHours : (rawEmp.weeklyHours ? parseFloat(rawEmp.weeklyHours) : undefined),
        dailyHoursPlan: rawEmp.dailyHoursPlan || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      if (!response.ok) throw new Error('Failed to update employee');
      return await response.json();
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    if (isElectronApp()) {
      await (window as any).electronAPI.deleteEmployee(parseInt(id));
    } else {
      const response = await fetch(`${API_BASE}/employees/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete employee');
    }
  }

  // ShiftType Methods
  async getShiftTypes(): Promise<ShiftType[]> {
    if (isElectronApp()) {
      const rawShiftTypes = await (window as any).electronAPI.getShiftTypes();
      return rawShiftTypes.map((type: any) => ({
        id: type.id.toString(),
        name: type.name,
        color: type.color,
        startTime: type.startTime,
        endTime: type.endTime,
        isFlexible: type.isFlexible,
        isAllDay: type.isAllDay,
        countsTowardHours: type.countsTowardHours,
        description: type.description || '',
        organizationId: type.organizationId ? type.organizationId.toString() : null,
        category: type.category || 'regular',
        priority: type.priority || 1,
        isActive: type.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } else {
      const response = await fetch(`${API_BASE}/shift-types`);
      if (!response.ok) throw new Error('Failed to fetch shift types');
      return await response.json();
    }
  }

  async createShiftType(shiftType: Omit<ShiftType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShiftType> {
    if (isElectronApp()) {
      const typeToCreate = {
        name: shiftType.name,
        color: shiftType.color,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
        isFlexible: shiftType.isFlexible,
        isAllDay: shiftType.isAllDay,
        countsTowardHours: shiftType.countsTowardHours,
        description: shiftType.description || '',
        organizationId: shiftType.organizationId ? parseInt(shiftType.organizationId) : null,
        category: shiftType.category || 'regular',
        priority: shiftType.priority || 1,
        isActive: shiftType.isActive
      };

      this._cacheShiftTypes = null;
      
      const rawType = await (window as any).electronAPI.createShiftType(typeToCreate);
      
      return {
        id: rawType.id.toString(),
        name: rawType.name,
        color: rawType.color,
        startTime: rawType.startTime,
        endTime: rawType.endTime,
        isFlexible: rawType.isFlexible,
        isAllDay: rawType.isAllDay,
        countsTowardHours: rawType.countsTowardHours,
        description: rawType.description || '',
        organizationId: rawType.organizationId ? rawType.organizationId.toString() : null,
        category: rawType.category || 'regular',
        priority: rawType.priority || 1,
        isActive: rawType.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/shift-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftType)
      });
      if (!response.ok) throw new Error('Failed to create shift type');
      return await response.json();
    }
  }

  async updateShiftType(id: string, shiftType: Partial<ShiftType>): Promise<ShiftType> {
    if (isElectronApp()) {
      const typeToUpdate: any = {};
      if (shiftType.name) typeToUpdate.name = shiftType.name;
      if (shiftType.color) typeToUpdate.color = shiftType.color;
      if (shiftType.startTime) typeToUpdate.startTime = shiftType.startTime;
      if (shiftType.endTime) typeToUpdate.endTime = shiftType.endTime;
      if (shiftType.isFlexible !== undefined) typeToUpdate.isFlexible = shiftType.isFlexible;
      if (shiftType.isAllDay !== undefined) typeToUpdate.isAllDay = shiftType.isAllDay;
      if (shiftType.countsTowardHours !== undefined) typeToUpdate.countsTowardHours = shiftType.countsTowardHours;
      if (shiftType.description) typeToUpdate.description = shiftType.description;
      if (shiftType.organizationId) typeToUpdate.organizationId = parseInt(shiftType.organizationId);
      if (shiftType.category) typeToUpdate.category = shiftType.category;
      if (shiftType.priority) typeToUpdate.priority = shiftType.priority;
      if (shiftType.isActive !== undefined) typeToUpdate.isActive = shiftType.isActive;

      this._cacheShiftTypes = null;
      
      const rawType = await (window as any).electronAPI.updateShiftType(parseInt(id), typeToUpdate);
      
      return {
        id: rawType.id.toString(),
        name: rawType.name,
        color: rawType.color,
        startTime: rawType.startTime,
        endTime: rawType.endTime,
        isFlexible: rawType.isFlexible,
        isAllDay: rawType.isAllDay,
        countsTowardHours: rawType.countsTowardHours,
        description: rawType.description || '',
        organizationId: rawType.organizationId ? rawType.organizationId.toString() : null,
        category: rawType.category || 'regular',
        priority: rawType.priority || 1,
        isActive: rawType.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/shift-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftType)
      });
      if (!response.ok) throw new Error('Failed to update shift type');
      return await response.json();
    }
  }

  async deleteShiftType(id: string): Promise<void> {
    if (isElectronApp()) {
      this._cacheShiftTypes = null;
      await (window as any).electronAPI.deleteShiftType(parseInt(id));
    } else {
      const response = await fetch(`${API_BASE}/shift-types/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete shift type');
    }
  }

  // TaskType Methods
  async getTaskTypes(): Promise<TaskType[]> {
    if (isElectronApp()) {
      return await this.getTaskTypesCached();
    }

    const response = await fetch(`${API_BASE}/task-types`);
    if (!response.ok) throw new Error('Failed to fetch task types');
    return await response.json();
  }

  async createTaskType(taskType: Omit<TaskType, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskType> {
    if (isElectronApp()) {
      const typeToCreate = {
        name: taskType.name,
        color: taskType.color,
        description: taskType.description || '',
        organizationId: taskType.organizationId ? parseInt(taskType.organizationId) : null,
        isActive: taskType.isActive
      };

      this._cacheTaskTypes = null;
      const rawType = await (window as any).electronAPI.createTaskType(typeToCreate);

      return {
        id: rawType.id.toString(),
        name: rawType.name,
        color: rawType.color,
        description: rawType.description || '',
        organizationId: rawType.organizationId ? rawType.organizationId.toString() : null,
        isActive: rawType.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE}/task-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskType)
    });
    if (!response.ok) throw new Error('Failed to create task type');
    return await response.json();
  }

  async updateTaskType(id: string, taskType: Partial<TaskType>): Promise<TaskType> {
    if (isElectronApp()) {
      const typeToUpdate: any = {};
      if (taskType.name) typeToUpdate.name = taskType.name;
      if (taskType.color) typeToUpdate.color = taskType.color;
      if (taskType.description !== undefined) typeToUpdate.description = taskType.description;
      if (taskType.organizationId !== undefined) typeToUpdate.organizationId = taskType.organizationId ? parseInt(taskType.organizationId) : null;
      if (taskType.isActive !== undefined) typeToUpdate.isActive = taskType.isActive;

      this._cacheTaskTypes = null;
      const rawType = await (window as any).electronAPI.updateTaskType(parseInt(id), typeToUpdate);

      return {
        id: rawType.id.toString(),
        name: rawType.name,
        color: rawType.color,
        description: rawType.description || '',
        organizationId: rawType.organizationId ? rawType.organizationId.toString() : null,
        isActive: rawType.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE}/task-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskType)
    });
    if (!response.ok) throw new Error('Failed to update task type');
    return await response.json();
  }

  async deleteTaskType(id: string): Promise<void> {
    if (isElectronApp()) {
      this._cacheTaskTypes = null;
      await (window as any).electronAPI.deleteTaskType(parseInt(id));
      return;
    }

    const response = await fetch(`${API_BASE}/task-types/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task type');
  }

  // Shift Methods
  async getShifts(): Promise<Shift[]> {
    if (isElectronApp()) {
      const rawShifts = await (window as any).electronAPI.getShifts();
      // Get shift types and employees for enrichment (cached to avoid repeated IPC calls)
      const rawShiftTypes = await this.getShiftTypesCached();
      const rawEmployees = await this.getEmployeesCached();
      
      return rawShifts.map((shift: any) => {
        // Sicherheit: Prüfe auf undefined/null Werte
        const shiftTypeId = shift.shiftTypeId || shift.shift_type_id;
        const employeeId = shift.employeeId || shift.employee_id;
        const organizationId = shift.organizationId || shift.organization_id;
        
        // Find shift type info
        const shiftType = (rawShiftTypes as any[]).find((st: any) => (st.id === (shiftTypeId?.toString?.() || shiftTypeId)) || (st.id?.toString?.() === (shiftTypeId?.toString?.())));
        const employee = (rawEmployees as any[]).find((emp: any) => (emp.id === (employeeId?.toString?.() || employeeId)) || (emp.id?.toString?.() === (employeeId?.toString?.())));
        
        return {
          id: shift.id ? shift.id.toString() : '',
          date: shift.date || '',
          startTime: shift.startTime || shift.start_time || '',
          endTime: shift.endTime || shift.end_time || '',
          employeeId: employeeId ? employeeId.toString() : '',
          shiftTypeId: shiftTypeId ? shiftTypeId.toString() : '',
          organizationId: organizationId ? organizationId.toString() : '',
          notes: shift.notes || '',
          // Enriched metadata
          shiftTypeName: shiftType?.name || 'Unbekannt',
          shiftTypeColor: shiftType?.color || '#cccccc',
          shiftTypeCategory: shiftType?.category || 'regular',
          shiftTypeCountsTowardHours: (shiftType?.countsTowardHours !== undefined) ? !!shiftType.countsTowardHours : (shiftType?.category === 'absence' ? false : true),
          shiftTypeIsAllDay: !!shiftType?.isAllDay,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    } else {
      const response = await fetch(`${API_BASE}/shifts`);
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return await response.json();
    }
  }

  // Task Methods
  async getTasks(filters: { startDate?: string; endDate?: string; employeeId?: number; organizationId?: number | string } = {}): Promise<Task[]> {
    if (isElectronApp()) {
      const rawTasks = await (window as any).electronAPI.getTasks(filters);
      const rawTaskTypes = await this.getTaskTypesCached();
      const rawEmployees = await this.getEmployeesCached();

      return rawTasks.map((task: any) => {
        const taskTypeId = task.taskTypeId || task.task_type_id;
        const employeeId = task.employeeId || task.employee_id;
        const organizationId = task.organizationId || task.organization_id;
        const taskType = (rawTaskTypes as any[]).find((tt: any) => (tt.id === (taskTypeId?.toString?.() || taskTypeId)) || (tt.id?.toString?.() === taskTypeId?.toString?.()));
        const employee = (rawEmployees as any[]).find((emp: any) => (emp.id === (employeeId?.toString?.() || employeeId)) || (emp.id?.toString?.() === employeeId?.toString?.()));

        return {
          id: task.id ? task.id.toString() : '',
          date: task.date || '',
          time: task.time || '',
          employeeId: employeeId ? employeeId.toString() : '',
          taskTypeId: taskTypeId ? taskTypeId.toString() : '',
          organizationId: organizationId ? organizationId.toString() : '',
          notes: task.notes || '',
          taskTypeName: taskType?.name || 'Aufgabe',
          taskTypeColor: taskType?.color || '#cccccc',
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    }

    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.set('startDate', filters.startDate);
    if (filters.endDate) queryParams.set('endDate', filters.endDate);
    if (filters.employeeId) queryParams.set('employeeId', String(filters.employeeId));
    if (filters.organizationId) queryParams.set('organizationId', String(filters.organizationId));
    const url = queryParams.toString() ? `${API_BASE}/tasks?${queryParams}` : `${API_BASE}/tasks`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'taskTypeName' | 'taskTypeColor' | 'employeeName'>): Promise<Task> {
    if (isElectronApp()) {
      const taskToCreate = {
        date: task.date,
        time: task.time || '',
        employeeId: task.employeeId ? parseInt(task.employeeId) : null,
        taskTypeId: parseInt(task.taskTypeId),
        organizationId: parseInt(task.organizationId),
        notes: task.notes || ''
      };

      const rawTask = await (window as any).electronAPI.createTask(taskToCreate);
      return {
        id: rawTask.id.toString(),
        date: rawTask.date,
        time: rawTask.time || '',
        employeeId: rawTask.employeeId ? rawTask.employeeId.toString() : '',
        taskTypeId: rawTask.taskTypeId.toString(),
        organizationId: rawTask.organizationId.toString(),
        notes: rawTask.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to create task');
    return await response.json();
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    if (isElectronApp()) {
      const taskToUpdate: any = {};
      if (task.date) taskToUpdate.date = task.date;
      if (task.time !== undefined) taskToUpdate.time = task.time;
      if (task.employeeId !== undefined) taskToUpdate.employeeId = task.employeeId ? parseInt(task.employeeId) : null;
      if (task.taskTypeId) taskToUpdate.taskTypeId = parseInt(task.taskTypeId);
      if (task.organizationId) taskToUpdate.organizationId = parseInt(task.organizationId);
      if (task.notes !== undefined) taskToUpdate.notes = task.notes;

      const rawTask = await (window as any).electronAPI.updateTask(parseInt(id), taskToUpdate);
      return {
        id: rawTask.id.toString(),
        date: rawTask.date,
        time: rawTask.time || '',
        employeeId: rawTask.employeeId ? rawTask.employeeId.toString() : '',
        taskTypeId: rawTask.taskTypeId.toString(),
        organizationId: rawTask.organizationId.toString(),
        notes: rawTask.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
  }

  async deleteTask(id: string): Promise<void> {
    if (isElectronApp()) {
      await (window as any).electronAPI.deleteTask(parseInt(id));
      return;
    }

    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task');
  }

  async createShift(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shift> {
    if (isElectronApp()) {
      const shiftToCreate = {
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        employeeId: shift.employeeId ? parseInt(shift.employeeId) : null,
        shiftTypeId: parseInt(shift.shiftTypeId),
        organizationId: parseInt(shift.organizationId),
        notes: shift.notes || ''
      };
      
      const rawShift = await (window as any).electronAPI.createShift(shiftToCreate);
      
      return {
        id: rawShift.id.toString(),
        date: rawShift.date,
        startTime: rawShift.startTime,
        endTime: rawShift.endTime,
        employeeId: rawShift.employeeId ? rawShift.employeeId.toString() : '',
        shiftTypeId: rawShift.shiftTypeId.toString(),
        organizationId: rawShift.organizationId.toString(),
        notes: rawShift.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shift)
      });
      if (!response.ok) throw new Error('Failed to create shift');
      return await response.json();
    }
  }

  async updateShift(id: string, shift: Partial<Shift>): Promise<Shift> {
    if (isElectronApp()) {
      const shiftToUpdate: any = {};
      if (shift.date) shiftToUpdate.date = shift.date;
      if (shift.startTime) shiftToUpdate.startTime = shift.startTime;
      if (shift.endTime) shiftToUpdate.endTime = shift.endTime;
      if (shift.employeeId !== undefined) shiftToUpdate.employeeId = shift.employeeId ? parseInt(shift.employeeId) : null;
      if (shift.shiftTypeId) shiftToUpdate.shiftTypeId = parseInt(shift.shiftTypeId);
      if (shift.organizationId) shiftToUpdate.organizationId = parseInt(shift.organizationId);
      if (shift.notes !== undefined) shiftToUpdate.notes = shift.notes;
      
      const rawShift = await (window as any).electronAPI.updateShift(parseInt(id), shiftToUpdate);
      
      return {
        id: rawShift.id.toString(),
        date: rawShift.date,
        startTime: rawShift.startTime,
        endTime: rawShift.endTime,
        employeeId: rawShift.employeeId ? rawShift.employeeId.toString() : '',
        shiftTypeId: rawShift.shiftTypeId.toString(),
        organizationId: rawShift.organizationId.toString(),
        notes: rawShift.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const response = await fetch(`${API_BASE}/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shift)
      });
      if (!response.ok) throw new Error('Failed to update shift');
      return await response.json();
    }
  }

  async deleteShift(id: string): Promise<void> {
    if (isElectronApp()) {
      await (window as any).electronAPI.deleteShift(parseInt(id));
    } else {
      const response = await fetch(`${API_BASE}/shifts/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete shift');
    }
  }

  // Admin/Development Methods
  async resetDatabase(): Promise<void> {
    if (isElectronApp()) {
      await (window as any).electronAPI.resetDatabase();
    } else {
      // HTTP mode - not implemented yet
      throw new Error('Database reset not available in HTTP mode');
    }
  }

  // =============================
  // HOLIDAY MANAGEMENT METHODS
  // =============================

  async getHolidays(filters: { year?: number; state?: string; startDate?: string; endDate?: string } = {}): Promise<any[]> {
    if (isElectronApp()) {
      return await (window as any).electronAPI.getHolidays(filters);
    } else {
      const queryParams = new URLSearchParams();
      if (filters.year) queryParams.append('year', filters.year.toString());
      if (filters.state) queryParams.append('state', filters.state);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const response = await fetch(`${API_BASE}/holidays?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch holidays');
      return await response.json();
    }
  }

  async loadHolidaysFromAPI(state: string, fromYear: number, toYear: number): Promise<any> {
    if (isElectronApp()) {
      return await (window as any).electronAPI.loadHolidaysFromAPI(state, fromYear, toYear);
    } else {
      const response = await fetch(`${API_BASE}/holidays/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, fromYear, toYear })
      });
      if (!response.ok) throw new Error('Failed to load holidays from API');
      return await response.json();
    }
  }

  async getHolidayCacheInfo(state?: string): Promise<any> {
    if (isElectronApp()) {
      return await (window as any).electronAPI.getHolidayCacheInfo(state);
    } else {
      const url = state ? `${API_BASE}/holidays/cache/${state}` : `${API_BASE}/holidays/cache`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch holiday cache info');
      return await response.json();
    }
  }

  async clearHolidayCache(state?: string, year?: number): Promise<any> {
    if (isElectronApp()) {
      return await (window as any).electronAPI.clearHolidayCache(state, year);
    } else {
      const response = await fetch(`${API_BASE}/holidays/cache`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, year })
      });
      if (!response.ok) throw new Error('Failed to clear holiday cache');
      return await response.json();
    }
  }

  async createBackup(): Promise<{ success: boolean; filename?: string; message?: string }> {
    if (isElectronApp()) {
      return await (window as any).electronAPI.createBackup();
    } else {
      // HTTP mode - not implemented yet
      throw new Error('Backup creation not available in HTTP mode');
    }
  }

  isElectronMode(): boolean {
    return isElectronApp();
  }
}

// Create and export the instance
export const apiService = new APIService();

// Export as default
export default apiService;
