import React, { useEffect, useState, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import {
  Typography,
  Paper,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Popover,
  Box,
  Snackbar,
  Alert,
  TextField,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider
} from '@mui/material';
import { ChevronLeft, ChevronRight, Person as PersonIcon, Close as CloseIcon, ContentCopy as CopyIcon, InfoOutlined, DragIndicator, Reorder as ReorderIcon, DeleteSweep as DeleteSweepIcon, Group as GroupIcon } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setWeekDate, navigateWeek } from '../../store/slices/calendarSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts, createShift, updateShift, deleteShift } from '../../store/slices/shiftSlice';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';
import { Holiday, isHoliday, loadHolidaysForRange } from '../../utils/holidays';
import { VacationPeriod } from '../../types/settings';
import BulkCreateShiftForm from './BulkCreateShiftForm';
import { buildWeekExcelFromShifts, saveWeekExcel } from '../../utils/excelExport';
import { getOpeningHoursForDay, formatOpeningHours } from '../../utils/openingHours';
import TemplateActions from './TemplateActions';

// Helper: parse HH:mm to minutes
function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== 'string') return 0;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const h = parseInt(m[1], 10) || 0;
  const min = parseInt(m[2], 10) || 0;
  return h * 60 + min;
}

// Helper: apply German break rules to a day's total working minutes
function applyBreaks(totalMinutes: number): number {
  if (totalMinutes > 9 * 60) return Math.max(0, totalMinutes - 45);
  if (totalMinutes > 6 * 60) return Math.max(0, totalMinutes - 30);
  return totalMinutes;
}

function minutesToHM(total: number): string {
  const sign = total < 0 ? '-' : '';
  const n = Math.abs(total);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

// Helper: duration between start and end in minutes, treating end "00:00" as 24:00 when start > 0
function durationWithMidnight(startStr?: string, endStr?: string): number {
  const s = parseTimeToMinutes(startStr);
  let e = parseTimeToMinutes(endStr);
  // Accept 00:00 as 24:00 if start is later on the same day
  if (e === 0 && s > 0 && (endStr === '00:00' || endStr === '0:00' || endStr === '00:0' || endStr === '00:00')) {
    e = 24 * 60;
  }
  return Math.max(0, e - s);
}

// Helper: display end time as 24:00 when end is 00:00 and start > 0
function endDisplayWithMidnight(startStr?: string, endStr?: string): string {
  const s = parseTimeToMinutes(startStr);
  const e = parseTimeToMinutes(endStr);
  if (e === 0 && s > 0 && (endStr === '00:00' || endStr === '0:00' || endStr === '00:0' || endStr === '00:00')) {
    return '24:00';
  }
  return endStr || '';
}

function parseLocalEmployeeDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isEmployeeActiveOnDate(employee: any, date: Date): boolean {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hireDate = parseLocalEmployeeDate(employee?.hireDate);
  const exitDate = parseLocalEmployeeDate(employee?.exitDate);

  if (hireDate && day < hireDate) return false;
  if (exitDate && day > exitDate) return false;

  return true;
}

function getEmployeeInactiveReason(employee: any, date: Date): string | null {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hireDate = parseLocalEmployeeDate(employee?.hireDate);
  const exitDate = parseLocalEmployeeDate(employee?.exitDate);

  if (hireDate && day < hireDate) return 'Noch nicht eingetreten';
  if (exitDate && day > exitDate) return 'Bereits ausgetreten';

  return null;
}

function getDailyPlanKeyForDate(date: Date): 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[date.getDay()];
}

function getEmployeePlannedMinutes(employee: any, date: Date): number | null {
  const key = getDailyPlanKeyForDate(date);
  const hours = employee?.dailyHoursPlan?.[key];
  if (typeof hours === 'number' && isFinite(hours) && hours >= 0) {
    return Math.round(hours * 60);
  }
  return null;
}

const WeekView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, updateSettings } = useSettings();
  const calendar = useAppSelector((state: any) => state.calendar);
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const shiftsState = useAppSelector((state: any) => state.shifts);
  
  const currentDate = calendar?.weekDate ? new Date(calendar.weekDate) : new Date();
  const shifts = shiftsState?.shifts || [];

  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [editShiftDialog, setEditShiftDialog] = useState({ open: false, shift: null as any });
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    newShift: any;
    existingShifts: any[];
    message: string;
  }>({ open: false, newShift: null, existingShifts: [], message: '' });
  const [bulkCreateDialog, setBulkCreateDialog] = useState({ 
    open: false, 
    employeeId: null as number | null, 
    date: null as string | null 
  });
  const [weekCopyDialog, setWeekCopyDialog] = useState({ open: false });
  const [isCopyingWeek, setIsCopyingWeek] = useState(false);
  const [isWeekRangeHighlighted, setIsWeekRangeHighlighted] = useState(false);
  const weekRangeHighlightTimeoutRef = useRef<number | null>(null);
  // Slide animation for week transitions
  const slideAnimationEnabled = settings?.ui?.weekSlideAnimation !== false;
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const [deletingEmployeeWeekId, setDeletingEmployeeWeekId] = useState<string | null>(null);
  const [deleteEmployeeWeekDialog, setDeleteEmployeeWeekDialog] = useState<{
    open: boolean;
    employee: any | null;
    shiftIds: number[];
  }>({ open: false, employee: null, shiftIds: [] });
  // Reorder mode for employees
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draftEmployeeOrder, setDraftEmployeeOrder] = useState<string[]>([]);
  const [employeeSelectionDialogOpen, setEmployeeSelectionDialogOpen] = useState(false);
  const [draftVisibleEmployeeIds, setDraftVisibleEmployeeIds] = useState<string[]>([]);
  // Dynamic height calc for inner table to avoid outer page scroll
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const compute = () => {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        // small bottom gap to avoid accidental overflow due to borders/shadows
        const footerGap = 8;
        const h = Math.max(200, Math.floor(vh - rect.top - footerGap));
        setTableHeight(h);
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  // Shortcuts popover state (click to toggle)
  const [shortcutsAnchor, setShortcutsAnchor] = useState<HTMLElement | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const toggleShortcuts = (e: React.MouseEvent<HTMLElement>) => {
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    setShortcutsAnchor(e.currentTarget);
    setShortcutsOpen(true);
  };
  // Copy buffer for copy-then-click workflow
  const [copyBuffer, setCopyBuffer] = useState<any | null>(null);
  // Flexible shift time selection dialog state
  const [flexDialog, setFlexDialog] = useState({
    open: false,
    employeeId: null as number | null,
    date: null as string | null,
    shiftType: null as any,
    startTime: '09:00',
    endTime: '17:00'
  });

  // Serialize vacation periods from settings to create a stable dependency key
  const vacationPeriodsKey = useMemo(() => JSON.stringify(settings?.calendar?.vacationPeriods || []), [settings?.calendar?.vacationPeriods]);

  const triggerWeekRangeHighlight = useCallback(() => {
    setIsWeekRangeHighlighted(true);
    if (weekRangeHighlightTimeoutRef.current) {
      window.clearTimeout(weekRangeHighlightTimeoutRef.current);
    }
    weekRangeHighlightTimeoutRef.current = window.setTimeout(() => {
      setIsWeekRangeHighlighted(false);
      weekRangeHighlightTimeoutRef.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (weekRangeHighlightTimeoutRef.current) {
        window.clearTimeout(weekRangeHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start am Montag
    const daysToShow = Number(settings?.calendar?.weekViewDays) || 7; // Nur die Zahl verwenden (Fallback 7)
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  // Only update if actually changed (prevents periodic rerenders)
  const changed = weekDays.length !== days.length || weekDays.some((d, idx) => d.toDateString() !== days[idx].toDateString());
  if (changed) setWeekDays(days);

    // Lade Feiertage für die aktuelle Woche
    if (days.length > 0) {
      const firstDay = days[0];
      const lastDay = days[days.length - 1];
      loadHolidaysForRange(firstDay, lastDay, settings?.calendar?.holidayRegion || 'BY')
        .then(holidaysData => setHolidays(holidaysData))
        .catch(error => console.error('Fehler beim Laden der Feiertage:', error));
    }

    // Lade Schließzeiten/Urlaubsperioden aus den Einstellungen (nur setzen, wenn geändert)
    const periods = settings?.calendar?.vacationPeriods || [];
    // Vergleiche mit stabilem Schlüssel, um setState-Bouncing zu verhindern
    const currentSerialized = JSON.stringify(vacationPeriods || []);
    if (currentSerialized !== vacationPeriodsKey) {
      setVacationPeriods(periods);
    }
  }, [currentDate, settings?.calendar?.weekViewDays, settings?.calendar?.holidayRegion, vacationPeriodsKey, weekDays]);

  // Initial data fetch: only fetch missing resources to reduce latency
  useEffect(() => {
    const shouldFetchEmployees = !employees || (Array.isArray(employees) && employees.length === 0);
    const shouldFetchShiftTypes = !shiftTypes || (Array.isArray(shiftTypes) && shiftTypes.length === 0);
    // Shifts can be many; fetch only when empty
    const shouldFetchShifts = !shifts || (Array.isArray(shifts) && shifts.length === 0);

    if (shouldFetchEmployees) dispatch(fetchEmployees());
    if (shouldFetchShiftTypes) dispatch(fetchShiftTypes());
    if (shouldFetchShifts) dispatch(fetchShifts({}));
  }, [dispatch, /* size snapshots */ (employees || []).length, (shiftTypes || []).length, (shifts || []).length]);

  // Tastatur-Navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Nur reagieren wenn kein Input-Element fokussiert ist
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevWeek();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextWeek();
          break;
        case 'Home':
          event.preventDefault();
          handleToday();
          break;
        case 'Escape':
          // Schließe offene Dialoge
          setEditShiftDialog({ open: false, shift: null });
          setConflictDialog(prev => ({ ...prev, open: false }));
          setBulkCreateDialog({ open: false, employeeId: null, date: null });
          setWeekCopyDialog({ open: false });
          setFlexDialog(prev => ({ ...prev, open: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrevWeek = () => {
    setSlideDirection('right');
    setSlideKey(k => k + 1);
    dispatch(navigateWeek('prev'));
  };

  const handleNextWeek = () => {
    setSlideDirection('left');
    setSlideKey(k => k + 1);
    dispatch(navigateWeek('next'));
  };

  const handleToday = () => {
    setSlideDirection(null);
    setSlideKey(k => k + 1);
    dispatch(setWeekDate(new Date().toISOString()));
  };

  const handleExcelWeekExport = async () => {
    try {
      if (!weekDays.length) return;
      const data = buildWeekExcelFromShifts({
        employees: filteredEmployees,
        days: weekDays,
        getShifts: getShiftsForEmployeeAndDay,
        organizationName: selectedOrganization?.name,
        vacationPeriods: (settings?.calendar?.vacationPeriods || []).map((p: any) => ({
          startDate: p.startDate,
          endDate: p.endDate,
          affectsScheduling: p.affectsScheduling !== false,
          organizationId: p.organizationId
        })),
        organizationId: selectedOrganization?.id
      });
  const defaultName = `Wochenplan_${format(weekDays[0], 'yyyy-MM-dd')}.xlsx`;
  const res = await saveWeekExcel(data, defaultName);
  setSnackbar({ open: true, message: res.ok ? (res.path ? `Gespeichert unter: ${res.path}` : 'Excel-Wochenexport gespeichert') : 'Export abgebrochen oder fehlgeschlagen', severity: res.ok ? 'success' as const : 'error' as const });
    } catch (e:any) {
      console.error('Excel week export error:', e);
      setSnackbar({ open: true, message: 'Fehler beim Excel-Export', severity: 'error' });
    }
  };

  // Helper to render shift type label with times when available
  const renderShiftTypeLabel = useCallback((st: any) => {
    // For all-day or absence types, do not show times in the badge label
    if (st?.isFlexible) return `${st?.name || 'Schicht'} (flexibel)`;
    if (st?.isAllDay || st?.category === 'absence') return st?.name || 'Schicht';
  const s: string | undefined = st?.startTime || (st?.isFlexible ? '10:00' : undefined);
  const e: string | undefined = st?.endTime || (st?.isFlexible ? '18:30' : undefined);
    const hasTimes = typeof s === 'string' && s.length >= 4 && typeof e === 'string' && e.length >= 4;
    return hasTimes ? `${st.name} (${s} - ${e})` : st.name;
  }, []);

  // Memoized shifts calculation for the entire week
  const weekShiftsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    
    employees.forEach((employee: any) => {
      weekDays.forEach(day => {
        const key = `${employee.id}-${day.toDateString()}`;
        const employeeShifts = shifts.filter((shift: any) => {
          const isCorrectEmployee = shift.employeeId === employee.id.toString();
          const isCorrectDay = isSameDay(new Date(shift.date), day);
          return isCorrectEmployee && isCorrectDay;
        });
        map.set(key, employeeShifts);
      });
    });
    
    return map;
  }, [shifts, employees, weekDays]);

  const getShiftsForEmployeeAndDay = useCallback((employeeId: number, day: Date) => {
    const key = `${employeeId}-${day.toDateString()}`;
    return weekShiftsMap.get(key) || [];
  }, [weekShiftsMap]);

  // Compute weekly working minutes per employee
  // Rules:
  // - Sum time-based regular shifts (countsTowardHours !== false) with TVöD breaks applied
  // - Absences never add time directly; if all-day absence and no regular shift that day, add planned (net) daily hours
  // - All-day, non-absence, counting shift types do not use their 23:59-like span; if no regular shift that day, add planned (net) daily hours instead
  const weeklyMinutesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((emp: any) => {
      let sum = 0;
      weekDays.forEach(day => {
        const dayShifts = getShiftsForEmployeeAndDay(emp.id, day) || [];
        // sum only regular time-based shift minutes
        let regularMinutes = 0;
        let hasRegularShift = false;
        let hasAllDayAbsence = false;
        let hasAllDayCountingNonAbsence = false;
        dayShifts.forEach((s: any) => {
          const linkedType = shiftTypes.find((st: any) => st.id?.toString?.() === (s.shiftTypeId || s.shift_type_id)?.toString?.());
          const isAbsence = ((s.shiftTypeCategory || s.category) === 'absence') || (linkedType?.category === 'absence');
          const isAllDay = !!s.shiftTypeIsAllDay || linkedType?.isAllDay === true;
          // Prefer live shift type config; fall back to shift snapshot
          let countsToward = true;
          if (typeof linkedType?.countsTowardHours === 'boolean') {
            countsToward = linkedType.countsTowardHours as boolean;
          } else if (s.shiftTypeCountsTowardHours === false) {
            countsToward = false;
          }

          if (isAbsence) {
            // All-day absence detection
            if (isAllDay) {
              hasAllDayAbsence = true;
              return;
            }
            // Heuristic: treat spans >= 23h as all-day
            const durAbs = durationWithMidnight(s.startTime || s.start_time, s.endTime || s.end_time);
            if (durAbs >= 23 * 60) hasAllDayAbsence = true;
            return; // absences never contribute minutes directly
          }

          // Non-absence
          if (isAllDay) {
            // For all-day non-absence: if it counts, remember to add planned hours instead (no duration summing)
            if (countsToward) hasAllDayCountingNonAbsence = true;
            return;
          }

          // Time-based regular shift
          if (!countsToward) return;
          const dur = durationWithMidnight(s.startTime || s.start_time, s.endTime || s.end_time);
          if (dur > 0) {
            regularMinutes += dur;
            hasRegularShift = true;
          }
        });

        // Apply breaks to regular minutes only (German rules)
        let dayTotal = applyBreaks(regularMinutes);

        // Add planned net hours when no regular shift exists and day has an all-day absence or an all-day counting non-absence
        if (!hasRegularShift && (hasAllDayAbsence || hasAllDayCountingNonAbsence)) {
          const keyMap = ['sun','mon','tue','wed','thu','fri','sat'] as const;
          const k = keyMap[day.getDay()];
          const plan = emp.dailyHoursPlan || {};
          const hours = typeof plan[k] === 'number' ? plan[k] : (plan[k] ? parseFloat(String(plan[k])) : 0);
          const planMinutes = !isNaN(hours) && isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0;
          // Do NOT apply breaks to planned hours; they are already net hours
          dayTotal += planMinutes;
        }

        sum += dayTotal;
      });
      map.set(emp.id.toString(), sum);
    });
    return map;
  }, [employees, weekDays, getShiftsForEmployeeAndDay, shiftTypes]);

  // Hilfsfunktion: Prüfe ob ein Tag in einer Schließzeit liegt
  const isVacationDay = useCallback((date: Date): VacationPeriod | null => {
    const parseLocalYMD = (s?: string) => {
      if (!s) return null;
      const parts = s.split('-').map(Number);
      if (parts.length !== 3 || parts.some(n => isNaN(n as number))) return null;
      const [y, m, d] = parts as [number, number, number];
      return new Date(y, m - 1, d);
    };
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return vacationPeriods.find(period => {
      const s = parseLocalYMD(period.startDate) || new Date(period.startDate);
      const e = parseLocalYMD(period.endDate) || new Date(period.endDate);
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      return normalizedDate >= start && normalizedDate <= end;
    }) || null;
  }, [vacationPeriods]);

  // Hilfsfunktion zur Konfliktprüfung
  const checkShiftConflicts = (newShiftData: any) => {
    const newShiftType = shiftTypes.find((st: any) => st.id === newShiftData.shiftTypeId);
    if (!newShiftType) return { hasConflict: false, conflicts: [] };

    const normalizeCategory = (shiftType: any): 'regular' | 'absence' => {
      return shiftType?.category === 'absence' ? 'absence' : 'regular';
    };
    const newShiftCategory = normalizeCategory(newShiftType);

    // Finde existierende Schichten für diesen Mitarbeiter am gleichen Tag
    const existingShifts = shifts.filter((shift: any) => 
      (shift.employeeId || shift.employee_id)?.toString() === newShiftData.employeeId.toString() &&
      shift.date === newShiftData.date
    );

    if (existingShifts.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts = [];

    const getInterval = (shiftLike: any) => {
      const startRaw = shiftLike.startTime || shiftLike.start_time;
      const endRaw = shiftLike.endTime || shiftLike.end_time;
      if (!startRaw || !endRaw) return null;
      const start = parseTimeToMinutes(startRaw);
      let end = parseTimeToMinutes(endRaw);
      if (end === 0 && start > 0 && (endRaw === '00:00' || endRaw === '0:00' || endRaw === '00:0')) {
        end = 24 * 60;
      }
      if (end <= start) return null;
      return { start, end, startRaw, endRaw };
    };
    const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;
    
    for (const existingShift of existingShifts) {
      const existingShiftType = shiftTypes.find((st: any) => 
        st.id.toString() === (existingShift.shiftTypeId || existingShift.shift_type_id)?.toString()
      );
      if (!existingShiftType) continue;
      const existingShiftCategory = normalizeCategory(existingShiftType);

      // Regeln:
      // 1. Reguläre Schichten (category: 'regular') können nicht doppelt sein
      // 2. Abwesenheiten (category: 'absence') können über reguläre Schichten gelegt werden  
      // 3. Höhere Priorität überschreibt niedrigere
      // 4. Spezielle Schichten (Urlaub, Krankheit) können parallel existieren

      if (newShiftCategory === 'regular' && existingShiftCategory === 'regular') {
        const newIsAllDay = !!newShiftType?.isAllDay;
        const existingIsAllDay = !!existingShiftType?.isAllDay || !!existingShift?.shiftTypeIsAllDay;
        const newInterval = getInterval(newShiftData);
        const existingInterval = getInterval(existingShift);
        const hasOverlap = !newInterval || !existingInterval ? true : overlaps(newInterval, existingInterval);

        // Reguläre Schichten sind erlaubt, wenn sie sich zeitlich NICHT überschneiden
        // Ganztägige/ungültige Zeitfenster behandeln wir konservativ als Konflikt
        if (newIsAllDay || existingIsAllDay || hasOverlap) {
          conflicts.push({
            type: 'duplicate_regular',
            existing: existingShift,
            existingShiftType,
            message: `${existingShiftType.name} ist bereits für diesen Tag geplant und überschneidet sich zeitlich mit der neuen Schicht.`
          });
        }
      } else if (newShiftCategory === 'absence' && existingShiftCategory === 'absence') {
        // Zwei Abwesenheiten - prüfe Priorität
        const newPriority = newShiftType.priority || 1;
        const existingPriority = existingShiftType.priority || 1;
        
        if (newPriority <= existingPriority) {
          conflicts.push({
            type: 'duplicate_absence',
            existing: existingShift,
            existingShiftType,
            message: `${existingShiftType.name} ist bereits eingetragen. Soll ${newShiftType.name} diese ersetzen?`
          });
        }
      } else if (newShiftCategory === 'regular' && existingShiftCategory === 'absence') {
        // Reguläre Schicht über Abwesenheit - warnen aber erlauben
        conflicts.push({
          type: 'regular_over_absence',
          existing: existingShift,
          existingShiftType,
          message: `${existingShiftType.name} ist bereits eingetragen. Soll trotzdem ${newShiftType.name} hinzugefügt werden?`
        });
      }
    }

    return { 
      hasConflict: conflicts.length > 0, 
      conflicts,
      canOverride: conflicts.every(c => c.type !== 'duplicate_regular')
    };
  };

  const handleShiftDrop = async (shiftType: any, employeeId: number, date: Date) => {
    try {
      // Flexible Schichten: Zeiten beim Drop abfragen
      if (shiftType.isFlexible) {
        // Standard für flexible Schichten: 10:00 - 18:30 (statt 00:00 - 23:59)
        const defaultStartTime = shiftType.startTime || '10:00';
        const defaultEndTime = shiftType.endTime || '18:30';
        setFlexDialog({
          open: true,
          employeeId,
          date: format(date, 'yyyy-MM-dd'),
          shiftType,
          startTime: defaultStartTime,
          endTime: defaultEndTime
        });
        return;
      }

      // Ensure we always have valid default times for nicht-flexible Typen
      const defaultStartTime = shiftType.startTime || '09:00';
      const defaultEndTime = shiftType.endTime || '17:00';
      
      // Resolve organization: prefer selected organization, else employee's org
      const empOrgId = (employees.find((e: any) => e.id?.toString?.() === employeeId.toString()) as any)?.organizationId;
      const orgId = selectedOrganization?.id ?? empOrgId;
      if (!orgId) {
        setSnackbar({ open: true, message: 'Keine Organisation ausgewählt – bitte Organisation wählen.', severity: 'error' });
        return;
      }
      const shiftData = {
        shiftTypeId: shiftType.id,
        employeeId: employeeId.toString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        notes: `${shiftType.name} Schicht`,
        organizationUnitId: String(orgId)
      };

      // Prüfe auf Konflikte
      const conflictCheck = checkShiftConflicts(shiftData);
      
      if (conflictCheck.hasConflict && !conflictCheck.canOverride) {
        // Zeige Fehlermeldung für nicht überschreibbare Konflikte
        setSnackbar({
          open: true,
          message: conflictCheck.conflicts[0].message,
          severity: 'error'
        });
        return;
      }

      if (conflictCheck.hasConflict && conflictCheck.canOverride) {
        // Zeige Konflikt-Dialog für überschreibbare Konflikte
        setConflictDialog({
          open: true,
          newShift: shiftData,
          existingShifts: conflictCheck.conflicts.map(c => c.existing),
          message: conflictCheck.conflicts[0].message
        });
        return;
      }
      
      // Kein Konflikt oder überschreibbar - erstelle Schicht
      await createShiftWithData(shiftData);
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Schicht:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen der Schicht',
        severity: 'error'
      });
    }
  };

  const handleMoveShift = async (shiftId: string, employeeId: number, date: Date) => {
    try {
      // Find the shift being moved
      const shift = shifts.find((s: any) => s.id?.toString() === shiftId.toString());
      if (!shift) {
        setSnackbar({ open: true, message: 'Schicht nicht gefunden', severity: 'error' });
        return;
      }

      // Determine target organization (prefer selected organization, else target employee's organization)
      const targetEmpOrgId = (employees.find((e: any) => e.id?.toString?.() === employeeId.toString()) as any)?.organizationId;
      const targetOrganizationId = (selectedOrganization?.id ?? targetEmpOrgId)?.toString?.();

      const newShiftData = {
        shiftTypeId: (shift.shiftTypeId || shift.shift_type_id)?.toString(),
        employeeId: employeeId.toString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: shift.startTime || shift.start_time || '09:00',
        endTime: shift.endTime || shift.end_time || '17:00',
        // ensure organization updates when moving across employees/orgs
        organizationId: targetOrganizationId
      };

      // Conflict check similar to creating a shift
      const conflictCheck = checkShiftConflicts(newShiftData);
      if (conflictCheck.hasConflict && !conflictCheck.canOverride) {
        setSnackbar({ open: true, message: conflictCheck.conflicts[0].message, severity: 'error' });
        return;
      }
      if (conflictCheck.hasConflict && conflictCheck.canOverride) {
        setConflictDialog({
          open: true,
          newShift: newShiftData,
          existingShifts: conflictCheck.conflicts.map(c => c.existing),
          message: conflictCheck.conflicts[0].message
        });
        return;
      }

      await moveShiftWithData(parseInt(shiftId), {
        date: format(date, 'yyyy-MM-dd'),
        employeeId: employeeId.toString(),
        organizationId: targetOrganizationId
      });
    } catch (error) {
      console.error('Fehler beim Verschieben der Schicht:', error);
      setSnackbar({ open: true, message: 'Fehler beim Verschieben der Schicht', severity: 'error' });
    }
  };

  // Duplicate an existing shift to a target employee/day
  const handleCopyExistingShift = async (shift: any, employeeId: number, date: Date) => {
    try {
      const empOrgId = (employees.find((e: any) => e.id?.toString?.() === employeeId.toString()) as any)?.organizationId;
      // Prefer TARGET org (selected or employee), fallback to source shift org
      const orgId = (selectedOrganization?.id ?? empOrgId ?? (shift.organizationId || shift.organization_id)) as string | number | undefined;
      if (!orgId) {
        setSnackbar({ open: true, message: 'Keine Organisation ausgewählt – bitte Organisation wählen.', severity: 'error' });
        return;
      }
      const newShiftData = {
        shiftTypeId: (shift.shiftTypeId || shift.shift_type_id)?.toString(),
        employeeId: employeeId.toString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: shift.startTime || shift.start_time || '09:00',
        endTime: shift.endTime || shift.end_time || '17:00',
        notes: shift.notes || '',
        organizationUnitId: String(orgId)
      };

      const conflictCheck = checkShiftConflicts(newShiftData);
      if (conflictCheck.hasConflict && !conflictCheck.canOverride) {
        setSnackbar({
          open: true,
          message: conflictCheck.conflicts[0].message,
          severity: 'error'
        });
        return;
      }

      if (conflictCheck.hasConflict && conflictCheck.canOverride) {
        setConflictDialog({
          open: true,
          newShift: newShiftData,
          existingShifts: conflictCheck.conflicts.map(c => c.existing),
          message: conflictCheck.conflicts[0].message
        });
        return;
      }

      await createShiftWithData(newShiftData);
      setSnackbar({ open: true, message: 'Schicht kopiert', severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Kopieren der Schicht:', error);
      setSnackbar({ open: true, message: 'Fehler beim Kopieren der Schicht', severity: 'error' });
    }
  };

  const moveShiftWithData = async (id: number, data: { date?: string; employeeId?: string; organizationId?: string | null | undefined }) => {
    await dispatch(updateShift({ id, data })).unwrap();
  // Refresh once after update
  dispatch(fetchShifts({}));
  setSnackbar({ open: true, message: 'Schicht verschoben', severity: 'success' });
  };

  const createShiftWithData = async (shiftData: any) => {
    await dispatch(createShift(shiftData)).unwrap();
    
  // Refresh shifts after creation
  dispatch(fetchShifts({}));
    
    setSnackbar({
      open: true,
      message: 'Schicht erfolgreich erstellt',
      severity: 'success'
    });
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await dispatch(deleteShift(parseInt(shiftId))).unwrap();
  // Refresh shifts after deletion
  dispatch(fetchShifts({}));
      setSnackbar({ open: true, message: 'Schicht erfolgreich gelöscht', severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Löschen der Schicht:', error);
      setSnackbar({ open: true, message: 'Fehler beim Löschen der Schicht', severity: 'error' });
    }
  };

  const openDeleteEmployeeWeekDialog = (employee: any) => {
    if (!weekDays || weekDays.length === 0) {
      setSnackbar({ open: true, message: 'Keine Woche ausgewählt', severity: 'error' });
      return;
    }

    const startStr = format(weekDays[0], 'yyyy-MM-dd');
    const endStr = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');
    const empId = employee.id?.toString?.();

    const weekShiftsForEmployee = shifts.filter((shift: any) => {
      const shiftEmp = (shift.employeeId || shift.employee_id)?.toString?.();
      const date = shift.date;
      return shiftEmp === empId && date >= startStr && date <= endStr;
    });

    if (weekShiftsForEmployee.length === 0) {
      setSnackbar({ open: true, message: 'Keine Schichten in dieser Woche für diesen Mitarbeiter gefunden', severity: 'info' });
      return;
    }

    setDeleteEmployeeWeekDialog({
      open: true,
      employee,
      shiftIds: weekShiftsForEmployee.map((s: any) => Number(s.id)).filter((id: number) => Number.isFinite(id))
    });
  };

  const handleDeleteEmployeeWeekShifts = async () => {
    try {
      const employee = deleteEmployeeWeekDialog.employee;
      const shiftIds = deleteEmployeeWeekDialog.shiftIds || [];
      if (!employee || shiftIds.length === 0) {
        setDeleteEmployeeWeekDialog({ open: false, employee: null, shiftIds: [] });
        return;
      }

      setDeletingEmployeeWeekId(employee.id?.toString?.() || null);
      for (const shiftId of shiftIds) {
        await dispatch(deleteShift(shiftId)).unwrap();
      }
      dispatch(fetchShifts({}));
      setSnackbar({ open: true, message: `${shiftIds.length} Schicht(en) für diese Woche gelöscht`, severity: 'success' });
      setDeleteEmployeeWeekDialog({ open: false, employee: null, shiftIds: [] });
    } catch (error) {
      console.error('Fehler beim Löschen der Wochen-Schichten:', error);
      setSnackbar({ open: true, message: 'Fehler beim Löschen der Wochen-Schichten', severity: 'error' });
    } finally {
      setDeletingEmployeeWeekId(null);
    }
  };

  const handleEditShift = (shift: any) => {
    // Finde den passenden Schichttyp für diese Schicht
    const shiftType = shiftTypes.find((st: any) => st.id === shift.shiftTypeId);
    
    // Verwende die Zeiten vom Schichttyp oder sichere Fallback-Werte
    const defaultStartTime = shiftType?.startTime || '09:00';
    const defaultEndTime = shiftType?.endTime || '17:00';
    
    // Setze die Standard-Zeiten wenn die Schicht keine oder ungültige Zeiten hat
    const shiftWithDefaults = {
      ...shift,
      startTime: shift.startTime && shift.startTime !== '' ? shift.startTime : defaultStartTime,
      endTime: shift.endTime && shift.endTime !== '' ? shift.endTime : defaultEndTime
    };
    
    setEditShiftDialog({ open: true, shift: shiftWithDefaults });
  };

  const handleUpdateShift = async (updatedShift: any) => {
    try {
      // Nur die Felder senden, die aktualisiert werden können
      const updateData = {
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        notes: updatedShift.notes
      };
      await dispatch(updateShift({ id: parseInt(updatedShift.id), data: updateData })).unwrap();
  dispatch(fetchShifts({}));
      setEditShiftDialog({ open: false, shift: null });
      setSnackbar({ open: true, message: 'Schicht erfolgreich aktualisiert', severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Schicht:', error);
      setSnackbar({ open: true, message: 'Fehler beim Aktualisieren der Schicht', severity: 'error' });
    }
  };

  const handleCellClick = (employeeId: number, date: Date) => {
    setBulkCreateDialog({
      open: true,
      employeeId,
      date: format(date, 'yyyy-MM-dd')
    });
  };

  const getShiftEmployeeId = useCallback((shift: any) => (shift.employeeId || shift.employee_id)?.toString?.() || '', []);
  const getShiftTypeId = useCallback((shift: any) => (shift.shiftTypeId || shift.shift_type_id)?.toString?.() || '', []);
  const getShiftOrgId = useCallback((shift: any) => {
    const raw = shift.organizationUnitId ?? shift.organizationId ?? shift.organization_id ?? shift.orgId ?? shift.unitId;
    return raw?.toString?.() || '';
  }, []);
  const getShiftStartTime = useCallback((shift: any) => (shift.startTime || shift.start_time || '09:00').toString(), []);
  const getShiftEndTime = useCallback((shift: any) => (shift.endTime || shift.end_time || '17:00').toString(), []);
  const getShiftDateKey = useCallback((shift: any) => format(new Date(shift.date), 'yyyy-MM-dd'), []);
  const buildDuplicateKey = useCallback((params: {
    employeeId: string;
    date: string;
    shiftTypeId: string;
    startTime: string;
    endTime: string;
    organizationId: string;
  }) => {
    return [params.employeeId, params.date, params.shiftTypeId, params.startTime, params.endTime, params.organizationId].join('|');
  }, []);

  const weekCopyPreview = useMemo(() => {
    if (!weekDays || weekDays.length === 0) {
      return {
        currentWeekShifts: [] as any[],
        targetWeekExistingShifts: [] as any[],
        shiftsToCreate: [] as any[],
        duplicatesFound: 0,
        targetDailyCounts: [] as { date: Date; count: number }[],
        targetStart: null as Date | null,
        targetEnd: null as Date | null
      };
    }

    const startDay = weekDays[0];
    const endDay = weekDays[weekDays.length - 1];
    const targetStart = addDays(startDay, 7);
    const targetEnd = addDays(endDay, 7);
    const selectedOrgId = selectedOrganization?.id?.toString?.() || '';

    const isInRange = (value: Date, start: Date, end: Date) => value >= start && value <= end;
    const isShiftInSelectedOrg = (shift: any) => {
      if (!selectedOrgId) return true;
      return getShiftOrgId(shift) === selectedOrgId;
    };

    const currentWeekShifts = shifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      return isInRange(shiftDate, startDay, endDay) && isShiftInSelectedOrg(shift);
    });

    const targetWeekExistingShifts = shifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      return isInRange(shiftDate, targetStart, targetEnd) && isShiftInSelectedOrg(shift);
    });

    const existingKeySet = new Set<string>();
    targetWeekExistingShifts.forEach((shift: any) => {
      existingKeySet.add(buildDuplicateKey({
        employeeId: getShiftEmployeeId(shift),
        date: getShiftDateKey(shift),
        shiftTypeId: getShiftTypeId(shift),
        startTime: getShiftStartTime(shift),
        endTime: getShiftEndTime(shift),
        organizationId: getShiftOrgId(shift)
      }));
    });

    let duplicatesFound = 0;
    const shiftsToCreate: any[] = [];
    currentWeekShifts.forEach((shift: any) => {
      const sourceDate = new Date(shift.date);
      const targetDate = addDays(sourceDate, 7);
      const employeeId = getShiftEmployeeId(shift);
      const shiftTypeId = getShiftTypeId(shift);
      const startTime = getShiftStartTime(shift);
      const endTime = getShiftEndTime(shift);
      const targetEmployee = employees.find((employee: any) => employee.id?.toString?.() === employeeId);
      const fallbackOrgId = targetEmployee?.organizationId?.toString?.() || getShiftOrgId(shift);
      const organizationId = selectedOrgId || fallbackOrgId;
      const targetDateKey = format(targetDate, 'yyyy-MM-dd');

      if (!organizationId) return;

      const duplicateKey = buildDuplicateKey({
        employeeId,
        date: targetDateKey,
        shiftTypeId,
        startTime,
        endTime,
        organizationId
      });

      if (existingKeySet.has(duplicateKey)) {
        duplicatesFound += 1;
        return;
      }

      shiftsToCreate.push({
        shiftTypeId,
        employeeId,
        date: targetDateKey,
        startTime,
        endTime,
        notes: shift.notes,
        organizationUnitId: organizationId
      });
      existingKeySet.add(duplicateKey);
    });

    const targetDailyCounts = weekDays.map((day) => {
      const targetDay = addDays(day, 7);
      const count = targetWeekExistingShifts.filter((shift: any) => isSameDay(new Date(shift.date), targetDay)).length;
      return { date: targetDay, count };
    });

    return {
      currentWeekShifts,
      targetWeekExistingShifts,
      shiftsToCreate,
      duplicatesFound,
      targetDailyCounts,
      targetStart,
      targetEnd
    };
  }, [
    weekDays,
    shifts,
    selectedOrganization?.id,
    employees,
    buildDuplicateKey,
    getShiftDateKey,
    getShiftEmployeeId,
    getShiftEndTime,
    getShiftOrgId,
    getShiftStartTime,
    getShiftTypeId
  ]);

  const handleCopyWeek = async () => {
    if (isCopyingWeek) return;
    setIsCopyingWeek(true);
    try {
      // Guard: keine Woche berechnet
      if (!weekDays || weekDays.length === 0) {
        setSnackbar({ open: true, message: 'Keine Woche ausgewählt', severity: 'error' });
        setIsCopyingWeek(false);
        return;
      }

      if (weekCopyPreview.currentWeekShifts.length === 0) {
        setSnackbar({ open: true, message: 'Keine Schichten in der aktuellen Woche gefunden.', severity: 'error' });
        setWeekCopyDialog({ open: false });
        return;
      }

      const invalidEntries = weekCopyPreview.currentWeekShifts.length - weekCopyPreview.shiftsToCreate.length - weekCopyPreview.duplicatesFound;
      if (invalidEntries > 0) {
        setSnackbar({ open: true, message: `${invalidEntries} Schicht(en) ohne Organisation konnten nicht kopiert werden.`, severity: 'error' });
        return;
      }

      if (weekCopyPreview.shiftsToCreate.length === 0) {
        setWeekCopyDialog({ open: false });
        setSnackbar({ open: true, message: 'Alle Schichten existieren bereits in der Zielwoche. Keine neuen Schichten erstellt.', severity: 'error' });
        return;
      }

      await Promise.all(
        weekCopyPreview.shiftsToCreate.map((newShiftData) => dispatch(createShift(newShiftData)).unwrap())
      );
      
      dispatch(fetchShifts({}));
      if (weekCopyPreview.targetStart) {
        setSlideDirection('left');
        setSlideKey(k => k + 1);
        dispatch(setWeekDate(weekCopyPreview.targetStart.toISOString()));
        triggerWeekRangeHighlight();
      }
      setWeekCopyDialog({ open: false });

      let message = `${weekCopyPreview.shiftsToCreate.length} Schicht(en) in die Zielwoche kopiert.`;
      if (weekCopyPreview.duplicatesFound > 0) {
        message += ` ${weekCopyPreview.duplicatesFound} Duplikat(e) wurden übersprungen.`;
      }
      setSnackbar({ open: true, message, severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Kopieren der Woche:', error);
      setSnackbar({ open: true, message: 'Fehler beim Kopieren der Woche', severity: 'error' });
    } finally {
      setIsCopyingWeek(false);
    }
  };

  const selectedOrgId = selectedOrganization?.id?.toString?.() || '';

  const baseEmployees = useMemo(() => {
    return (selectedOrganization
      ? employees.filter((emp: any) => emp.organizationId === selectedOrganization.id)
      : employees).filter((emp: any) => weekDays.some(day => isEmployeeActiveOnDate(emp, day)));
  }, [employees, selectedOrganization, weekDays]);

  const visibleEmployeeIdsForOrg = useMemo(() => {
    const map = settings?.ui?.employeeVisibilityByOrg || {};
    return selectedOrgId && Array.isArray(map[selectedOrgId]) ? map[selectedOrgId] : null;
  }, [selectedOrgId, settings?.ui?.employeeVisibilityByOrg]);

  // Filter employees by selected organization and explicit visibility selection
  const filteredEmployees = useMemo(() => {
    if (!visibleEmployeeIdsForOrg) return baseEmployees;
    const visibleSet = new Set(visibleEmployeeIdsForOrg);
    return baseEmployees.filter((emp: any) => visibleSet.has(emp.id?.toString?.() || ''));
  }, [baseEmployees, visibleEmployeeIdsForOrg]);

  // Stable key for current employees list (ids), avoids re-init on referential changes
  const employeesIdsKey = useMemo(() => {
    try {
      return (filteredEmployees || []).map((e: any) => e.id?.toString?.() || '').join(',');
    } catch { return ''; }
  }, [filteredEmployees]);

  // Compute sorted employees based on settings (alphabetical vs custom mapping)
  const sortedEmployees = useMemo(() => {
    const list = [...(filteredEmployees || [])];
    const mode = settings?.ui?.employeeOrderMode || 'alphabetical';
    const orgId = selectedOrganization?.id?.toString?.();
    const map = (settings?.ui?.employeeOrderByOrg || {});
    const order = (orgId && map[orgId]) ? map[orgId] : [];
    if (mode !== 'custom' || !orgId || !Array.isArray(order) || order.length === 0) {
      return list.sort((a: any, b: any) => {
        const an = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bn = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return an.localeCompare(bn, 'de');
      });
    }
    const indexOf = (id: string) => {
      const i = order.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return list.sort((a: any, b: any) => {
      const ai = indexOf(a.id?.toString?.() || '');
      const bi = indexOf(b.id?.toString?.() || '');
      if (ai !== bi) return ai - bi;
      // Stable fallback alphabetical for items not in order
      const an = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
      const bn = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
      return an.localeCompare(bn, 'de');
    });
  }, [filteredEmployees, settings?.ui?.employeeOrderMode, settings?.ui?.employeeOrderByOrg, selectedOrganization?.id]);

  // Rows to render: while reordering use draft mapping; otherwise use sorted list
  const renderEmployees = useMemo(() => {
    if (isReorderMode) {
      const mapById = new Map((filteredEmployees || []).map((e: any) => [e.id?.toString?.() || '', e] as const));
      return draftEmployeeOrder.map(id => mapById.get(id)).filter(Boolean) as any[];
    }
    return sortedEmployees;
  }, [isReorderMode, draftEmployeeOrder, filteredEmployees, sortedEmployees]);

  // Initialize draft order when entering reorder mode or when org/employees change
  useEffect(() => {
    if (!isReorderMode) return;
    const orgId = selectedOrganization?.id?.toString?.();
    const map = settings?.ui?.employeeOrderByOrg || {};
    const configured = (orgId && Array.isArray(map[orgId]) ? map[orgId] : []) as string[];
    const present = new Set((filteredEmployees || []).map((e: any) => e.id?.toString?.() || ''));
    // Keep only present ids from configured order
    const base = configured.filter(id => present.has(id));
    // Append missing employees alphabetisch
    const missing = (filteredEmployees || [])
      .filter((e: any) => !base.includes(e.id?.toString?.() || ''))
      .sort((a: any, b: any) => (`${a.firstName || ''} ${a.lastName || ''}`).localeCompare(`${b.firstName || ''} ${b.lastName || ''}`, 'de'))
      .map((e: any) => e.id?.toString?.() || '');
    const next = [...base, ...missing];
    // Only initialize/adjust if draft is empty or mismatched by ids set/length
    const sameLength = draftEmployeeOrder.length === next.length;
    const sameOrder = sameLength && draftEmployeeOrder.every((id, i) => id === next[i]);
    if (!sameOrder) {
      setDraftEmployeeOrder(next);
    }
  }, [isReorderMode, selectedOrganization?.id, employeesIdsKey, settings?.ui?.employeeOrderByOrg]);

  // Drag handlers for row reordering (native HTML5 drag within the left column)
  const dragFromIndex = useRef<number | null>(null);
  const handleRowDragStart = (index: number) => (e: React.DragEvent) => {
    dragFromIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Set dummy data for some browsers to enable drop
    try { e.dataTransfer.setData('text/plain', String(index)); } catch {}
  };
  const handleRowDragOver = (_index: number) => (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleRowDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReorderMode) return;
    const from = dragFromIndex.current;
    dragFromIndex.current = null;
    if (from == null || from === toIndex) return;
    setDraftEmployeeOrder(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  const persistCustomOrder = () => {
    try {
      const orgId = selectedOrganization?.id?.toString?.();
      if (!orgId) return;
      const ui = settings?.ui || {} as any;
      const map = { ...(ui.employeeOrderByOrg || {}) } as Record<string, string[]>;
      map[orgId] = draftEmployeeOrder;
      updateSettings({
        ...settings,
        ui: {
          ...ui,
          employeeOrderMode: 'custom',
          employeeOrderByOrg: map
        }
      });
      setIsReorderMode(false);
      setSnackbar({ open: true, message: 'Reihenfolge gespeichert', severity: 'success' });
    } catch (e) {
      console.error('Persist order failed', e);
      setSnackbar({ open: true, message: 'Fehler beim Speichern der Reihenfolge', severity: 'error' });
    }
  };
  const cancelReorder = () => {
    setIsReorderMode(false);
  };

  const openEmployeeSelectionDialog = useCallback(() => {
    const initialIds = visibleEmployeeIdsForOrg || baseEmployees.map((employee: any) => employee.id?.toString?.() || '');
    setDraftVisibleEmployeeIds(initialIds);
    setEmployeeSelectionDialogOpen(true);
  }, [baseEmployees, visibleEmployeeIdsForOrg]);

  const toggleDraftEmployeeVisibility = useCallback((employeeId: string) => {
    setDraftVisibleEmployeeIds((prev) => prev.includes(employeeId)
      ? prev.filter((id) => id !== employeeId)
      : [...prev, employeeId]);
  }, []);

  const persistEmployeeVisibility = useCallback(() => {
    try {
      if (!selectedOrgId) {
        setEmployeeSelectionDialogOpen(false);
        return;
      }

      const allEmployeeIds = baseEmployees.map((employee: any) => employee.id?.toString?.() || '');
      const nextMap = { ...(settings?.ui?.employeeVisibilityByOrg || {}) } as Record<string, string[]>;
      const normalizedDraft = allEmployeeIds.filter((id: string) => draftVisibleEmployeeIds.includes(id));

      if (normalizedDraft.length === allEmployeeIds.length) {
        delete nextMap[selectedOrgId];
      } else {
        nextMap[selectedOrgId] = normalizedDraft;
      }

      updateSettings({
        ...settings,
        ui: {
          ...settings.ui,
          employeeVisibilityByOrg: nextMap
        }
      });
      setEmployeeSelectionDialogOpen(false);
      setSnackbar({ open: true, message: 'Mitarbeiterauswahl gespeichert', severity: 'success' });
    } catch (error) {
      console.error('Persist employee visibility failed', error);
      setSnackbar({ open: true, message: 'Fehler beim Speichern der Mitarbeiterauswahl', severity: 'error' });
    }
  }, [baseEmployees, draftVisibleEmployeeIds, selectedOrgId, settings, updateSettings]);

  return (
    <Box sx={{ px: 3, pt: 3, pb: 0, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4" component="h1">
            Wochenansicht
          </Typography>
          <IconButton
            size="small"
            onClick={toggleShortcuts}
            aria-label="Tastenkürzel anzeigen"
            sx={{ ml: 0.5 }}
          >
            <InfoOutlined fontSize="small" />
          </IconButton>
          <Popover
            open={shortcutsOpen}
            anchorEl={shortcutsAnchor}
            onClose={() => setShortcutsOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            disableRestoreFocus
            disableScrollLock
            PaperProps={{ sx: { pointerEvents: 'auto' } }}
          >
            <Box sx={{ p: 1.5, maxWidth: 360 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Tastenkürzel</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1 }}>
                <Chip size="small" label="← →" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                <Typography variant="caption">Woche wechseln</Typography>
                <Chip size="small" label="Home" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                <Typography variant="caption">Heute</Typography>
                <Chip size="small" label="Esc" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                <Typography variant="caption">Dialoge schließen</Typography>
                <Chip size="small" label="Strg + Ziehen" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                <Typography variant="caption">Schicht kopieren</Typography>
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 'bold' }}>Hinweise</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                • Schichtarten per Drag & Drop auf eine Mitarbeiter-Zelle ziehen, um eine Schicht anzulegen.<br/>
                • Bestehende Schicht mit gedrückter Strg-Taste ziehen, um sie zu kopieren (ohne Strg = verschieben).<br/>
                • Flexible Schichten fragen beim Ablegen nach Start-/Endzeit.<br/>
                • Konflikte (z. B. doppelte reguläre Schichten) werden erkannt und können ggf. überschrieben werden.
              </Typography>
            </Box>
          </Popover>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Sorting controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Sichtbare Mitarbeiter auswählen">
              <IconButton
                onClick={openEmployeeSelectionDialog}
                color={visibleEmployeeIdsForOrg ? 'primary' : 'default'}
                size="small"
              >
                <GroupIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {baseEmployees.length > 0 && (
              <Chip
                size="small"
                label={`${filteredEmployees.length}/${baseEmployees.length} Mitarbeiter`}
                color={visibleEmployeeIdsForOrg ? 'primary' : 'default'}
                variant={visibleEmployeeIdsForOrg ? 'filled' : 'outlined'}
              />
            )}
            <Tooltip title={isReorderMode ? 'Reihenfolge beenden' : 'Reihenfolge bearbeiten'}>
              <IconButton
                onClick={() => setIsReorderMode(v => !v)}
                color={isReorderMode ? 'warning' : 'default'}
                size="small"
              >
                <ReorderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {settings?.ui?.employeeOrderMode === 'custom' && !isReorderMode && (
              <Chip size="small" label="Eigene Reihenfolge aktiv" color="info" />
            )}
            {isReorderMode && (
              <>
                <Button
                  variant="text"
                  onClick={() => {
                    const ui = settings?.ui || ({} as any);
                    updateSettings({ ...settings, ui: { ...ui, employeeOrderMode: 'alphabetical' } });
                  }}
                  disabled={(settings?.ui?.employeeOrderMode || 'alphabetical') === 'alphabetical'}
                >
                  Alphabetisch
                </Button>
                <Button variant="outlined" onClick={cancelReorder}>Abbrechen</Button>
                <Button variant="contained" onClick={persistCustomOrder}>Speichern</Button>
              </>
            )}
          </Box>
          <Tooltip title="Woche kopieren">
            <IconButton onClick={() => setWeekCopyDialog({ open: true })} color="primary" size="small">
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button 
            variant="contained"
            onClick={handleExcelWeekExport}
            sx={{
              background: 'linear-gradient(90deg,#4CAF50,#81C784)',
              color: '#fff',
              fontWeight: 'bold',
              textTransform: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              '&:hover': {
                background: 'linear-gradient(90deg,#43A047,#66BB6A)'
              }
            }}
          >
            Wochenexport (Excel)
          </Button>

          {/* Templates menu/actions */}
          <TemplateActions
            weekDays={weekDays}
            employees={sortedEmployees}
            selectedOrganization={selectedOrganization}
            getShifts={getShiftsForEmployeeAndDay}
          />
        </Box>
      </Box>

      {/* Schichttypen zum Ziehen */}
      <Box sx={{ mb: 3 }}>
        {/* Compact: Shift type chips directly, no heading */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {shiftTypes.map((shiftType: any) => (
            <Chip
              key={shiftType.id}
              label={renderShiftTypeLabel(shiftType)}
              title={renderShiftTypeLabel(shiftType)}
              sx={(theme) => ({
                backgroundColor: shiftType.color,
                color: theme.palette.getContrastText(shiftType.color),
                fontWeight: 600,
                px: 1,
                py: 0.25,
                cursor: 'grab',
                '&:hover': {},
                '&:active': { cursor: 'grabbing' }
              })}
              size="small"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('shiftType', JSON.stringify(shiftType));
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Organisation + compact navigation */}
      {selectedOrganization && (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label={`Organisation: ${selectedOrganization.name}`}
            color="primary"
            variant="filled"
            sx={{
              fontWeight: 600,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 0 0 2px rgba(255,255,255,0.08) inset' : '0 0 0 2px rgba(0,0,0,0.06) inset'
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              border: '2px solid',
              borderColor: isWeekRangeHighlighted ? 'primary.main' : 'transparent',
              transition: 'background-color 220ms ease, box-shadow 220ms ease',
              backgroundColor: isWeekRangeHighlighted ? 'primary.50' : 'transparent',
              boxShadow: isWeekRangeHighlighted ? 2 : 'none'
            }}
          >
            <IconButton onClick={handlePrevWeek} size="small"><ChevronLeft /></IconButton>
            <Typography variant="subtitle1" sx={{ minWidth: 200, textAlign: 'center' }}>
              {weekDays.length > 0 ? (
                `${format(weekDays[0], 'dd.MM.yyyy', { locale: de })} - ${format(weekDays[weekDays.length - 1], 'dd.MM.yyyy', { locale: de })}`
              ) : (
                format(currentDate, 'dd.MM.yyyy', { locale: de })
              )}
            </Typography>
            <IconButton onClick={handleNextWeek} size="small"><ChevronRight /></IconButton>
            <Button variant="outlined" size="small" onClick={handleToday}>Heute</Button>
          </Box>
        </Box>
      )}

      {/* Wochenansicht-Grid */}
      <TableContainer 
        component={Paper} 
        ref={tableRef}
        sx={{ 
          height: tableHeight || undefined,
          maxHeight: tableHeight ? undefined : 'calc(100dvh - 300px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          // avoid causing an extra outer scrollbar by ensuring inner scroll only when needed
          scrollbarGutter: 'stable',
          '@keyframes slideInFromRight': {
            '0%': { opacity: 0.3, transform: 'translateX(60px)' },
            '100%': { opacity: 1, transform: 'translateX(0)' }
          },
          '@keyframes slideInFromLeft': {
            '0%': { opacity: 0.3, transform: 'translateX(-60px)' },
            '100%': { opacity: 1, transform: 'translateX(0)' }
          }
        }}
      >
        <Box
          key={slideKey}
          sx={{
            animation: slideAnimationEnabled
              ? slideDirection === 'left'
                ? 'slideInFromRight 280ms ease-out'
                : slideDirection === 'right'
                  ? 'slideInFromLeft 280ms ease-out'
                  : 'none'
              : 'none'
          }}
        >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold', borderRight: '1px solid', borderRightColor: 'divider', backgroundColor: 'background.paper', zIndex: 3 }}>
                Mitarbeiter
              </TableCell>
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const holiday = isHoliday(day, holidays);
                const vacation = isVacationDay(day);
                const isLast = index === weekDays.length - 1;
                // Hinweis: holiday/vacation werden direkt für Styling/Tooltips genutzt; Öffnungszeiten werden komprimiert angezeigt
                
                return (
                  <TableCell 
                    key={index} 
                    align="center"
                    sx={{ 
                      minWidth: 120,
                      fontWeight: 'bold',
                      backgroundColor: isToday ? 'primary.main' 
                        : vacation ? 'warning.50' 
                        : holiday ? 'error.50' 
                        : 'background.paper',
                      color: isToday ? 'primary.contrastText' 
                        : vacation ? 'warning.main' 
                        : holiday ? 'error.main' 
                        : 'text.primary',
                      borderLeft: isToday ? '2px solid' : vacation ? '4px solid' : 'none',
                      borderLeftColor: isToday ? 'primary.main' : vacation ? 'warning.main' : 'inherit',
                      borderRight: isToday ? '2px solid' : isLast ? 'none' : '1px solid',
                      borderRightColor: isToday ? 'primary.main' : 'divider',
                      zIndex: 3
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {`${format(day, 'EEE', { locale: de }).replace(/\.$/, '')} ${format(day, 'dd.MM')}`}
                      </Typography>
                      {selectedOrganization?.openingHours?.enabled && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                          {formatOpeningHours(getOpeningHoursForDay(selectedOrganization.openingHours, day))}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
              {/* Summary column for weekly working time */}
              <TableCell 
                align="center" 
                sx={{ 
                  minWidth: 170, 
                  fontWeight: 'bold',
                  borderLeft: '3px solid',
                  borderLeftColor: 'divider'
                }}
              >
                Woche (Std)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderEmployees.map((employee: any, rowIndex: number) => (
              <TableRow 
                key={employee.id}
                draggable={isReorderMode}
                onDragStart={handleRowDragStart(rowIndex)}
                onDragOver={handleRowDragOver(rowIndex)}
                onDrop={handleRowDrop(rowIndex)}
              >
                <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid', borderRightColor: 'divider', cursor: isReorderMode ? 'move' : 'default' }}>
                  <Box display="flex" alignItems="center" gap={1} sx={{ '&:hover .employee-week-delete': { opacity: 1, pointerEvents: 'auto' } }}>
                    {isReorderMode && (
                      <DragIndicator fontSize="small" color="action" />
                    )}
                    <Avatar 
                      src={(employee.photoPath ? (window as any)?.electronAPI?.toFileUrl?.(employee.photoPath) : employee.photoUrl) || undefined}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {(employee.photoPath || employee.photoUrl) ? null : <PersonIcon fontSize="small" />}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {employee.firstName} {employee.lastName}
                        </Typography>
                        <Tooltip title="Wochenschichten dieses Mitarbeiters löschen">
                          <span>
                            <IconButton
                              className="employee-week-delete"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteEmployeeWeekDialog(employee);
                              }}
                              disabled={deletingEmployeeWeekId === employee.id?.toString?.()}
                              sx={{
                                width: 20,
                                height: 20,
                                opacity: 0,
                                pointerEvents: 'none',
                                transition: 'opacity 120ms ease',
                                color: 'error.main'
                              }}
                            >
                              <DeleteSweepIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {employee.position || 'Mitarbeiter'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                {weekDays.map((day, dayIndex) => {
                  const employeeShifts = getShiftsForEmployeeAndDay(employee.id, day);
                  const isEmployeeActiveForDay = isEmployeeActiveOnDate(employee, day);
                  const employeeInactiveReason = isEmployeeActiveForDay ? null : getEmployeeInactiveReason(employee, day);
                  const visibleEmployeeShifts = isEmployeeActiveForDay ? employeeShifts : [];
                  const plannedMinutes = getEmployeePlannedMinutes(employee, day);
                  const isPlannedFreeDay = isEmployeeActiveForDay && plannedMinutes === 0;
                  const isToday = isSameDay(day, new Date());
                  const vacation = isVacationDay(day);
                  const vacationBlocksScheduling = !!vacation?.affectsScheduling;
                  const isLast = dayIndex === weekDays.length - 1;
                  
                  return (
                    <TableCell 
                      key={dayIndex}
                      sx={{ 
                        padding: 1,
                        verticalAlign: 'top',
                        height: 80,
                        position: 'relative',
                        backgroundColor: !isEmployeeActiveForDay
                          ? 'action.disabledBackground'
                          : vacation
                            ? 'warning.50'
                            : isPlannedFreeDay
                              ? 'grey.100'
                              : isToday
                                ? 'action.selected'
                                : 'inherit',
                        borderLeft: isToday ? '2px solid' : vacation ? '4px solid' : isPlannedFreeDay ? '4px solid' : 'none',
                        borderLeftColor: isToday ? 'primary.main' : vacation ? 'warning.main' : isPlannedFreeDay ? 'grey.400' : 'inherit',
                        borderRight: isToday ? '2px solid' : isLast ? 'none' : '1px solid',
                        borderRightColor: isToday ? 'primary.main' : 'divider',
                        '&:hover': {
                          backgroundColor: !isEmployeeActiveForDay
                            ? 'action.disabledBackground'
                            : vacation
                              ? 'warning.100'
                              : isPlannedFreeDay
                                ? 'grey.200'
                                : isToday
                                  ? 'action.focus'
                                  : 'action.hover'
                        },
                        opacity: !isEmployeeActiveForDay ? 0.7 : vacation ? 0.8 : isPlannedFreeDay ? 0.92 : 1,
                        cursor: isEmployeeActiveForDay ? 'pointer' : 'not-allowed'
                      }}
                      onDrop={isReorderMode || !isEmployeeActiveForDay ? undefined : (e) => {
                        e.preventDefault();
                        // During Schließzeit: only block if it affects scheduling, but allow all-day absences and all-day shift types
                        if (vacationBlocksScheduling) {
                          const shiftTypeData = e.dataTransfer.getData('shiftType');
                          if (shiftTypeData) {
                            try {
                              const shiftType = JSON.parse(shiftTypeData);
                              const isAllDayType = !!shiftType?.isAllDay || (shiftType?.category === 'absence');
                              if (!isAllDayType) return; // block non-all-day/non-absence
                            } catch { return; }
                          } else {
                            // If not creating a new shift (copy/move existing), inspect the existing shift type
                            const moveShiftData = e.dataTransfer.getData('existingShift');
                            const copyData = e.dataTransfer.getData('copyShift');
                            const payload = moveShiftData || copyData;
                            if (payload) {
                              try {
                                const { id } = JSON.parse(payload);
                                const src = shifts.find((s: any) => s.id?.toString() === String(id));
                                if (src) {
                                  const linkedType = shiftTypes.find((st: any) => st.id?.toString?.() === (src.shiftTypeId || src.shift_type_id)?.toString?.());
                                  const isAllDayType = !!linkedType?.isAllDay || (linkedType?.category === 'absence');
                                  if (!isAllDayType) return; // block moving/copying non-all-day into blocking Schließzeit
                                }
                              } catch { return; }
                            } else {
                              return; // nothing to drop
                            }
                          }
                        }
                        const copyData = e.dataTransfer.getData('copyShift');
                        if (copyData) {
                          const src = JSON.parse(copyData);
                          const srcShift = shifts.find((s: any) => s.id?.toString() === src.id?.toString());
                          if (srcShift) {
                            handleCopyExistingShift(srcShift, employee.id, day);
                          }
                          return;
                        }
                        const moveShiftData = e.dataTransfer.getData('existingShift');
                        if (moveShiftData) {
                          const { id: moveId } = JSON.parse(moveShiftData);
                          handleMoveShift(moveId, employee.id, day);
                          return;
                        }
                        const shiftTypeData = e.dataTransfer.getData('shiftType');
                        if (shiftTypeData) {
                          const shiftType = JSON.parse(shiftTypeData);
                          handleShiftDrop(shiftType, employee.id, day);
                        }
                      }}
                      onDragOver={isReorderMode || !isEmployeeActiveForDay ? undefined : (e) => {
                        e.preventDefault();
                      }}
                      onClick={async () => {
                        // Allow clicks during Schließzeit if it does not affect scheduling
                        if (isReorderMode) return;
                        if (!isEmployeeActiveForDay) return;
                        if (vacation && vacationBlocksScheduling) return;
                        if (copyBuffer) {
                          await handleCopyExistingShift(copyBuffer, employee.id, day);
                          setCopyBuffer(null);
                          return;
                        }
                        handleCellClick(employee.id, day);
                      }}
                    >
                      <Box sx={{ minHeight: 60 }}>
                        {!isEmployeeActiveForDay && employeeInactiveReason && (
                          <Card
                            sx={{
                              mb: 0.5,
                              backgroundColor: 'action.disabled',
                              color: 'text.secondary',
                              textAlign: 'center'
                            }}
                          >
                            <CardContent sx={{ p: 0.25, '&:last-child': { pb: 0.25 } }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                {employeeInactiveReason}
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                        {vacation && (
                          <Card
                            sx={{
                              mb: 0.5,
                              backgroundColor: 'warning.main',
                              color: 'white',
                              textAlign: 'center'
                            }}
                          >
                            <CardContent sx={{ p: 0.25, '&:last-child': { pb: 0.25 } }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
                                SCHLIESSZEIT
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                        {isPlannedFreeDay && (
                          <Card
                            sx={{
                              mb: 0.5,
                              backgroundColor: 'grey.300',
                              color: 'text.primary',
                              textAlign: 'center',
                              border: '1px dashed',
                              borderColor: 'grey.500'
                            }}
                          >
                            <CardContent sx={{ p: 0.25, '&:last-child': { pb: 0.25 } }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', letterSpacing: 0.4 }}>
                                FREI
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                        
                        {visibleEmployeeShifts.map((shift: any) => (
                          // Tooltip with detailed time info
                          <Tooltip
                            key={`tt-${shift.id}`}
                            title={(() => {
                              const linkedType = shiftTypes.find((st: any) => st.id?.toString?.() === (shift.shiftTypeId || shift.shift_type_id)?.toString?.());
                              const isAllDay = (shift.shiftTypeIsAllDay === true) || (linkedType?.isAllDay === true);
                              const isAbs = (shift.shiftTypeCategory || shift.category) === 'absence' || linkedType?.category === 'absence' || isAllDay;
                              const nonCounting = (shift.shiftTypeCountsTowardHours === false) || isAbs || isAllDay || (linkedType?.countsTowardHours === false);
                              const sStr = shift.startTime || shift.start_time;
                              const eStr = shift.endTime || shift.end_time;
                              const gross = durationWithMidnight(sStr, eStr);
                              const net = applyBreaks(gross);
                              const grossStr = minutesToHM(gross);
                              const netStr = minutesToHM(net);
                              const breakMin = Math.max(0, gross - net);
                              if (isAbs) {
                                // Urlaub/Krankheit: nie "zählt nicht" anzeigen; ganztägig reicht
                                const name = shift.shiftTypeName || 'Abwesenheit';
                                return `${name} (ganztägig)`;
                              }
                              const base = isAllDay
                                ? `${shift.shiftTypeName || 'Schicht'} (ganztägig)`
                                : `${shift.shiftTypeName || 'Schicht'} ${sStr || ''} - ${endDisplayWithMidnight(sStr, eStr)}`;
                              if (nonCounting) return `${base} · zählt nicht zur Arbeitszeit`;
                              if (isAllDay) return base; // no times/details for all-day
                              return `${base}\nBrutto: ${grossStr} · Pause: ${breakMin} Min · Netto: ${netStr}`;
                            })()}
                            arrow
                            placement="top"
                            slotProps={{
                              tooltip: {
                                sx: (theme: Theme) => ({
                                  ...(theme.palette.mode === 'dark' && {
                                    color: 'black',
                                    backgroundColor: 'rgba(255,255,255,0.95)'
                                  })
                                })
                              },
                              arrow: {
                                sx: (theme: Theme) => ({
                                  ...(theme.palette.mode === 'dark' && {
                                    color: 'rgba(255,255,255,0.95)'
                                  })
                                })
                              }
                            }}
                          >
                          <Card 
                            key={shift.id}
                            elevation={0}
                            sx={(theme: Theme) => ({ 
                              mb: 0.5, 
                              cursor: 'grab',
                              minHeight: 24,
                              position: 'relative',
                              overflow: 'visible',
                              width: '100%',
                              boxSizing: 'border-box',
                              backgroundColor: shift.shiftTypeColor || '#ccc',
                              color: theme.palette.getContrastText(shift.shiftTypeColor || '#ccc'),
                              borderRadius: 8,
                              border: '2px solid transparent',
                              boxShadow: 'none',
                              backdropFilter: 'none',
                              WebkitBackdropFilter: 'none',
                              backgroundImage: 'none',
                              transition: 'none !important',
                              transform: 'none',
                              '&&:hover': { 
                                backgroundColor: shift.shiftTypeColor || '#ccc',
                                border: '2px solid transparent',
                                backgroundImage: 'none',
                                boxShadow: 'none !important',
                                transform: 'none !important',
                                filter: 'none !important',
                                backdropFilter: 'none !important',
                                WebkitBackdropFilter: 'none !important',
                                transition: 'none !important',
                                '& .delete-button': { display: 'flex' }
                              }
                            })}
                            draggable
                            onDragStart={(e) => {
                              // Hold Ctrl to copy instead of move
                              const payload = JSON.stringify({ id: shift.id });
                              if ((e.ctrlKey || e.metaKey)) {
                                e.dataTransfer.setData('copyShift', payload);
                              } else {
                                e.dataTransfer.setData('existingShift', payload);
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditShift(shift);
                            }}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              {(() => {
                                  const linkedType = shiftTypes.find((st: any) => st.id?.toString?.() === (shift.shiftTypeId || shift.shift_type_id)?.toString?.());
                                  const isAbs = shift.shiftTypeCategory === 'absence' || linkedType?.category === 'absence';
                                  if (isAbs) return `🏖️ ${shift.shiftTypeName || 'Abwesenheit'}`;
                                  const isAllDay = !!shift.shiftTypeIsAllDay || linkedType?.isAllDay === true;
                                  const name = shift.shiftTypeName || 'Schicht';
                                  const startStr = shift.startTime || '';
                                  const endStrRaw = shift.endTime || '';
                                  const gross = durationWithMidnight(startStr, endStrRaw);
                                  const net = applyBreaks(gross);
                                  const breakMin = Math.max(0, gross - net);
                                  const endStr = endDisplayWithMidnight(startStr, endStrRaw);
                                  const hasTimes = !!startStr && !!endStr && gross > 0;

                                  if (isAllDay) {
                                    // Nur Name anzeigen; Details (ganztägig, zählt nicht) bleiben im Tooltip
                                    return (
                                      <Box sx={{ display: 'flex', flexDirection: 'column', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.1 }}>
                                        <span style={{ fontWeight: 700 }}>{name}</span>
                                      </Box>
                                    );
                                  }

                                  // Drei Zeilen: Name, Zeiten, Pause
                                  return (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1 }}>
                                      <span style={{ fontWeight: 700 }}>
                                        {name}
                                        {((shift.shiftTypeCountsTowardHours === false) || (linkedType?.countsTowardHours === false)) && !isAllDay && !isAbs ? ' · zählt nicht' : ''}
                                      </span>
                                      {hasTimes && (
                                        <span style={{ fontSize: '0.7em', opacity: 0.95 }}>
                                          {startStr} - {endStr}
                                        </span>
                                      )}
                                      {hasTimes && (
                                        <span style={{ fontSize: '0.65em', opacity: 0.95 }}>
                                          Pause: {breakMin} Min
                                        </span>
                                      )}
                                    </Box>
                                  );
                                })()}
                              {/* Copy + Delete Buttons */}
                              <IconButton
                                className="delete-button"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 28,
                                  width: 22,
                                  height: 22,
                                  display: 'none',
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'primary.dark' },
                                  minWidth: 'unset',
                                  borderRadius: '50%',
                                  p: 0,
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Schicht kopieren (Strg+Ziehen geht auch)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCopyBuffer(shift);
                                  setSnackbar({ open: true, message: 'Kopiermodus aktiv: Klicken Sie nun in eine Zielzelle', severity: 'success' });
                                }}
                              >
                                <CopyIcon sx={{ fontSize: 14, lineHeight: 1 }} />
                              </IconButton>
                              <IconButton
                                className="delete-button"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  width: 22,
                                  height: 22,
                                  display: 'none',
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                  '&:hover': { bgcolor: 'error.dark' },
                                  minWidth: 'unset',
                                  borderRadius: '50%',
                                  p: 0,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 20
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteShift(shift.id);
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 14, lineHeight: 1 }} />
                              </IconButton>
                            </CardContent>
                          </Card>
                          </Tooltip>
                        ))}
                      </Box>
                    </TableCell>
                  );
                })}
                {/* Weekly summary cell */}
                <TableCell 
                  align="center" 
                  sx={{ 
                    fontWeight: 600,
                    borderLeft: '3px solid',
                    borderLeftColor: 'divider'
                  }}
                >
                  {(() => {
                    const worked = weeklyMinutesByEmployee.get(employee.id.toString()) || 0;
                    const workedStr = minutesToHM(worked);
                    const targetMin = (typeof employee.weeklyHours === 'number' && !isNaN(employee.weeklyHours))
                      ? Math.round(employee.weeklyHours * 60)
                      : null;
                    if (targetMin == null) return workedStr;
                    const diff = worked - targetMin;
                    const diffStr = minutesToHM(diff);
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">{workedStr} / {minutesToHM(targetMin)}</Typography>
                        <Chip 
                          size="small" 
                          label={`Δ ${diffStr}`} 
                          variant="filled"
                          sx={(theme: Theme) => {
                            const bg = diff > 0
                              ? theme.palette.error.main
                              : (diff < 0 ? theme.palette.warning.main : theme.palette.success.main);
                            const border = diff > 0
                              ? theme.palette.error.dark
                              : (diff < 0 ? theme.palette.warning.dark : theme.palette.success.dark);
                            return {
                              bgcolor: bg,
                              color: theme.palette.getContrastText(bg),
                              border: '1px solid',
                              borderColor: border,
                              fontWeight: 600
                            };
                          }}
                        />
                      </Box>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
      </TableContainer>

      {/* Info wenn keine Mitarbeiter vorhanden */}
      {filteredEmployees.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Keine Mitarbeiter gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedOrganization 
              ? `Für die Organisation "${selectedOrganization.name}" sind keine Mitarbeiter hinterlegt.`
              : 'Bitte wählen Sie eine Organisation aus oder legen Sie Mitarbeiter an.'
            }
          </Typography>
        </Box>
      )}

      {/* Edit Shift Dialog */}
      <Dialog 
        open={editShiftDialog.open}
        onClose={() => setEditShiftDialog({ open: false, shift: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schicht bearbeiten</DialogTitle>
        <DialogContent>
          {editShiftDialog.shift && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Startzeit"
                type="time"
                value={editShiftDialog.shift.startTime || '09:00'}
                onChange={(e) => setEditShiftDialog(prev => ({
                  ...prev,
                  shift: { ...prev.shift, startTime: e.target.value || '09:00' }
                }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              <TextField
                label="Endzeit"
                type="time"
                value={editShiftDialog.shift.endTime || '17:00'}
                onChange={(e) => setEditShiftDialog(prev => ({
                  ...prev,
                  shift: { ...prev.shift, endTime: e.target.value || '17:00' }
                }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              {/* Arbeitszeit-/Pausen-Info / Ganztägig-Hinweis */}
              {(() => {
                // Determine linked shift type to know all-day/absence and counting
                const linkedType = shiftTypes.find((st: any) => st.id?.toString?.() === (editShiftDialog.shift.shiftTypeId || editShiftDialog.shift.shift_type_id)?.toString?.());
                const isAbs = (editShiftDialog.shift.shiftTypeCategory === 'absence') || linkedType?.category === 'absence';
                const isAllDay = !!editShiftDialog.shift.shiftTypeIsAllDay || linkedType?.isAllDay === true || isAbs;

                // Planned daily target minutes
                let targetMin: number | null = null;
                try {
                  const empId = (editShiftDialog.shift.employeeId || editShiftDialog.shift.employee_id)?.toString?.();
                  const emp = employees.find((x: any) => x.id?.toString?.() === empId);
                  const dateStr = editShiftDialog.shift.date;
                  if (emp && emp.dailyHoursPlan && dateStr) {
                    const d = new Date(dateStr);
                    const dow = d.getDay();
                    const key = (['sun','mon','tue','wed','thu','fri','sat'] as const)[dow];
                    const hours = emp.dailyHoursPlan[key as keyof typeof emp.dailyHoursPlan];
                    if (typeof hours === 'number' && isFinite(hours)) targetMin = Math.round(hours * 60);
                  }
                } catch {}

                // Determine counting per live type config (fallback to shift snapshot)
                let countsToward: boolean = true;
                if (typeof linkedType?.countsTowardHours === 'boolean') countsToward = linkedType.countsTowardHours as boolean;
                else if (editShiftDialog.shift.shiftTypeCountsTowardHours === false) countsToward = false;

                if (isAllDay) {
                  return (
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="body2">
                        Ganztägig{isAbs ? '' : ''} • {countsToward ? 'zählt zur Arbeitszeit' : 'zählt nicht zur Arbeitszeit'}
                        {countsToward && targetMin != null && (
                          <> • Soll: {minutesToHM(targetMin)}</>
                        )}
                      </Typography>
                    </Alert>
                  );
                }

                // Non-all-day: show classic gross/pause/net and delta
                const s = editShiftDialog.shift.startTime || '09:00';
                const e = editShiftDialog.shift.endTime || '17:00';
                const total = durationWithMidnight(s, e);
                const net = applyBreaks(total);
                const pause = Math.max(0, total - net);
                const deltaStr = targetMin != null ? minutesToHM(net - targetMin) : null;
                return (
                  <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                    <Typography variant="body2">
                      Brutto: {minutesToHM(total)} • Pause: {minutesToHM(pause)} • Netto: <strong>{minutesToHM(net)}</strong>
                      {targetMin != null && (
                        <> • Soll: {minutesToHM(targetMin)} • Δ {deltaStr}</>
                      )}
                    </Typography>
                  </Alert>
                );
              })()}
              <TextField
                label="Notizen"
                value={editShiftDialog.shift.notes || ''}
                onChange={(e) => setEditShiftDialog(prev => ({
                  ...prev,
                  shift: { ...prev.shift, notes: e.target.value }
                }))}
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditShiftDialog({ open: false, shift: null })}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => handleUpdateShift(editShiftDialog.shift)} 
            variant="contained"
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={employeeSelectionDialogOpen} onClose={() => setEmployeeSelectionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mitarbeiter im Schichtplan anzeigen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Wählen Sie aus, welche Mitarbeiter im Wochenplan angezeigt werden.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                onClick={() => setDraftVisibleEmployeeIds(baseEmployees.map((employee: any) => employee.id?.toString?.() || ''))}
              >
                Alle
              </Button>
              <Button size="small" onClick={() => setDraftVisibleEmployeeIds([])}>
                Keine
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <FormGroup>
            {baseEmployees.map((employee: any) => {
              const employeeId = employee.id?.toString?.() || '';
              const label = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Mitarbeiter';
              return (
                <FormControlLabel
                  key={employeeId}
                  control={
                    <Checkbox
                      checked={draftVisibleEmployeeIds.includes(employeeId)}
                      onChange={() => toggleDraftEmployeeVisibility(employeeId)}
                    />
                  }
                  label={`${label}${employee.position ? ` (${employee.position})` : ''}`}
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeSelectionDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={persistEmployeeVisibility} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog 
        open={bulkCreateDialog.open}
        onClose={() => setBulkCreateDialog({ open: false, employeeId: null, date: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schicht für Zeitraum erstellen</DialogTitle>
        <DialogContent>
          <BulkCreateShiftForm 
            employeeId={bulkCreateDialog.employeeId}
            initialDate={bulkCreateDialog.date}
            shiftTypes={shiftTypes}
            onSave={async (bulkData: any) => {
              try {
                // Create shifts for the date range
                const startDate = new Date(bulkData.startDate);
                const endDate = new Date(bulkData.endDate);
                const currentDate = new Date(startDate);

                while (currentDate <= endDate) {
                  const shiftData = {
                    shiftTypeId: bulkData.shiftTypeId,
                    employeeId: bulkData.employeeId.toString(),
                    date: format(currentDate, 'yyyy-MM-dd'),
                    startTime: bulkData.startTime,
                    endTime: bulkData.endTime,
                    notes: bulkData.notes,
                    organizationUnitId: selectedOrganization?.id || '1'
                  };
                  await dispatch(createShift(shiftData)).unwrap();
                  currentDate.setDate(currentDate.getDate() + 1);
                }

                dispatch(fetchShifts({}));
                setBulkCreateDialog({ open: false, employeeId: null, date: null });
                setSnackbar({ open: true, message: 'Schichten erfolgreich erstellt', severity: 'success' });
              } catch (error) {
                console.error('Fehler beim Erstellen der Schichten:', error);
                setSnackbar({ open: true, message: 'Fehler beim Erstellen der Schichten', severity: 'error' });
              }
            }}
            onCancel={() => setBulkCreateDialog({ open: false, employeeId: null, date: null })}
          />
        </DialogContent>
      </Dialog>

      {/* Week Copy Dialog */}
      <Dialog open={weekCopyDialog.open} onClose={isCopyingWeek ? undefined : () => setWeekCopyDialog({ open: false })}>
        <DialogTitle>Woche kopieren</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie alle Schichten der aktuellen Woche in die nächste Woche kopieren?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Aktuelle Woche: {weekDays.length > 0 ? (
              <>
                {format(weekDays[0], 'dd.MM.yyyy', { locale: de })} - {format(weekDays[weekDays.length - 1], 'dd.MM.yyyy', { locale: de })}
              </>
            ) : (
              format(currentDate, 'dd.MM.yyyy', { locale: de })
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zielwoche: {weekDays.length > 0 ? (
              <>
                {format(addDays(weekDays[0], 7), 'dd.MM.yyyy', { locale: de })} - {format(addDays(weekDays[weekDays.length - 1], 7), 'dd.MM.yyyy', { locale: de })}
              </>
            ) : (
              <>
                {format(addDays(currentDate, 7), 'dd.MM.yyyy', { locale: de })} - {format(addDays(currentDate, 13), 'dd.MM.yyyy', { locale: de })}
              </>
            )}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Aktuelle Schichten: {weekCopyPreview.currentWeekShifts.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bereits in Zielwoche: {weekCopyPreview.targetWeekExistingShifts.length}
            </Typography>
            <Typography variant="body2" color={weekCopyPreview.duplicatesFound > 0 ? 'warning.main' : 'text.secondary'}>
              Potenzielle Duplikate (werden übersprungen): {weekCopyPreview.duplicatesFound}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Neue Schichten nach Kopie: {weekCopyPreview.shiftsToCreate.length}
            </Typography>
          </Box>
          {weekCopyPreview.targetDailyCounts.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                Zielwoche im Überblick (vor dem Kopieren):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {weekCopyPreview.targetDailyCounts.map((entry) => (
                  <Chip
                    key={entry.date.toISOString()}
                    label={`${format(entry.date, 'EEE dd.MM', { locale: de })}: ${entry.count}`}
                    size="small"
                    color={entry.count > 0 ? 'warning' : 'default'}
                    variant={entry.count > 0 ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          )}
          {isCopyingWeek && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Schichten werden kopiert…</Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeekCopyDialog({ open: false })} disabled={isCopyingWeek}>Abbrechen</Button>
          <Button onClick={handleCopyWeek} variant="contained" disabled={isCopyingWeek}>
            {isCopyingWeek ? 'Kopiere…' : 'Kopieren'}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Mitarbeiter-Woche löschen Dialog */}
        <Dialog
          open={deleteEmployeeWeekDialog.open}
          onClose={deletingEmployeeWeekId ? undefined : () => setDeleteEmployeeWeekDialog({ open: false, employee: null, shiftIds: [] })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Wochenschichten löschen</DialogTitle>
          <DialogContent>
            <Typography>
              {deleteEmployeeWeekDialog.employee
                ? `${deleteEmployeeWeekDialog.employee.firstName || ''} ${deleteEmployeeWeekDialog.employee.lastName || ''}: ${deleteEmployeeWeekDialog.shiftIds.length} Schicht(en) dieser Woche wirklich löschen?`
                : 'Schichten dieser Woche wirklich löschen?'}
            </Typography>
            {deletingEmployeeWeekId && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Schichten werden gelöscht…</Typography>
                <LinearProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteEmployeeWeekDialog({ open: false, employee: null, shiftIds: [] })}
              disabled={!!deletingEmployeeWeekId}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleDeleteEmployeeWeekShifts}
              variant="contained"
              color="error"
              disabled={!!deletingEmployeeWeekId}
            >
              {deletingEmployeeWeekId ? 'Lösche…' : 'Löschen'}
            </Button>
          </DialogActions>
        </Dialog>

      {/* Konflikt-Dialog */}
      <Dialog 
        open={conflictDialog.open} 
        onClose={() => setConflictDialog(prev => ({ ...prev, open: false }))}
        maxWidth="md"
      >
        <DialogTitle>Schichtkonflikt erkannt</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {conflictDialog.message}
          </Typography>
          {conflictDialog.existingShifts.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Existierende Schichten:
              </Typography>
              {conflictDialog.existingShifts.map((shift: any, index: number) => {
                // Flexibles Mapping für verschiedene Property-Namen
                const shiftTypeId = shift.shiftTypeId || shift.shift_type_id;
                const employeeId = shift.employeeId || shift.employee_id;
                
                const shiftType = shiftTypes.find((st: any) => st.id.toString() === shiftTypeId?.toString());
                const employee = employees.find((emp: any) => emp.id.toString() === employeeId?.toString());
                return (
                  <Chip
                    key={index}
                    label={`${employee?.firstName || 'Unbekannt'} ${employee?.lastName || ''} - ${shiftType?.name || 'Unbekannter Schichttyp'}`}
                    sx={{ mr: 1, mb: 1 }}
                    color="primary"
                  />
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog(prev => ({ ...prev, open: false }))}>
            Abbrechen
          </Button>
          <Button 
            onClick={async () => {
              // Lösche existierende Schichten und erstelle neue
              try {
                for (const existingShift of conflictDialog.existingShifts) {
                  const shiftId = existingShift.id;
                  await dispatch(deleteShift(parseInt(shiftId))).unwrap();
                }
                await createShiftWithData(conflictDialog.newShift);
                setConflictDialog(prev => ({ ...prev, open: false }));
              } catch (error) {
                console.error('Fehler beim Überschreiben der Schicht:', error);
                setSnackbar({
                  open: true,
                  message: 'Fehler beim Überschreiben der Schicht',
                  severity: 'error'
                });
              }
            }}
            variant="contained"
            color="warning"
          >
            Überschreiben
          </Button>
        </DialogActions>
      </Dialog>

      {/* Flexible Shift Time Dialog */}
      <Dialog
        open={flexDialog.open}
        onClose={() => setFlexDialog(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Zeiten für flexible Schicht festlegen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Startzeit"
              type="time"
              value={flexDialog.startTime}
              onChange={(e) => setFlexDialog(prev => ({ ...prev, startTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Endzeit"
              type="time"
              value={flexDialog.endTime}
              onChange={(e) => setFlexDialog(prev => ({ ...prev, endTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          {/* Arbeitszeit-/Pausen-Info für flexible Schicht */}
          {(() => {
            const s = flexDialog.startTime || '09:00';
            const e = flexDialog.endTime || '17:00';
            const total = durationWithMidnight(s, e);
            const net = applyBreaks(total);
            const pause = Math.max(0, total - net);
            // Soll (täglicher Plan) ermitteln
            let targetMin: number | null = null;
            try {
              if (flexDialog.employeeId && flexDialog.date) {
                const emp = employees.find((x: any) => x.id?.toString?.() === flexDialog.employeeId?.toString?.());
                const d = new Date(flexDialog.date);
                const dow = d.getDay();
                const key = (['sun','mon','tue','wed','thu','fri','sat'] as const)[dow];
                const hours = emp?.dailyHoursPlan?.[key];
                if (typeof hours === 'number' && isFinite(hours)) {
                  targetMin = Math.round(hours * 60);
                }
              }
            } catch {}
            const deltaStr = targetMin != null ? minutesToHM(net - targetMin) : null;
            return (
              <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0.5 }}>
                <Typography variant="body2">
                  Brutto: {minutesToHM(total)} • Pause: {minutesToHM(pause)} • Netto: <strong>{minutesToHM(net)}</strong>
                  {targetMin != null && (
                    <> • Soll: {minutesToHM(targetMin)} • Δ {deltaStr}</>
                  )}
                </Typography>
              </Alert>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlexDialog(prev => ({ ...prev, open: false }))}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!flexDialog.employeeId || !flexDialog.date || !flexDialog.shiftType) {
                setFlexDialog(prev => ({ ...prev, open: false }));
                return;
              }
              const s = flexDialog.startTime || '09:00';
              const e = flexDialog.endTime || '17:00';
              // Basic validation HH:mm
              const valid = /^\d{1,2}:\d{2}$/.test(s) && /^\d{1,2}:\d{2}$/.test(e);
              if (!valid) {
                setSnackbar({ open: true, message: 'Bitte gültige Zeiten eingeben (HH:MM).', severity: 'error' });
                return;
              }
              const [sh, sm] = s.split(':').map(Number);
              const [eh, em] = e.split(':').map(Number);
              const startMin = (sh || 0) * 60 + (sm || 0);
              const endMin = (eh || 0) * 60 + (em || 0);
              const isMidnightEnd = endMin === 0 && startMin > 0;
              if (!isMidnightEnd && endMin <= startMin) {
                setSnackbar({ open: true, message: 'Endzeit muss nach Startzeit liegen (00:00 gilt als 24:00).', severity: 'error' });
                return;
              }

              const shiftData = {
                shiftTypeId: flexDialog.shiftType.id,
                employeeId: flexDialog.employeeId.toString(),
                date: flexDialog.date,
                startTime: s,
                endTime: e, // store as 00:00; calculations treat as 24:00 when start > 0
                notes: `${flexDialog.shiftType.name} Schicht`,
                organizationUnitId: String(selectedOrganization?.id ?? (employees.find((e:any)=> e.id?.toString?.()===flexDialog.employeeId?.toString?.()) as any)?.organizationId ?? '')
              };
              if (!shiftData.organizationUnitId) {
                setSnackbar({ open: true, message: 'Keine Organisation ausgewählt – bitte Organisation wählen.', severity: 'error' });
                return;
              }

              const conflictCheck = checkShiftConflicts(shiftData);
              if (conflictCheck.hasConflict && !conflictCheck.canOverride) {
                setSnackbar({ open: true, message: conflictCheck.conflicts[0].message, severity: 'error' });
                return;
              }

              if (conflictCheck.hasConflict && conflictCheck.canOverride) {
                setConflictDialog({
                  open: true,
                  newShift: shiftData,
                  existingShifts: conflictCheck.conflicts.map(c => c.existing),
                  message: conflictCheck.conflicts[0].message
                });
                setFlexDialog(prev => ({ ...prev, open: false }));
                return;
              }

              try {
                await createShiftWithData(shiftData);
                setFlexDialog(prev => ({ ...prev, open: false }));
              } catch (err) {
                console.error('Fehler beim Erstellen flexibler Schicht:', err);
                setSnackbar({ open: true, message: 'Fehler beim Erstellen der Schicht', severity: 'error' });
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeekView;