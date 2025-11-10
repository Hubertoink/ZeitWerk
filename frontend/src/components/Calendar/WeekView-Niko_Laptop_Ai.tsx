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
import { 
  ChevronLeft, 
  ChevronRight,
  Cancel as CancelIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setWeekDate, navigateWeek } from '../../store/slices/calendarSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts, createShift, updateShift, deleteShift } from '../../store/slices/shiftSlice';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';
import { Holiday, loadHolidaysForRange } from '../../utils/holidays';
import { VacationPeriod } from '../../types/settings';
import BulkCreateShiftForm from './BulkCreateShiftForm';
import { useStateReset, resetWeekViewDialogs, debugStateReset } from '../../utils/stateReset';
import { getWeeklyOpeningSummary } from '../../utils/openingHours';

const WeekView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const calendar = useAppSelector((state: any) => state.calendar);
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const shiftsState = useAppSelector((state: any) => state.shifts);
  
  const currentDate = calendar?.weekDate ? new Date(calendar.weekDate) : new Date();
  const shifts = shiftsState?.shifts || [];

  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysCache, setHolidaysCache] = useState<Map<string, Holiday[]>>(new Map());
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
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
    date: null as string | null,
    resetKey: 0 // Reset-Key für Form-State-Management
  });
  const [weekCopyDialog, setWeekCopyDialog] = useState({ open: false });
  const [closeConfirmDialog, setCloseConfirmDialog] = useState(false);
  const [originalShiftData, setOriginalShiftData] = useState<any>(null);

  // Check if form data has changed
  const hasShiftFormChanged = () => {
    if (!editShiftDialog.shift || !originalShiftData) return false;
    
    // Wenn originalShiftData null ist, sind keine Änderungen vorhanden (z.B. nach erfolgreichem Speichern)
    if (originalShiftData === null) return false;
    
    return (
      editShiftDialog.shift.date !== originalShiftData.date ||
      editShiftDialog.shift.startTime !== originalShiftData.startTime ||
      editShiftDialog.shift.endTime !== originalShiftData.endTime ||
      editShiftDialog.shift.notes !== originalShiftData.notes ||
      editShiftDialog.shift.shiftTypeId !== originalShiftData.shiftTypeId ||
      editShiftDialog.shift.employeeId !== originalShiftData.employeeId
    );
  };

  const handleCloseEditDialog = () => {
    if (hasShiftFormChanged()) {
      setCloseConfirmDialog(true);
    } else {
      setEditShiftDialog({ open: false, shift: null });
      setOriginalShiftData(null);
    }
  };

  const confirmCloseEditDialog = () => {
    setCloseConfirmDialog(false);
    setEditShiftDialog({ open: false, shift: null });
    setOriginalShiftData(null);
  };

  // State Reset Management
  const { registerResetCallback, executeGlobalReset } = useStateReset();

  const getHolidayForDay = useCallback((day: Date): Holiday | null => {
    return holidays.find(holiday => isSameDay(new Date(holiday.date), day)) || null;
  }, [holidays]);

  useEffect(() => {
    // Registriere Reset-Callback für diese Komponente
    const resetFunction = resetWeekViewDialogs({
      setEditShiftDialog,
      setBulkCreateDialog,
      setConflictDialog,
      setWeekCopyDialog
    });
    
    registerResetCallback(debugStateReset('WeekView', resetFunction));
  }, [registerResetCallback]);

  useEffect(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const daysToShow = settings?.calendar?.weekViewDays || settings?.calendar?.weekView || 7; // Fallback für alte Einstellungen
    const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
    setWeekDays(days);

    // Lade Schließzeiten/Urlaubsperioden aus den Einstellungen
    if (settings?.calendar?.vacationPeriods) {
      setVacationPeriods(settings.calendar.vacationPeriods);
    }
  }, [currentDate, settings?.calendar?.weekViewDays, settings?.calendar?.weekView]);

  // Separater Effect für Feiertage mit Caching und Debouncing
  useEffect(() => {
    if (weekDays.length === 0) return;

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];
    const holidayRegion = settings?.calendar?.holidayRegion || 'BY';
    const cacheKey = `${format(firstDay, 'yyyy-MM-dd')}-${format(lastDay, 'yyyy-MM-dd')}-${holidayRegion}`;
    
    // Prüfe Cache zuerst
    if (holidaysCache.has(cacheKey)) {
      const cachedHolidays = holidaysCache.get(cacheKey) || [];
      const customHolidays = (settings?.calendar?.customHolidays || []).map(customHoliday => ({
        date: customHoliday.date,
        name: customHoliday.name,
        type: 'public' as const,
        state: undefined
      }));
      setHolidays([...cachedHolidays, ...customHolidays]);
      return;
    }

    // Debounce API-Aufrufe
    const timeoutId = setTimeout(() => {
      loadHolidaysForRange(firstDay, lastDay, holidayRegion)
        .then(holidaysData => {
          // Cache die Ergebnisse
          setHolidaysCache(prev => new Map(prev).set(cacheKey, holidaysData));
          
          // Füge benutzerdefinierte Feiertage hinzu
          const customHolidays = (settings?.calendar?.customHolidays || []).map(customHoliday => ({
            date: customHoliday.date,
            name: customHoliday.name,
            type: 'public' as const,
            state: undefined
          }));
          const allHolidays = [...holidaysData, ...customHolidays];
          setHolidays(allHolidays);
        })
        .catch(error => {
          console.error('Fehler beim Laden der Feiertage:', error);
          // Fallback auf leeres Array bei Fehlern
          setHolidays([]);
        });
    }, 300); // 300ms Debounce

    return () => clearTimeout(timeoutId);
  }, [weekDays, settings?.calendar?.holidayRegion, settings?.calendar?.customHolidays, holidaysCache]);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchShiftTypes());
    dispatch(fetchShifts({}));
  }, [dispatch]);

  // Tastatur-Navigation - nur für spezifische Shortcuts, nicht alle Inputs blockieren
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Debug-Logging für Focus-Probleme
      if (event.key.length === 1 || ['Backspace', 'Delete'].includes(event.key)) {
        console.log('🎹 Key pressed:', {
          key: event.key,
          targetTag: target.tagName,
          targetType: (target as any).type,
          targetClass: target.className,
          isInput: target.tagName === 'INPUT',
          isTextarea: target.tagName === 'TEXTAREA',
          isSelect: target.tagName === 'SELECT',
          isContentEditable: target.isContentEditable,
          closestInputBase: !!target.closest('.MuiInputBase-root'),
          eventPhase: event.eventPhase, // 1=capture, 2=target, 3=bubble
          blockingCondition: 'none'
        });
      }
      
      // CRITICAL FIX: Explizit prüfen, ob wir in einem Input sind 
      // und SOFORT returnen ohne preventDefault zu callen
      const isInInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.tagName === 'SELECT' ||
                       target.isContentEditable ||
                       target.closest('[contenteditable="true"]') ||
                       target.closest('.MuiInputBase-root') ||
                       target.closest('[role="textbox"]') ||
                       target.closest('[role="combobox"]') ||
                       target.closest('[role="spinbutton"]') ||
                       target.closest('input') ||
                       target.closest('textarea');
      
      if (isInInput) {
        // KEINE Intervention bei Input-Elementen - lasse Browser normal arbeiten
        console.log('✅ Input detected - event passthrough');
        return;
      }
      
      // EXTRA SICHERHEIT: Prüfe ob das Event von einem Dialog kommt
      const isFromDialog = target.closest('[role="dialog"]') || 
                           target.closest('.MuiDialog-root') ||
                           target.closest('[aria-modal="true"]');
      
      if (isFromDialog) {
        console.log('✅ Dialog detected - event passthrough');
        return; // Keine Navigation wenn in einem Dialog
      }
      
      // Nur auf Navigation-Keys reagieren, ABER nur wenn wir NICHT in einem Input sind
      const isArrowKey = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      const isSpecialKey = ['Home', 'Escape'].includes(event.key);
      
      if (!isArrowKey && !isSpecialKey) {
        return; // Ignoriere alle anderen Keys
      }

      // Bei Pfeiltasten nur reagieren wenn KEINE Modifier gedrückt sind
      if (isArrowKey && (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
        return;
      }

      console.log('⚡ Navigation key handled:', event.key);

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
          // Nur wenn kein Modifier gedrückt ist
          if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            handleToday();
          }
          break;
        case 'Escape':
          // Schließe offene Dialoge nur wenn wir nicht in einem Dialog-Input sind
          if (!target.closest('[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select')) {
            if (editShiftDialog.open) {
              handleCloseEditDialog();
            } else {
              setConflictDialog(prev => ({ ...prev, open: false }));
              setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: 0 });
              setWeekCopyDialog({ open: false });
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: false }); // CRITICAL: Use bubbling, not capture
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: false });
  }, []);

  const handlePrevWeek = () => {
    dispatch(navigateWeek('prev'));
  };

  const handleNextWeek = () => {
    dispatch(navigateWeek('next'));
  };

  const handleToday = () => {
  dispatch(setWeekDate(new Date().toISOString()));
  };

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

  // Hilfsfunktion: Prüfe ob ein Tag in einer Schließzeit liegt
  const isVacationDay = useCallback((date: Date): VacationPeriod | null => {
    return vacationPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      
      // Normalisiere alle Daten auf 00:00:00 Uhrzeit zur korrekten Vergleichung
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      const isInDateRange = normalizedDate >= normalizedStartDate && normalizedDate <= normalizedEndDate;
      
      // Wenn keine Organisation für die Periode definiert ist, gilt sie für alle
      if (!period.organizationId) {
        return isInDateRange;
      }
      
      // Wenn eine Organisation definiert ist, prüfe ob sie mit der aktuell ausgewählten übereinstimmt
      return isInDateRange && period.organizationId === selectedOrganization?.id;
    }) || null;
  }, [vacationPeriods, selectedOrganization]);

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
        // Zwei Abwesenheiten - prüfe Priorität und spezielle Regeln
        const newPriority = newShiftType.priority || 1;
        const existingPriority = existingShiftType.priority || 1;
        
        // Spezialregel: Urlaub und Krankheit können sich gegenseitig überschreiben
        const isNewUrlaubOrKrankheit = ['Urlaub', 'Krankheit'].includes(newShiftType.name);
        const isExistingUrlaubOrKrankheit = ['Urlaub', 'Krankheit'].includes(existingShiftType.name);
        
        if (isNewUrlaubOrKrankheit && isExistingUrlaubOrKrankheit) {
          // Urlaub und Krankheit können sich immer überschreiben - kein Konflikt
          console.log(`🔄 ${newShiftType.name} ersetzt ${existingShiftType.name} - automatische Überschreibung`);
        } else if (newPriority <= existingPriority) {
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
      
      // Time validation
      const [startHours, startMinutes] = defaultStartTime.split(':').map(Number);
      const [endHours, endMinutes] = defaultEndTime.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      if (endTimeInMinutes <= startTimeInMinutes) {
        setSnackbar({ 
          open: true, 
          message: 'Die Endzeit des Schichttyps muss nach der Startzeit liegen.', 
          severity: 'error' 
        });
        return;
      }
      
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
      console.log('🗑️ Deleting shift:', shiftId);
      await dispatch(deleteShift(parseInt(shiftId))).unwrap();
      
      console.log('✅ Shift deleted successfully, executing global state reset...');
      
      // Führe globales State-Reset aus
      executeGlobalReset();
      
      // Zusätzlich: Explicit lokale Dialog-Resets
      setEditShiftDialog({ open: false, shift: null });
      setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: Date.now() });
      setConflictDialog({ open: false, newShift: null, existingShifts: [], message: '' });
      setWeekCopyDialog({ open: false });
      
      // Refresh shifts after deletion
      dispatch(fetchShifts({}));
      setSnackbar({ open: true, message: 'Schicht erfolgreich gelöscht', severity: 'success' });
      
      // Aggressive focus recovery after deletion
      setTimeout(() => {
        console.log('🎯 Post-deletion focus recovery...');
        
        // Try to restore focus to any input field
        const anyInput = document.querySelector('input[type="date"], input[type="text"], input[type="time"], select, textarea') as HTMLElement;
        if (anyInput) {
          anyInput.focus();
          console.log('✅ Focus restored to:', anyInput.tagName, (anyInput as HTMLInputElement).type || 'unknown');
        } else {
          // Fallback: focus on body to clear any stuck focus
          document.body.focus();
          console.log('🔄 Fallback: Focus set to body');
        }
      }, 300);
      
      console.log('🔄 State reset completed after shift deletion');
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Schicht:', error);
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
    
    // Speichere die Original-Daten für Änderungsvergleich
    setOriginalShiftData({ ...shiftWithDefaults });
    setEditShiftDialog({ open: true, shift: shiftWithDefaults });
  };

  const handleUpdateShift = async (updatedShift: any) => {
    try {
      console.log('handleUpdateShift: Updating shift with data:', updatedShift);
      
      // Time validation
      const [startHours, startMinutes] = updatedShift.startTime.split(':').map(Number);
      const [endHours, endMinutes] = updatedShift.endTime.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      if (endTimeInMinutes <= startTimeInMinutes) {
        setSnackbar({ 
          open: true, 
          message: 'Die Endzeit muss nach der Startzeit liegen.', 
          severity: 'error' 
        });
        return;
      }
      
      // Nur die Felder senden, die aktualisiert werden können
      // WICHTIG: API erwartet start_time/end_time (Unterstrich), nicht startTime/endTime
      const updateData = {
        start_time: updatedShift.startTime,
        end_time: updatedShift.endTime,
        notes: updatedShift.notes
      };
      
      console.log('handleUpdateShift: Sending update data:', updateData);
      await dispatch(updateShift({ id: parseInt(updatedShift.id), data: updateData })).unwrap();
      console.log('handleUpdateShift: Update successful, refreshing data');
      dispatch(fetchShifts({}));
      
      // Reset original data BEFORE closing dialog to prevent change detection
      setOriginalShiftData(null);
      setEditShiftDialog({ open: false, shift: null });
      setSnackbar({ open: true, message: 'Schicht erfolgreich aktualisiert', severity: 'success' });
    } catch (error) {
      console.error('handleUpdateShift: Error updating shift:', error);
      setSnackbar({ open: true, message: 'Fehler beim Aktualisieren der Schicht', severity: 'error' });
    }
  };

  const handleCellClick = (employeeId: number, date: Date) => {
    console.log('🖱️ Cell clicked, opening dialog with focus recovery...');
    
    // Force close any existing dialog first
    setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: 0 });
    
    // Use setTimeout to ensure state is updated before opening new dialog
    setTimeout(() => {
      setBulkCreateDialog({
        open: true,
        employeeId,
        date: format(date, 'yyyy-MM-dd'),
        resetKey: Date.now() + Math.random() // Unique reset key with randomization
      });
      
      // Additional focus recovery attempt
      setTimeout(() => {
        console.log('🎯 Post-dialog focus recovery attempt...');
        const firstInput = document.querySelector('input[type="date"], input[type="text"], select') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
          console.log('✅ Focus recovered on first input');
        }
      }, 200);
    }, 50);
  };

  const handleCopyWeek = async () => {
    try {
      // Hole alle Schichten der aktuellen Woche für die ausgewählte Organisation
      const currentWeekShifts = shifts.filter((shift: any) => {
  const shiftDate = new Date(shift.date);
  const isInCurrentWeek = weekDays.some(weekDay => isSameDay(shiftDate, weekDay));
  
  // Debug: Zeige die verfügbaren Felder der ersten Schicht
  if (shifts.length > 0 && shifts[0] === shift) {
    console.log('🔍 Debug: Verfügbare Felder in Schicht-Objekten:', {
      sampleShift: shift,
      availableFields: Object.keys(shift),
      organizationFields: {
        organizationId: shift.organizationId,
        organization_id: shift.organization_id,
        organizationUnitId: shift.organizationUnitId,
        orgId: shift.orgId,
        unitId: shift.unitId
      }
    });
  }
  
  // Nur Schichten für die ausgewählte Organisation berücksichtigen
  // Unterstütze verschiedene Feldnamen für Kompatibilität
  const isFromSelectedOrganization = selectedOrganization 
    ? (shift.organizationId === selectedOrganization.id || 
       shift.organization_id === selectedOrganization.id ||
       shift.organizationUnitId === selectedOrganization.id ||
       shift.orgId === selectedOrganization.id ||
       shift.unitId === selectedOrganization.id)
    : true; // Falls keine Organisation ausgewählt ist, alle Schichten berücksichtigen
  
  return isInCurrentWeek && isFromSelectedOrganization;
});

console.log('Wochenduplizierung - Filter-Debug:', {
  selectedOrganization: selectedOrganization?.name,
  selectedOrgId: selectedOrganization?.id,
  totalShifts: shifts.length,
  currentWeekShifts: currentWeekShifts.length
});

      if (currentWeekShifts.length === 0) {
        const orgMessage = selectedOrganization 
          ? ` für die Organisation "${selectedOrganization.name}"`
          : '';
        setSnackbar({ 
          open: true, 
          message: `Keine Schichten in der aktuellen Woche${orgMessage} gefunden`, 
          severity: 'error' 
        });
        setWeekCopyDialog({ open: false });
        return;
      }

      // Prüfe auf bereits existierende Schichten in der Zielwoche und filtere Duplikate heraus
      const shiftsToCreate: any[] = [];
      let duplicatesFound = 0;
      
      for (const shift of currentWeekShifts) {
        const newDate = addDays(new Date(shift.date), 7);
        const newDateString = format(newDate, 'yyyy-MM-dd');
        
        // Prüfe ob bereits eine Schicht für diesen Mitarbeiter und Tag existiert (nur in der gleichen Organisation)
        const existingShiftInTargetWeek = shifts.find((existingShift: any) => {
          const sameEmployee = (existingShift.employeeId || existingShift.employee_id) === (shift.employeeId || shift.employee_id);
          const sameDate = existingShift.date === newDateString;
          const sameShiftType = (existingShift.shiftTypeId || existingShift.shift_type_id) === (shift.shiftTypeId || shift.shift_type_id);
          
          // Prüfe auch, dass die Schicht zur gleichen Organisation gehört
          const sameOrganization = selectedOrganization 
            ? (existingShift.organizationId === selectedOrganization.id || 
               existingShift.organization_id === selectedOrganization.id ||
               existingShift.organizationUnitId === selectedOrganization.id)
            : true;
          
          return sameEmployee && sameDate && sameShiftType && sameOrganization;
        });

        if (existingShiftInTargetWeek) {
          duplicatesFound++;
          console.log(`⚠️ Duplikat gefunden: Schicht für Mitarbeiter ${shift.employeeId} am ${newDateString} bereits vorhanden`);
          continue; // Überspringe diese Schicht
        }

        const newShiftData = {
          shiftTypeId: shift.shiftTypeId || shift.shift_type_id,
          employeeId: shift.employeeId || shift.employee_id,
          date: newDateString,
          startTime: shift.startTime || shift.start_time,
          endTime: shift.endTime || shift.end_time,
          notes: shift.notes || '',
          organizationUnitId: selectedOrganization?.id || '1'
        };
        
        shiftsToCreate.push(newShiftData);
      }

      if (shiftsToCreate.length === 0 && duplicatesFound > 0) {
        setSnackbar({ 
          open: true, 
          message: `Alle ${duplicatesFound} Schichten existieren bereits in der Zielwoche. Keine neuen Schichten erstellt.`, 
          severity: 'warning' 
        });
        setWeekCopyDialog({ open: false });
        return;
      }

      // Erstelle nur die Schichten, die noch nicht existieren
      const promises = shiftsToCreate.map(async (shiftData: any) => {
        return dispatch(createShift(shiftData)).unwrap();
      });

      await Promise.all(promises);
      
      dispatch(fetchShifts({}));
      setWeekCopyDialog({ open: false });
      
      let message = `${shiftsToCreate.length} Schichten erfolgreich in die nächste Woche kopiert`;
      if (duplicatesFound > 0) {
        message += ` (${duplicatesFound} Duplikate übersprungen)`;
      }
      
      setSnackbar({ open: true, message, severity: 'success' });
    } catch (error) {
      console.error('Fehler beim Kopieren der Woche:', error);
      setSnackbar({ open: true, message: 'Fehler beim Kopieren der Woche', severity: 'error' });
      setWeekCopyDialog({ open: false });
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
              label={shiftType.name}
              sx={{
                backgroundColor: shiftType.color,
                color: 'white',
                cursor: 'grab',
                '&:hover': { transform: 'scale(1.05)' },
                '&:active': { cursor: 'grabbing' }
              }}
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
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={`Organisation: ${selectedOrganization.name}`}
            sx={(theme) => ({
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.main,
              color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.contrastText,
              fontWeight: 'bold',
              boxShadow: theme.shadows[2],
            })}
          />
          {selectedOrganization.openingHours && (
            <Chip
              size="small"
              label={getWeeklyOpeningSummary(selectedOrganization.openingHours)}
              variant="outlined"
              sx={(theme) => ({
                fontSize: '0.75rem',
                color: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
              })}
            />
          )}
        </Box>
      )}

      {/* Wochenansicht-Grid */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold' }}>
                Mitarbeiter
              </TableCell>
              {weekDays.map((day, index) => {
                const isCurrentDay = isToday(day);
                const holiday = getHolidayForDay(day);
                const vacation = isVacationDay(day);
                
                return (
                  <TableCell 
                    key={index} 
                    align="center"
                    sx={(theme) => ({ 
                      minWidth: 120,
                      fontWeight: 'bold',
                      backgroundColor: isCurrentDay ? (theme.palette.mode === 'dark' ? 'rgba(208, 188, 255, 0.1)' : '#e3f2fd')
                        : vacation ? (theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0')
                        : holiday ? (theme.palette.mode === 'dark' ? 'rgba(0, 150, 136, 0.1)' : '#e0f2f1') 
                        : 'inherit',
                      color: isCurrentDay ? theme.palette.primary.main 
                        : vacation ? theme.palette.warning.dark
                        : holiday ? theme.palette.info.dark
                        : 'inherit',
                      borderBottom: isCurrentDay ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                    })}
                  >
                    <Box>
                      <Typography variant="caption" display="block">
                        {format(day, 'EEEE', { locale: de })}
                      </Typography>
                      <Typography variant="subtitle2">
                        {format(day, 'dd.MM')}
                      </Typography>
                      {holiday && (
                        <Typography variant="caption" display="block" color="info.main" sx={{ fontSize: '0.6rem' }}>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell sx={{ fontWeight: 'medium' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.main',
                      color: (theme) => theme.palette.mode === 'dark' ? '#1D1B20' : theme.palette.primary.contrastText
                    }}>
                      {employee.firstName?.[0]}{employee.lastName?.[0]}
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
                  const holiday = getHolidayForDay(day);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <TableCell 
                      key={dayIndex}
                      sx={(theme) => ({ 
                        padding: 1,
                        verticalAlign: 'top',
                        height: 80,
                        position: 'relative',
                        backgroundColor: vacation ? (theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.05)' : '#fff8e1')
                          : holiday ? (theme.palette.mode === 'dark' ? 'rgba(0, 150, 136, 0.05)' : '#e0f2f1')
                          : 'inherit',
                        borderLeft: vacation ? `2px solid ${theme.palette.warning.main}`
                          : holiday ? `2px solid ${theme.palette.info.main}`
                          : `1px solid ${theme.palette.divider}`,
                        '&:hover': { backgroundColor: vacation ? (theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0')
                            : holiday ? (theme.palette.mode === 'dark' ? 'rgba(0, 150, 136, 0.1)' : '#b2dfdb')
                            : theme.palette.action.hover },
                        opacity: vacation ? 0.8 : 1,
                        ...(isCurrentDay && !vacation && {
                          borderTop: `2px solid ${theme.palette.primary.main}`,
                        }),
                      })}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (vacation) {
                          // Verhindere Schicht-Drop während Schließzeiten
                          return;
                        }
                        const shiftTypeData = e.dataTransfer.getData('shiftType');
                        const existingShiftData = e.dataTransfer.getData('existingShift');
                        if (shiftTypeData) {
                          const shiftType = JSON.parse(shiftTypeData);
                          handleShiftDrop(shiftType, employee.id, day);
                        } else if (existingShiftData) {
                          const draggedShift = JSON.parse(existingShiftData);
                          // Prüfe Konflikte: reguläre Schichten dürfen pro Tag nur einmal pro Mitarbeiter existieren
                          const newShiftData = {
                            shiftTypeId: draggedShift.shiftTypeId || draggedShift.shift_type_id,
                            employeeId: employee.id.toString(),
                            date: format(day, 'yyyy-MM-dd'),
                            startTime: draggedShift.startTime || draggedShift.start_time,
                            endTime: draggedShift.endTime || draggedShift.end_time,
                            notes: draggedShift.notes || '',
                            organizationUnitId: selectedOrganization?.id || '1'
                          };

                          const conflictCheck = checkShiftConflicts(newShiftData);
                          if (conflictCheck.hasConflict && !conflictCheck.canOverride) {
                            setSnackbar({ open: true, message: conflictCheck.conflicts[0].message, severity: 'error' });
                            return;
                          }

                          if (conflictCheck.hasConflict && conflictCheck.canOverride) {
                            // Überschreib-Dialog: lösche betroffene Schichten und verschiebe
                            setConflictDialog({
                              open: true,
                              newShift: newShiftData,
                              existingShifts: conflictCheck.conflicts.map(c => c.existing),
                              message: conflictCheck.conflicts[0].message
                            });
                            // Speichere temporär die zu verschiebende Shift-ID in newShiftData
                            (newShiftData as any)._moveShiftId = draggedShift.id;
                            return;
                          }

                          // Kein Konflikt: verschiebe direkt
                          dispatch(updateShift({
                            id: parseInt(draggedShift.id),
                            data: {
                              employeeId: employee.id.toString(),
                              date: format(day, 'yyyy-MM-dd')
                            }
                          }))
                            .unwrap()
                            .then(() => {
                              dispatch(fetchShifts({}));
                              setSnackbar({ open: true, message: 'Schicht verschoben', severity: 'success' });
                            })
                            .catch(() => setSnackbar({ open: true, message: 'Fehler beim Verschieben der Schicht', severity: 'error' }));
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
                      <Box sx={{ minHeight: 60, position: 'relative', zIndex: 1 }}>
                        {/* Feiertag anzeigen (wie in MonthView) */}
                        {holiday && !vacation && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.6rem',
                              color: 'error.main',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              display: 'block',
                              mb: 0.5,
                              backgroundColor: 'error.light',
                              padding: '2px 4px',
                              borderRadius: 1,
                              lineHeight: 1
                            }}
                          >
                            🎄 {holiday.name}
                          </Typography>
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
                        
                        {!vacation && employeeShifts.map((shift: any) => {
                          // ShiftType über ID finden
                          const shiftType = shiftTypes.find((st: any) => 
                            st.id.toString() === (shift.shiftTypeId || shift.shift_type_id)?.toString()
                          );
                          
                          // Fallback-Werte
                          const shiftTypeName = shiftType?.name || shift.shiftTypeName || 'Unbekannt';
                          const shiftTypeColor = shiftType?.color || shift.shiftTypeColor || '#999';
                          const shiftTypeCategory = shiftType?.category || shift.shiftTypeCategory || 'regular';
                          
                          return (
                            <Card 
                              key={shift.id} 
                              sx={{ 
                                mb: 0.5, 
                                cursor: 'pointer',
                                minHeight: 40,
                                height: 'auto',
                                position: 'relative',
                                backgroundColor: shiftTypeColor, // Korrekte Hintergrundfarbe aus shiftType
                                transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                                '&:hover': { 
                                  transform: 'scale(1.03)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                  zIndex: 5,
                                  backgroundColor: shiftTypeColor, // Farbe beibehalten
                                  '& .delete-button': { display: 'flex' }
                                }
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('existingShift', JSON.stringify(shift));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditShift(shift);
                              }}
                            >
                              <CardContent sx={{ 
                                p: 0.5, 
                                '&:last-child': { pb: 0.5 },
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: 'white',
                                    lineHeight: 1.1,
                                    fontSize: '0.7rem',
                                    textAlign: 'center'
                                  }}
                                >
                                  {shiftTypeCategory === 'absence' 
                                    ? `🏖️ ${shiftTypeName}` 
                                    : shiftTypeName
                                  }
                                </Typography>
                                
                                {/* Uhrzeit darunter (nur bei regulären Schichten) */}
                                {shiftTypeCategory !== 'absence' && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.65rem',
                                      color: 'rgba(255,255,255,0.9)',
                                      lineHeight: 1,
                                      textAlign: 'center'
                                    }}
                                  >
                                    {shift.startTime} - {shift.endTime}
                                  </Typography>
                                )}
                                {/* Delete Button - für ALLE Schichten, auch Urlaub/Krankheit */}
                                <Box
                                  className="delete-button"
                                  component="div"
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: 4,
                                    transform: 'translateY(-50%)',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    display: 'none',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'error.dark' },
                                    zIndex: 10
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteShift(shift.id);
                                  }}
                                >
                                  <CancelIcon sx={{ fontSize: 14 }} />
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    </TableCell>
                  );
                })}
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
        onClose={handleCloseEditDialog}
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
          <Button onClick={handleCloseEditDialog}>
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

      {/* Close Confirmation Dialog for Edit Shift */}
      <Dialog 
        open={closeConfirmDialog} 
        onClose={() => setCloseConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            padding: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600
        }}>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            backgroundColor: (theme) => theme.palette.warning.main + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ⚠️
          </Box>
          Ungespeicherte Änderungen
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography>
            Sie haben Änderungen an der Schicht vorgenommen, die noch nicht gespeichert wurden. 
            Möchten Sie das Formular wirklich schließen? Alle Änderungen gehen verloren.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setCloseConfirmDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={confirmCloseEditDialog} 
            variant="contained"
            color="warning"
            sx={{ borderRadius: 2 }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog 
        open={bulkCreateDialog.open}
        onClose={() => setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: 0 })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schicht für Zeitraum erstellen</DialogTitle>
        <DialogContent>
          <BulkCreateShiftForm 
            employeeId={bulkCreateDialog.employeeId}
            initialDate={bulkCreateDialog.date}
            shiftTypes={shiftTypes}
            resetKey={bulkCreateDialog.resetKey}
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
                  console.log('BulkCreate: Creating shift:', shiftData);
                  await dispatch(createShift(shiftData)).unwrap();
                  currentDate.setDate(currentDate.getDate() + 1);
                }

                dispatch(fetchShifts({}));
                setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: 0 });
                setSnackbar({ open: true, message: 'Schichten erfolgreich erstellt', severity: 'success' });
              } catch (error) {
                console.error('Fehler beim Erstellen der Schichten:', error);
                setSnackbar({ open: true, message: 'Fehler beim Erstellen der Schichten', severity: 'error' });
              }
            }}
            onCancel={() => setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: 0 })}
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
                
                console.log('Conflict Dialog Debug:', {
                  shift,
                  shiftTypeId,
                  employeeId,
                  shiftType,
                  employee
                });
                
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
                console.log('🗑️ Deleting conflicting shifts and creating new...');
                
                for (const existingShift of conflictDialog.existingShifts) {
                  const shiftId = existingShift.id;
                  console.log('Deleting conflicting shift:', shiftId, existingShift);
                  await dispatch(deleteShift(parseInt(shiftId))).unwrap();
                }
                
                console.log('✅ Conflicting shifts deleted, executing global state reset...');
                
                // Führe globales State-Reset aus
                executeGlobalReset();
                
                // Alle Dialog-States zurücksetzen nach dem Löschen
                setEditShiftDialog({ open: false, shift: null });
                setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: Date.now() });
                
                await createShiftWithData(conflictDialog.newShift);
                setConflictDialog(prev => ({ ...prev, open: false }));
                
                console.log('🔄 State reset completed after conflict resolution');
              } catch (error) {
                console.error('❌ Fehler beim Überschreiben der Schicht:', error);
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