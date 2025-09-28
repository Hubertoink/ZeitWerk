import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Box, 
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
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import { Tooltip } from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight,
  Person as PersonIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCurrentDate, navigateWeek } from '../../store/slices/calendarSlice';
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

const WeekView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const calendar = useAppSelector((state: any) => state.calendar);
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const shiftsState = useAppSelector((state: any) => state.shifts);
  
  const currentDate = calendar?.currentDate ? new Date(calendar.currentDate) : new Date();
  const shifts = shiftsState?.shifts || [];

  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
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

  // Serialize vacation periods from settings to create a stable dependency key
  const vacationPeriodsKey = useMemo(() => JSON.stringify(settings?.calendar?.vacationPeriods || []), [settings?.calendar?.vacationPeriods]);

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

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchShiftTypes());
    dispatch(fetchShifts({}));
  }, [dispatch]);

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
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrevWeek = () => {
    dispatch(navigateWeek('prev'));
  };

  const handleNextWeek = () => {
    dispatch(navigateWeek('next'));
  };

  const handleToday = () => {
    dispatch(setCurrentDate(new Date().toISOString()));
  };

  const handleExcelWeekExport = async () => {
    try {
      if (!weekDays.length) return;
      const data = buildWeekExcelFromShifts({
        employees: filteredEmployees,
        days: weekDays,
        getShifts: getShiftsForEmployeeAndDay,
        organizationName: selectedOrganization?.name
      });
  const defaultName = `Wochenplan_${format(weekDays[0], 'yyyy-MM-dd')}.xlsx`;
  const ok = await saveWeekExcel(data, defaultName);
  setSnackbar({ open: true, message: ok ? 'Excel-Wochenexport gespeichert' : 'Export abgebrochen oder fehlgeschlagen', severity: ok ? 'success' as const : 'error' as const });
    } catch (e:any) {
      console.error('Excel week export error:', e);
      setSnackbar({ open: true, message: 'Fehler beim Excel-Export', severity: 'error' });
    }
  };

  // Helper to render shift type label with times when available
  const renderShiftTypeLabel = useCallback((st: any) => {
    // For all-day or absence types, do not show times in the badge label
    if (st?.isAllDay || st?.category === 'absence') return st?.name || 'Schicht';
    const s: string | undefined = st?.startTime;
    const e: string | undefined = st?.endTime;
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

  // Compute weekly working minutes per employee (regular shifts only, per-day breaks applied)
  const weeklyMinutesByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((emp: any) => {
      let sum = 0;
      weekDays.forEach(day => {
        const dayShifts = getShiftsForEmployeeAndDay(emp.id, day) || [];
        // sum only regular shift minutes
        let dayMinutes = 0;
        dayShifts.forEach((s: any) => {
          const isAbsence = (s.shiftTypeCategory || s.category) === 'absence';
          const nonCounting = s.shiftTypeCountsTowardHours === false;
          if (isAbsence || nonCounting) return;
          const start = parseTimeToMinutes(s.startTime || s.start_time);
          const end = parseTimeToMinutes(s.endTime || s.end_time);
          if (end > start) dayMinutes += (end - start);
        });
        sum += applyBreaks(dayMinutes);
      });
      map.set(emp.id.toString(), sum);
    });
    return map;
  }, [employees, weekDays, getShiftsForEmployeeAndDay]);

  // Hilfsfunktion: Prüfe ob ein Tag in einer Schließzeit liegt
  const isVacationDay = useCallback((date: Date): VacationPeriod | null => {
    return vacationPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return date >= startDate && date <= endDate;
    }) || null;
  }, [vacationPeriods]);

  // Hilfsfunktion zur Konfliktprüfung
  const checkShiftConflicts = (newShiftData: any) => {
    const newShiftType = shiftTypes.find((st: any) => st.id === newShiftData.shiftTypeId);
    if (!newShiftType) return { hasConflict: false, conflicts: [] };

    // Finde existierende Schichten für diesen Mitarbeiter am gleichen Tag
    const existingShifts = shifts.filter((shift: any) => 
      (shift.employeeId || shift.employee_id)?.toString() === newShiftData.employeeId.toString() &&
      shift.date === newShiftData.date
    );

    if (existingShifts.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts = [];
    
    for (const existingShift of existingShifts) {
      const existingShiftType = shiftTypes.find((st: any) => 
        st.id.toString() === (existingShift.shiftTypeId || existingShift.shift_type_id)?.toString()
      );
      if (!existingShiftType) continue;

      // Regeln:
      // 1. Reguläre Schichten (category: 'regular') können nicht doppelt sein
      // 2. Abwesenheiten (category: 'absence') können über reguläre Schichten gelegt werden  
      // 3. Höhere Priorität überschreibt niedrigere
      // 4. Spezielle Schichten (Urlaub, Krankheit) können parallel existieren

      if (newShiftType.category === 'regular' && existingShiftType.category === 'regular') {
        // Zwei reguläre Schichten - das ist ein Konflikt
        conflicts.push({
          type: 'duplicate_regular',
          existing: existingShift,
          existingShiftType,
          message: `${existingShiftType.name} ist bereits für diesen Tag geplant. Reguläre Schichten können nicht doppelt vergeben werden.`
        });
      } else if (newShiftType.category === 'absence' && existingShiftType.category === 'absence') {
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
      } else if (newShiftType.category === 'regular' && existingShiftType.category === 'absence') {
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
      // Ensure we always have valid default times
      const defaultStartTime = shiftType.startTime || '09:00';
      const defaultEndTime = shiftType.endTime || '17:00';
      
      const shiftData = {
        shiftTypeId: shiftType.id,
        employeeId: employeeId.toString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        notes: `${shiftType.name} Schicht`,
        organizationUnitId: selectedOrganization?.id || '1'
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

      const newShiftData = {
        shiftTypeId: (shift.shiftTypeId || shift.shift_type_id)?.toString(),
        employeeId: employeeId.toString(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: shift.startTime || shift.start_time || '09:00',
        endTime: shift.endTime || shift.end_time || '17:00',
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
        employeeId: employeeId.toString()
      });
    } catch (error) {
      console.error('Fehler beim Verschieben der Schicht:', error);
      setSnackbar({ open: true, message: 'Fehler beim Verschieben der Schicht', severity: 'error' });
    }
  };

  const moveShiftWithData = async (id: number, data: { date?: string; employeeId?: string }) => {
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

  const handleCopyWeek = async () => {
    try {
      // Guard: keine Woche berechnet
      if (!weekDays || weekDays.length === 0) {
        setSnackbar({ open: true, message: 'Keine Woche ausgewählt', severity: 'error' });
        return;
      }

      // Ermittele Start- und Endtag der aktuell angezeigten Woche (respektiert 5/7 Tage)
      const startDay = weekDays[0];
      const endDay = weekDays[weekDays.length - 1];

      // Hole alle Schichten der aktuellen Woche (inkl. variablem Wochenumfang)
      const currentWeekShifts = shifts.filter((shift: any) => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= startDay && shiftDate <= endDay;
      });

      // Erstelle neue Schichten für die nächste Woche
      for (const shift of currentWeekShifts) {
        const newDate = addDays(new Date(shift.date), 7);
        const newShiftData = {
          // Normalisiere Feldnamen (unterstütze snake_case und camelCase)
          shiftTypeId: (shift.shiftTypeId || shift.shift_type_id)?.toString(),
          employeeId: (shift.employeeId || shift.employee_id)?.toString(),
          date: format(newDate, 'yyyy-MM-dd'),
          startTime: shift.startTime || shift.start_time || '09:00',
          endTime: shift.endTime || shift.end_time || '17:00',
          notes: shift.notes,
          organizationUnitId: selectedOrganization?.id || '1'
        };
        await dispatch(createShift(newShiftData)).unwrap();
      }
      
      dispatch(fetchShifts({}));
      setWeekCopyDialog({ open: false });
      setSnackbar({ open: true, message: 'Woche erfolgreich kopiert', severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Kopieren der Woche:', error);
      setSnackbar({ open: true, message: 'Fehler beim Kopieren der Woche', severity: 'error' });
    }
  };

  // Filter employees by selected organization
  const filteredEmployees = selectedOrganization 
    ? employees.filter((emp: any) => emp.organizationId === selectedOrganization.id)
    : employees;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Wochenansicht
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<CopyIcon />}
            onClick={() => setWeekCopyDialog({ open: true })}
          >
            Woche kopieren
          </Button>

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
          
          <Button variant="outlined" onClick={handleToday}>
            Heute
          </Button>
          
          <IconButton onClick={handlePrevWeek}>
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {weekDays.length > 0 ? (
              <>
                {format(weekDays[0], 'dd.MM.yyyy', { locale: de })} - {' '}
                {format(weekDays[weekDays.length - 1], 'dd.MM.yyyy', { locale: de })}
              </>
            ) : (
              format(currentDate, 'dd.MM.yyyy', { locale: de })
            )}
          </Typography>
          
          <IconButton onClick={handleNextWeek}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* Schichttypen zum Ziehen */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Schichtarten (per Drag & Drop zuweisen):
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {shiftTypes.map((shiftType: any) => (
            <Chip
              key={shiftType.id}
              label={renderShiftTypeLabel(shiftType)}
              title={renderShiftTypeLabel(shiftType)}
              sx={(theme) => ({
                backgroundColor: shiftType.color,
                color: theme.palette.getContrastText(shiftType.color),
                fontWeight: 600,
                cursor: 'grab',
                '&:hover': { transform: 'scale(1.05)' },
                '&:active': { cursor: 'grabbing' }
              })}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('shiftType', JSON.stringify(shiftType));
              }}
            />
          ))}
        </Box>
        
        {/* Tastatur-Navigation Info */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap', 
          alignItems: 'center',
          backgroundColor: 'action.hover',
          padding: 1,
          borderRadius: 1
        }}>
          <Typography variant="caption" color="text.secondary">
            Tastatur:
          </Typography>
          <Chip size="small" label="← →" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          <Typography variant="caption" color="text.secondary">
            Woche wechseln
          </Typography>
          <Chip size="small" label="Home" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          <Typography variant="caption" color="text.secondary">
            Heute
          </Typography>
          <Chip size="small" label="Esc" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          <Typography variant="caption" color="text.secondary">
            Dialoge schließen
          </Typography>
        </Box>
      </Box>

      {/* Organisation Info */}
      {selectedOrganization && (
        <Box sx={{ mb: 2 }}>
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
        </Box>
      )}

      {/* Wochenansicht-Grid */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold', borderRight: '1px solid', borderRightColor: 'divider' }}>
                Mitarbeiter
              </TableCell>
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const holiday = isHoliday(day, holidays);
                const vacation = isVacationDay(day);
                const isLast = index === weekDays.length - 1;
                const openingHours = selectedOrganization?.openingHours;
                const openingText = (openingHours && openingHours.enabled)
                  ? formatOpeningHours(getOpeningHoursForDay(openingHours, day))
                  : '';
                // Hinweis: holiday/vacation werden direkt für Styling/Tooltips genutzt
                
                return (
                  <TableCell 
                    key={index} 
                    align="center"
                    sx={{ 
                      minWidth: 120,
                      fontWeight: 'bold',
                      backgroundColor: isToday ? 'primary.50' 
                        : vacation ? 'warning.50' 
                        : holiday ? 'error.50' 
                        : 'inherit',
                      color: isToday ? 'primary.main' 
                        : vacation ? 'warning.main' 
                        : holiday ? 'error.main' 
                        : 'inherit',
                      borderLeft: vacation ? '4px solid' : 'none',
                      borderLeftColor: vacation ? 'warning.main' : 'inherit',
                      borderRight: isLast ? 'none' : '1px solid',
                      borderRightColor: 'divider'
                    }}
                  >
                    <Box>
                      <Typography variant="caption" display="block">
                        {format(day, 'EEEE', { locale: de })}
                      </Typography>
                      <Typography variant="subtitle2">
                        {format(day, 'dd.MM')}
                      </Typography>
                      {!!openingText && (
                        <Typography 
                          variant="caption" 
                          display="block" 
                          color="text.secondary" 
                          sx={{ fontSize: '0.65rem', mt: 0.25 }}
                        >
                          {openingText}
                        </Typography>
                      )}
                      {holiday && (
                        <Typography variant="caption" display="block" color="error.main" sx={{ fontSize: '0.6rem' }}>
                          {holiday.name}
                        </Typography>
                      )}
                      {vacation && (
                        <Typography 
                          variant="caption" 
                          display="block" 
                          color="warning.main" 
                          sx={{ 
                            fontSize: '0.6rem', 
                            fontWeight: 'bold',
                            backgroundColor: 'warning.light',
                            padding: '2px 4px',
                            borderRadius: 1,
                            mt: 0.5
                          }}
                        >
                          🏖️ {vacation.name}
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
            {filteredEmployees.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid', borderRightColor: 'divider' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar 
                      src={(employee.photoPath ? (window as any)?.electronAPI?.toFileUrl?.(employee.photoPath) : employee.photoUrl) || undefined}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {(employee.photoPath || employee.photoUrl) ? null : <PersonIcon fontSize="small" />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.position || 'Mitarbeiter'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                {weekDays.map((day, dayIndex) => {
                  const employeeShifts = getShiftsForEmployeeAndDay(employee.id, day);
                  const vacation = isVacationDay(day);
                  const isLast = dayIndex === weekDays.length - 1;
                  
                  return (
                    <TableCell 
                      key={dayIndex}
                      sx={{ 
                        padding: 1,
                        verticalAlign: 'top',
                        height: 80,
                        position: 'relative',
                        backgroundColor: vacation ? 'warning.50' : 'inherit',
                        borderLeft: vacation ? '4px solid' : 'none',
                        borderLeftColor: vacation ? 'warning.main' : 'inherit',
                        borderRight: isLast ? 'none' : '1px solid',
                        borderRightColor: 'divider',
                        '&:hover': { backgroundColor: vacation ? 'warning.100' : 'action.hover' },
                        opacity: vacation ? 0.8 : 1
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (vacation) {
                          // Verhindere Schicht-Drop während Schließzeiten
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
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        if (!vacation) {
                          handleCellClick(employee.id, day);
                        }
                      }}
                    >
                      <Box sx={{ minHeight: 60 }}>
                        {vacation && (
                          <Card 
                            sx={{ 
                              mb: 0.5, 
                              backgroundColor: 'warning.main',
                              color: 'white',
                              textAlign: 'center'
                            }}
                          >
                            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                🏖️ SCHLIESSZEIT
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem' }}>
                                {vacation.name}
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                        
                        {!vacation && employeeShifts.map((shift: any) => (
                          // Tooltip with detailed time info
                          <Tooltip
                            key={`tt-${shift.id}`}
                            title={(() => {
                              const isAbs = (shift.shiftTypeCategory || shift.category) === 'absence';
                              const nonCounting = shift.shiftTypeCountsTowardHours === false;
                              const s = parseTimeToMinutes(shift.startTime || shift.start_time);
                              const e = parseTimeToMinutes(shift.endTime || shift.end_time);
                              const gross = Math.max(0, e - s);
                              const net = applyBreaks(gross);
                              const grossStr = minutesToHM(gross);
                              const netStr = minutesToHM(net);
                              const breakMin = Math.max(0, gross - net);
                              const isAllDay = !!shift.shiftTypeIsAllDay;
                              if (isAbs) return `${shift.shiftTypeName || 'Abwesenheit'} (ganztägig, zählt nicht)`;
                              const base = isAllDay
                                ? `${shift.shiftTypeName || 'Schicht'} (ganztägig)`
                                : `${shift.shiftTypeName || 'Schicht'} ${shift.startTime || ''} - ${shift.endTime || ''}`;
                              if (nonCounting) return `${base} · zählt nicht zur Arbeitszeit`;
                              if (isAllDay) return base; // no times/details for all-day
                              return `${base}\nBrutto: ${grossStr} · Pause: ${breakMin} Min · Netto: ${netStr}`;
                            })()}
                            arrow
                            placement="top"
                          >
                          <Card 
                            key={shift.id}
                            sx={{ 
                              mb: 0.5, 
                              cursor: 'grab',
                              minHeight: 24,
                              position: 'relative',
                              width: '100%',
                              boxSizing: 'border-box',
                              '&:hover': { 
                                bgcolor: (theme) => theme.palette.mode === 'dark' 
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'action.selected',
                                boxShadow: (theme) => theme.palette.mode === 'dark'
                                  ? '0 6px 16px rgba(0,0,0,0.5)'
                                  : '0 6px 16px rgba(0,0,0,0.2)',
                                outline: (theme) => theme.palette.mode === 'dark' 
                                  ? '2px solid rgba(255,255,255,0.18)'
                                  : '2px solid rgba(0,0,0,0.12)',
                                outlineOffset: 0,
                                '& .delete-button': { display: 'block' }
                              }
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('existingShift', JSON.stringify({ id: shift.id }));
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditShift(shift);
                            }}
                          >
                            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
                              <Chip 
                                label={(() => {
                                  const isAbs = shift.shiftTypeCategory === 'absence';
                                  if (isAbs) return `🏖️ ${shift.shiftTypeName || 'Abwesenheit'}`;
                                  const isAllDay = !!shift.shiftTypeIsAllDay;
                                  const name = shift.shiftTypeName || 'Schicht';
                                  const startStr = shift.startTime || '';
                                  const endStr = shift.endTime || '';
                                  const s = parseTimeToMinutes(startStr);
                                  const e = parseTimeToMinutes(endStr);
                                  const gross = e > s ? (e - s) : 0;
                                  const net = applyBreaks(gross);
                                  const breakMin = Math.max(0, gross - net);
                                  const hasTimes = !!startStr && !!endStr && gross > 0;

                                  if (isAllDay) {
                                    // Nur Name (und Hinweis, wenn nicht zählend)
                                    const title = `${name}${shift.shiftTypeCountsTowardHours === false ? ' · zählt nicht' : ''} · ganztägig`;
                                    return (
                                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{title}</span>
                                      </Box>
                                    );
                                  }

                                  // Drei Zeilen: Name, Zeiten, Pause
                                  return (
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>
                                        {name}
                                        {shift.shiftTypeCountsTowardHours === false ? ' · zählt nicht' : ''}
                                      </span>
                                      {hasTimes && (
                                        <span style={{ fontSize: '0.78em', opacity: 0.95 }}>
                                          {startStr} - {endStr}
                                        </span>
                                      )}
                                      {hasTimes && (
                                        <span style={{ fontSize: '0.72em', opacity: 0.95 }}>
                                          Pause: {breakMin} Min
                                        </span>
                                      )}
                                    </Box>
                                  );
                                })()} 
                                size="small" 
                                sx={(theme) => ({ 
                                  bgcolor: shift.shiftTypeColor || '#ccc',
                                  color: theme.palette.getContrastText(shift.shiftTypeColor || '#ccc'),
                                  fontSize: '0.7rem',
                                  height: 'auto',
                                  minHeight: 24,
                                  width: '100%',
                                  fontWeight: 700,
                                  // Make colored area bigger by reducing the border on absence chips
                                  border: shift.shiftTypeCategory === 'absence' ? '1px solid rgba(255,255,255,0.9)' : 'none',
                                  boxShadow: shift.shiftTypeCategory === 'absence' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                                  transition: 'box-shadow 0.2s ease, filter 0.2s ease',
                                  ...(theme.palette.mode === 'dark' && {
                                    filter: 'saturate(1.05)',
                                  }),
                                  '& .MuiChip-label': {
                                    // Padding and wrapping to support two-line labels
                                    padding: '4px 8px',
                                    lineHeight: 1.2,
                                    whiteSpace: 'normal',
                                    overflow: 'visible',
                                    textOverflow: 'clip',
                                    width: '100%',
                                    display: 'block',
                                  }
                                })}
                              />
                              {/* Delete Button - jetzt für alle Schichten (inkl. Abwesenheiten) */}
                              <IconButton
                                className="delete-button"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  width: 22,
                                  height: 22,
                                  display: 'none',
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'error.dark' },
                                  minWidth: 'unset',
                                  borderRadius: '50%',
                                  p: 0,
                                  displayFlex: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteShift(shift.id);
                                }}
                              >
                                {/* Close icon (no extra circle) centered in red dot */}
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
                          sx={(theme) => {
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
      <Dialog open={weekCopyDialog.open} onClose={() => setWeekCopyDialog({ open: false })}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeekCopyDialog({ open: false })}>Abbrechen</Button>
          <Button onClick={handleCopyWeek} variant="contained">Kopieren</Button>
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