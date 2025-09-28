import { OpeningHours } from '../utils/openingHours';

// Mitarbeiter Types
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photoUrl?: string; // optional URL to an employee photo
  photoPath?: string; // optional local path in userData/photos
  employeeNumber?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional: Wochenarbeitszeit (in Stunden, z.B. 38.5)
  weeklyHours?: number;
  // Optional: Interne Notizen zum Mitarbeiter
  notes?: string;
}

// Organisationseinheiten Types
export interface OrganizationUnit {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: OrganizationUnit[];
  color?: string; // Made optional since it's not always provided
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  openingHours?: OpeningHours;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schichttypen Types
export interface ShiftType {
  id: string;
  name: string;
  color: string;
  startTime?: string; // HH:mm format
  endTime?: string;   // HH:mm format
  isFlexible?: boolean; // true für freie Schichten (made optional)
  // Ganztägig-Flag (z.B. Urlaub, Krankheit). Wenn true, gilt i.d.R. 00:00-23:59
  isAllDay?: boolean;
  // Ob diese Schicht zur Arbeitszeit zählt ("Frei"/Urlaub/Krankheit: false)
  countsTowardHours?: boolean;
  description?: string;
  organizationId?: string | null; // Changed from organizationUnitId to match API
  category?: 'regular' | 'absence' | 'special'; // regular = Arbeitsschichten, absence = Krank/Urlaub, special = Sonderschichten
  priority?: number; // Höhere Priorität kann niedrigere überschreiben
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Schichten Types
export interface Shift {
  id: string;
  employeeId: string;
  shiftTypeId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  organizationId: string; // Changed from organizationUnitId to match API
  // Enriched metadata (added by API layer)
  shiftTypeName?: string;
  shiftTypeColor?: string;
  employeeName?: string;
  createdAt: string; // Changed from Date to string
  updatedAt: string; // Changed from Date to string
}

// Calendar View Types
export interface CalendarShift {
  id: string;
  shift: Shift;
  employee: Employee;
  shiftType: ShiftType;
  organizationUnit: OrganizationUnit;
}

export interface WeekViewData {
  weekStart: Date;
  weekEnd: Date;
  days: CalendarDay[];
}

export interface CalendarDay {
  date: Date;
  shifts: CalendarShift[];
}

// Drag and Drop Types
export interface DragItem {
  type: 'shift' | 'shiftType';
  shiftType?: ShiftType;
  shift?: CalendarShift;
}

export interface DropTarget {
  employeeId: string;
  date: Date;
  organizationUnitId: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationUnits: string[];
  tenantId: string;
}

export enum UserRole {
  ADMIN = 'admin',
  PLANNER = 'planner',
  EMPLOYEE = 'employee'
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Filter and Search Types
export interface EmployeeFilter {
  search?: string;
  organizationUnitId?: string;
  isActive?: boolean;
}

export interface ShiftFilter {
  dateFrom?: Date;
  dateTo?: Date;
  employeeId?: string;
  shiftTypeId?: string;
  organizationUnitId?: string;
}

// Settings Types
export interface AppSettings {
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  defaultView: 'week' | 'month';
  timeFormat: '12h' | '24h';
  language: 'de' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
  };
}
