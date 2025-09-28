import { format } from 'date-fns';
import apiService from '../services/api-service';

// Simple in-memory cache to avoid excessive repeated loading/logging in dev
const holidayCache = new Map<string, Holiday[]>();
let hasWarnedFallback = false;

export interface Holiday {
  date: string;
  name: string;
  type: 'public' | 'regional' | 'school';
  state?: string;
}

// Deutsche Feiertage für den aktuellen Datumsbereich laden
export const loadHolidaysForRange = async (startDate: Date, endDate: Date, state?: string): Promise<Holiday[]> => {
  try {
    const cacheKey = `${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${state || 'ALL'}`;
    const cached = holidayCache.get(cacheKey);
    if (cached) return cached;

    // Versuche zuerst aus der lokalen Database zu laden
    // Prefer Electron IPC if present to avoid network and reduce warnings
    const holidays = (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.getHolidays)
      ? await (window as any).electronAPI.getHolidays({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          state: state
        })
      : await apiService.getHolidays({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      state: state
        });

    if (holidays && holidays.length > 0) {
      const result = holidays.map((h: any) => ({
        date: h.date,
        name: h.name,
        type: h.type || 'public',
        state: h.state
      }));
      holidayCache.set(cacheKey, result);
      return result;
    }

    // Fallback: Wenn keine Daten in der DB, verwende lokale Berechnung
  // No holidays in database, using local calculation fallback
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
  const fallbackHolidays: Holiday[] = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = getBasicGermanHolidays(year);
      fallbackHolidays.push(...yearHolidays);
    }

    const result = fallbackHolidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= startDate && holidayDate <= endDate;
    });
    holidayCache.set(cacheKey, result);
    return result;

  } catch (error) {
    if (!hasWarnedFallback) {
      console.warn('Feiertage: Fehler beim Laden – verwende lokalen Fallback (weitere Warnungen werden unterdrückt). Details:', error);
      hasWarnedFallback = true;
    }
    
    // Fallback bei Fehlern: Lokale Berechnung
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const fallbackHolidays: Holiday[] = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = getBasicGermanHolidays(year);
      fallbackHolidays.push(...yearHolidays);
    }

    const result = fallbackHolidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= startDate && holidayDate <= endDate;
    });
    const cacheKey = `${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${state || 'ALL'}`;
    holidayCache.set(cacheKey, result);
    return result;
  }
};

// Fallback: Grundlegende deutsche Feiertage ohne API
export const getBasicGermanHolidays = (year: number): Holiday[] => {
  const holidays: Holiday[] = [
    { date: `${year}-01-01`, name: 'Neujahr', type: 'public' },
    { date: `${year}-05-01`, name: 'Tag der Arbeit', type: 'public' },
    { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit', type: 'public' },
    { date: `${year}-12-24`, name: 'Heiligabend', type: 'public' },
    { date: `${year}-12-25`, name: '1. Weihnachtsfeiertag', type: 'public' },
    { date: `${year}-12-26`, name: '2. Weihnachtsfeiertag', type: 'public' },
    { date: `${year}-12-31`, name: 'Silvester', type: 'public' },
  ];

  // Osterfeiertage berechnen (vereinfacht)
  const easter = getEasterDate(year);
  
  holidays.push(
    { 
      date: format(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), 
      name: 'Karfreitag', 
      type: 'public' 
    },
    { 
      date: format(easter, 'yyyy-MM-dd'), 
      name: 'Ostersonntag', 
      type: 'public' 
    },
    { 
      date: format(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), 
      name: 'Ostermontag', 
      type: 'public' 
    },
    { 
      date: format(new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), 
      name: 'Christi Himmelfahrt', 
      type: 'public' 
    },
    { 
      date: format(new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), 
      name: 'Pfingstsonntag', 
      type: 'public' 
    },
    { 
      date: format(new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), 
      name: 'Pfingstmontag', 
      type: 'public' 
    }
  );

  return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Berechnung des Osterdatums (Gauss'sche Formel)
export const getEasterDate = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

// Prüft ob ein Datum ein Feiertag ist
export const isHoliday = (date: Date, holidays: Holiday[]): Holiday | null => {
  const dateString = format(date, 'yyyy-MM-dd');
  return holidays.find(holiday => holiday.date === dateString) || null;
};
