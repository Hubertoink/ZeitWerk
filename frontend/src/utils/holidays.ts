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
  const normalizedState = state ? state.toUpperCase() : undefined;
  try {
    const cacheKey = `${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${normalizedState || 'ALL'}`;
  const cached = holidayCache.get(cacheKey);
  if (cached) return cached;

    // Versuche zuerst aus der lokalen Database zu laden
    // Prefer Electron IPC if present to avoid network and reduce warnings
    const holidays = (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.getHolidays)
      ? await (window as any).electronAPI.getHolidays({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          state: normalizedState
        })
      : await apiService.getHolidays({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      state: normalizedState
        });

    if (holidays && holidays.length > 0) {
      // Normalize from DB/API
      const normalized = holidays.map((h: any) => ({
        date: h.date,
        name: h.name,
        type: (h.type as any) || 'public',
        state: h.state
      } as Holiday));

      // Merge with local basic holidays to ensure consistency (e.g., Heiligabend/Silvester)
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      let extras: Holiday[] = [];
      for (let y = startYear; y <= endYear; y++) {
        extras = extras.concat(getBasicGermanHolidays(y));
      }
      // Filter extras to range
      extras = extras.filter(e => {
        const d = new Date(e.date);
        return d >= startDate && d <= endDate;
  }).map(e => ({ ...e, state: e.state || undefined }));

      // If DB/API already provides a holiday with same name in range, do NOT add basic extras for that name
  const presentNames = new Set(normalized.map((h: Holiday) => h.name));
      // Also, prioritize only fixed-date extras to avoid movable-feast drift
      const isFixedDate = (h: Holiday) => /-(01-01|05-01|10-03|12-24|12-25|12-26|12-31)$/.test(h.date);
      extras = extras.filter(e => !presentNames.has(e.name) || isFixedDate(e));

      // Deduplicate by date+name+state so regional and nationwide variants can coexist
      const byKey = new Map<string, Holiday>();
      const put = (h: Holiday) => {
        const key = `${h.date}::${h.name}::${h.state || 'NATIONAL'}`;
        if (!byKey.has(key)) byKey.set(key, h);
      };
      normalized.forEach(put);
      extras.forEach(put);
      const merged = Array.from(byKey.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      holidayCache.set(cacheKey, merged);
      return merged;
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
    const cacheKey = `${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}:${normalizedState || 'ALL'}`;
    holidayCache.set(cacheKey, result);
    return result;
  }
};

export const invalidateHolidayCache = (state?: string, range?: { startDate?: string; endDate?: string }) => {
  if (state && state.toUpperCase() !== 'ALL') {
    const upperState = state.toUpperCase();
    const keysToDelete: string[] = [];
    holidayCache.forEach((_value, key) => {
      if (key.endsWith(`:${upperState}`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => holidayCache.delete(key));
  } else {
    holidayCache.clear();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('holidays:cache-invalidated', {
      detail: {
        state: state ? state.toUpperCase() : 'ALL',
        range
      }
    }));
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
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  holidays.push(
    { 
      date: fmt(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)), 
      name: 'Karfreitag', 
      type: 'public' 
    },
    { 
      date: fmt(easter), 
      name: 'Ostersonntag', 
      type: 'public' 
    },
    { 
      date: fmt(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000)), 
      name: 'Ostermontag', 
      type: 'public' 
    },
    { 
      date: fmt(new Date(easter.getTime() + 39 * 24 * 60 * 60 * 1000)), 
      name: 'Christi Himmelfahrt', 
      type: 'public' 
    },
    { 
      date: fmt(new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000)), 
      name: 'Pfingstsonntag', 
      type: 'public' 
    },
    { 
      date: fmt(new Date(easter.getTime() + 50 * 24 * 60 * 60 * 1000)), 
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
