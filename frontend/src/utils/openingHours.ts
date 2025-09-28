// Hilfsfunktionen für Öffnungszeiten
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface OpeningHours {
  enabled?: boolean; // Toggle-Status für das Feature
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open?: string;  // "14:00"
  close?: string; // "20:00"
  closed: boolean;
}

export interface SpecialOpening {
  date: string;   // "2025-01-15"
  type: 'event' | 'closure' | 'special';
  title: string;
  openTime?: string;
  closeTime?: string;
  notes?: string;
}

/**
 * Gibt die Öffnungszeiten für einen bestimmten Wochentag zurück
 */
export const getOpeningHoursForDay = (openingHours: OpeningHours | null, date: Date): DaySchedule | null => {
  if (!openingHours) return null;
  
  const dayName = format(date, 'EEEE', { locale: de }).toLowerCase();
  const dayKey = mapGermanDayToKey(dayName);
  
  return openingHours[dayKey] || null;
};

/**
 * Mappt deutsche Wochentage auf die OpeningHours Keys
 */
const mapGermanDayToKey = (germanDay: string): keyof Omit<OpeningHours, 'enabled'> => {
  const mapping: Record<string, keyof Omit<OpeningHours, 'enabled'>> = {
    'montag': 'monday',
    'dienstag': 'tuesday', 
    'mittwoch': 'wednesday',
    'donnerstag': 'thursday',
    'freitag': 'friday',
    'samstag': 'saturday',
    'sonntag': 'sunday'
  };
  
  return mapping[germanDay] || 'monday';
};

/**
 * Formatiert Öffnungszeiten für die Anzeige
 */
export const formatOpeningHours = (daySchedule: DaySchedule | null): string => {
  if (!daySchedule || daySchedule.closed) {
    return 'Geschlossen';
  }
  
  if (daySchedule.open && daySchedule.close) {
    return `🕐 ${daySchedule.open}-${daySchedule.close}`;
  }
  
  return '';
};

/**
 * Prüft ob eine Organisation an einem Tag geöffnet ist
 */
export const isOpenOnDay = (openingHours: OpeningHours | null, date: Date): boolean => {
  const daySchedule = getOpeningHoursForDay(openingHours, date);
  return daySchedule ? !daySchedule.closed : true; // true = keine Einschränkung wenn keine Öffnungszeiten definiert
};

/**
 * Gibt eine kompakte Wochenübersicht der Öffnungszeiten zurück
 */
export const getWeeklyOpeningSummary = (openingHours: OpeningHours | null): string => {
  if (!openingHours) return '';
  
  const workdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
  const weekend = ['saturday', 'sunday'] as const;
  
  // Prüfe Werktage
  const workdayHours = workdays.map(day => openingHours[day]).filter(schedule => !schedule.closed);
  const weekendHours = weekend.map(day => openingHours[day]).filter(schedule => !schedule.closed);
  
  let summary = '';
  
  if (workdayHours.length > 0) {
    const firstWorkday = workdayHours[0];
    const allWorkdaysSame = workdayHours.every(day => 
      day.open === firstWorkday.open && day.close === firstWorkday.close
    );
    
    if (allWorkdaysSame && workdayHours.length === 5) {
      summary = `Mo-Fr ${firstWorkday.open}-${firstWorkday.close}`;
    } else {
      summary = 'Unterschiedliche Werktage';
    }
  }
  
  if (weekendHours.length === 0) {
    summary += summary ? ', Wochenende geschl.' : 'Nur Werktags';
  } else if (weekendHours.length > 0) {
    summary += summary ? ', Wochenende geöffnet' : 'Auch Wochenende';
  }
  
  return summary;
};

/**
 * Prüft ob eine Uhrzeit innerhalb der Öffnungszeiten liegt
 */
export const isWithinOpeningHours = (
  time: string, 
  daySchedule: DaySchedule | null
): boolean => {
  if (!daySchedule || daySchedule.closed) {
    return true; // Keine Einschränkung wenn geschlossen oder keine Zeiten definiert
  }
  
  if (!daySchedule.open || !daySchedule.close) {
    return true; // Keine Einschränkung wenn Zeiten unvollständig
  }
  
  const [timeHour, timeMinute] = time.split(':').map(Number);
  const [openHour, openMinute] = daySchedule.open.split(':').map(Number);
  const [closeHour, closeMinute] = daySchedule.close.split(':').map(Number);
  
  const timeMinutes = timeHour * 60 + timeMinute;
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  
  return timeMinutes >= openMinutes && timeMinutes <= closeMinutes;
};
