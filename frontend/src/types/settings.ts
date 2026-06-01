export interface AppSettings {
  // Kalender & Zeitplanung
  calendar: {
    weekView: 5 | 6 | 7; // Anzahl Tage in Wochenansicht
    weekViewDays: 5 | 6 | 7; // Alias für Kompatibilität
    holidayRegion: string; // Bundesland für Feiertage
    customHolidays: Holiday[];
    vacationPeriods: VacationPeriod[];
  };
  
  // Schichtplanung
  shifts: {
    breakTimes: BreakTimeRule[];
    defaultBreakDuration: number; // Minuten
    automaticBreakCalculation: boolean;
    autoDeleteOldShifts: boolean;
    autoDeleteAfterMonths: number;
  };
  
  // UI Einstellungen
  ui: {
    fontSize: 'small' | 'medium' | 'large';
    defaultView: 'dashboard' | 'week' | 'month';
    theme: 'light' | 'dark' | 'auto';
    themePresetLight?: 'standard' | 'pastel-dreamland' | 'rustic-charm';
    themePresetDark?: 'standard' | 'vintage-charm' | 'cherry-blossom';
    lowGpuMode?: boolean; // Hardwarebeschleunigung deaktivieren
    // Slide-Animation beim Wochenwechsel
    weekSlideAnimation?: boolean;
    // Menü-Icons: monochrom (Standard) oder theme-basiert eingefärbt
    menuIconColor?: 'monochrome' | 'themed';
    // Mitarbeiter-Reihenfolge in der Wochenansicht
    employeeOrderMode?: 'alphabetical' | 'custom';
    // Pro Organisation (orgId) eine Wunschreihenfolge der Mitarbeiter-IDs (als String)
    employeeOrderByOrg?: Record<string, string[]>;
    // Pro Organisation (orgId) die sichtbaren Mitarbeiter-IDs in der Wochenansicht
    employeeVisibilityByOrg?: Record<string, string[]>;
  };

  // Admin & Authentifizierung
  admin: {
    adminUsername: string; // Name des Administrators
    organizationName: string; // Name der Organisation
    welcomeMessage: string; // Begrüßungsnachricht für Login
  };
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  recurring: boolean; // Jährlich wiederkehrend
  type: 'public' | 'organization' | 'custom';
}

export interface VacationPeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description?: string;
  affectsScheduling: boolean; // Beeinflusst Schichtplanung
  organizationId?: string; // Optionale Organisationszuweisung
}

export interface BreakTimeRule {
  id: string;
  name: string;
  minWorkHours: number; // Ab wie vielen Stunden Arbeit
  breakDuration: number; // Pausendauer in Minuten
  isPaid: boolean; // Bezahlte Pause
  isAutomatic: boolean; // Automatisch berechnet
}

// Default Settings
export const defaultSettings: AppSettings = {
  calendar: {
    weekView: 7,
    weekViewDays: 7, // Kompatibilität
    holidayRegion: 'BY', // Bayern als Standard
    customHolidays: [],
    vacationPeriods: []
  },
  shifts: {
    breakTimes: [
      {
        id: 'break-6h',
        name: 'Standardpause (ab 6h)',
        minWorkHours: 6,
        breakDuration: 30,
        isPaid: false,
        isAutomatic: true
      }
    ],
    defaultBreakDuration: 30,
    automaticBreakCalculation: true,
    autoDeleteOldShifts: false,
    autoDeleteAfterMonths: 6
  },
  ui: {
    fontSize: 'medium',
    defaultView: 'dashboard',
    theme: 'auto',
    themePresetLight: 'standard',
    themePresetDark: 'standard',
    lowGpuMode: false,
    weekSlideAnimation: true,
    menuIconColor: 'monochrome',
    employeeOrderMode: 'alphabetical',
    employeeOrderByOrg: {},
    employeeVisibilityByOrg: {}
  },
  admin: {
    adminUsername: 'Administrator',
    organizationName: 'Meine Organisation',
    welcomeMessage: 'Willkommen bei der Dienstplan-Verwaltung!'
  }
};

// Bundesländer für Feiertage
export const germanStates = [
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' }
];
