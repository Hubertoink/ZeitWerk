import React, { useEffect, useMemo, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts, deleteShift } from '../../store/slices/shiftSlice';
import { setWeekDate, setMonthDate } from '../../store/slices/calendarSlice';
import { fetchOrganizations, setSelectedOrganization } from '../../store/slices/organizationSlice';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Holiday, isHoliday, loadHolidaysForRange } from '../../utils/holidays';
import { saveDashboardExcel } from '../../utils/excelExport';
import { VacationPeriod } from '../../types/settings';
import { useSettings } from '../../contexts/SettingsContext';

const parseEmploymentDate = (value?: string) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isEmployeeActiveInRange = (employee: any, startDate: Date, endDate: Date) => {
  const hireDate = parseEmploymentDate(employee?.hireDate);
  const exitDate = parseEmploymentDate(employee?.exitDate);
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (hireDate && hireDate > end) return false;
  if (exitDate && exitDate < start) return false;

  return true;
};

const MonthView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { settings, isLoading } = useSettings();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const lowGpu = !!settings?.ui?.lowGpuMode;
  // Use Redux calendar monthDate if available, else default to today
  const globalCalendar = useAppSelector((state: any) => state.calendar);
  const initialDate = globalCalendar?.monthDate
    ? new Date(globalCalendar.monthDate)
    : globalCalendar?.weekDate
    ? new Date(globalCalendar.weekDate)
    : new Date();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const selectedDate = globalCalendar?.selectedDate ? new Date(globalCalendar.selectedDate) : null;

  // Keep local currentDate in sync with global calendar month date when it changes elsewhere (e.g., WeekView)
  useEffect(() => {
    const globalDate = globalCalendar?.monthDate ? new Date(globalCalendar.monthDate) : null;
    if (globalDate && globalDate.toDateString() !== currentDate.toDateString()) {
      setCurrentDate(globalDate);
    }
  }, [globalCalendar?.monthDate]);
  // local loading indicator not needed; rely on slice statuses if necessary
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { shifts } = useAppSelector((state: any) => state.shifts);
  const { organizations, selectedOrganization } = useAppSelector((state: any) => state.organizations);

  // Lade Daten beim Komponenten-Mount und Datumswechsel
  useEffect(() => {
    const loadData = async () => {
  // start loading
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      // Erweitere den Zeitraum um den sichtbaren Kalenderbereich
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      
      console.log('MonthView: Loading data for', format(calendarStart, 'yyyy-MM-dd'), 'to', format(calendarEnd, 'yyyy-MM-dd'));
      
      // Fetch only when slices are empty to avoid redundant work on every view switch
      const shouldFetchEmployees = !employees || (Array.isArray(employees) && employees.length === 0);
      const shouldFetchShiftTypes = !shiftTypes || (Array.isArray(shiftTypes) && shiftTypes.length === 0);
      const shouldFetchOrganizations = !organizations || (Array.isArray(organizations) && organizations.length === 0);
      const shouldFetchShifts = !shifts || (Array.isArray(shifts) && shifts.length === 0);

      const promises: any[] = [];
      if (shouldFetchEmployees) promises.push(dispatch(fetchEmployees()));
      if (shouldFetchShiftTypes) promises.push(dispatch(fetchShiftTypes()));
      if (shouldFetchOrganizations) promises.push(dispatch(fetchOrganizations()));
      if (shouldFetchShifts) promises.push(dispatch(fetchShifts({
        startDate: format(calendarStart, 'yyyy-MM-dd'),
        endDate: format(calendarEnd, 'yyyy-MM-dd')
      })));
      await Promise.all(promises);

      // Lade Feiertage für den Monat
      try {
        const holidaysData = await loadHolidaysForRange(
          calendarStart, 
          calendarEnd,
          settings?.calendar?.holidayRegion || 'BY'
        );
        setHolidays(holidaysData);
      } catch (error) {
        console.error('Fehler beim Laden der Feiertage:', error);
      }

      // Lade Schließzeiten/Urlaubsperioden aus den Einstellungen  
      if (settings?.calendar?.vacationPeriods) {
        setVacationPeriods(settings.calendar.vacationPeriods);
      }
      
  // done loading
    };
    
    loadData();
  }, [dispatch, currentDate, settings?.calendar?.holidayRegion]);

  // Navigation functions
  const handleGoToWeek = (date: Date) => {
    try {
      // Set clicked day as current week focus and align month, then navigate to week view
      const iso = date.toISOString();
      dispatch(setWeekDate(iso));
      dispatch(setMonthDate(iso));
      navigate('/week');
    } catch {}
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const next = subMonths(prev, 1);
      dispatch(setMonthDate(next.toISOString()));
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const next = addMonths(prev, 1);
      dispatch(setMonthDate(next.toISOString()));
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const iso = today.toISOString();
    dispatch(setMonthDate(iso));
    dispatch(setWeekDate(iso));
  };

  // Helper like in Dashboard to compute duration string
  const calculateDuration = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}:${String(diffMinutes).padStart(2, '0')}h`;
    } catch {
      return '';
    }
  };

  // Excel Export (Dashboard logic) for the current month
  const handleDashboardExport = async () => {
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      // Ensure data is loaded for the range and reference lists
      await Promise.all([
        dispatch(fetchShifts({ startDate: format(startDate, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') })),
        dispatch(fetchEmployees()),
        dispatch(fetchShiftTypes()),
        dispatch(fetchOrganizations())
      ]);

      // brief wait to let slices update
      await new Promise(resolve => setTimeout(resolve, 500));
      const state = (window as any).store?.getState?.();
      const latestShifts = state?.shifts?.shifts || (useAppSelector as any)?.shifts || (shifts || []);
      const latestEmployees = state?.employees?.employees || (employees || []);
      const latestShiftTypes = state?.shiftTypes?.shiftTypes || (shiftTypes || []);
      const latestOrganizations = state?.organizations?.organizations || (organizations || []);

      const exportEmployees = latestEmployees.filter((emp: any) => {
        const employeeOrgId = (emp.organizationId || emp.organization_id)?.toString?.();
        const selectedOrgId = selectedOrganization?.id?.toString?.();
        const inOrg = !selectedOrgId || employeeOrgId === selectedOrgId;
        return inOrg && isEmployeeActiveInRange(emp, startDate, endDate);
      });

      // Filter by time range and selected org
      const timeRangeShifts = (latestShifts || []).filter((shift: any) => {
        const d = new Date(shift.date);
        const inRange = d >= startDate && d <= endDate;
        const so = selectedOrganization?.id;
        const inOrg = !so || (
          (shift.organizationId != null && shift.organizationId.toString?.() === so.toString?.()) ||
          (shift.organization_id != null && shift.organization_id.toString?.() === so.toString?.())
        );
        return inRange && inOrg;
      });

      const getOrganizationById = (id: number) => (latestOrganizations || []).find((org: any) => org.id === id);

      const exportData: any = {
        metadata: {
          organization: selectedOrganization?.name || 'Alle Organisationen',
          organizationId: selectedOrganization?.id,
          exportDate: format(new Date(), 'dd.MM.yyyy HH:mm'),
          timeRange: `${format(startDate, 'dd.MM.yyyy')} - ${format(endDate, 'dd.MM.yyyy')}`,
          totalRecords: {
            shifts: timeRangeShifts.length,
            employees: exportEmployees.length,
            shiftTypes: latestShiftTypes.length,
            organizations: latestOrganizations.length
          }
        },
        vacationPeriods: (settings?.calendar?.vacationPeriods || vacationPeriods || []).map((p: any) => ({
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
          affectsScheduling: p.affectsScheduling !== false,
          organizationId: p.organizationId
        })),
        statistics: {
          totalShifts: timeRangeShifts.length,
          // Removed assignedRate; include minimal set like Dashboard
          unassignedShifts: timeRangeShifts.filter((s: any) => !s.employee_id && !s.employeeId).length,
          employees: exportEmployees.length,
          organizations: latestOrganizations.length,
          shiftTypes: latestShiftTypes.length
        },
        organizations: latestOrganizations.map((org: any) => ({
          id: org.id,
          name: org.name,
          description: org.description || '',
          address: org.address || '',
          contactPerson: org.contact_person || '',
          phone: org.phone || '',
          email: org.email || ''
        })),
        employees: exportEmployees.map((emp: any) => ({
          id: emp.id,
          firstName: emp.firstName || emp.first_name,
          lastName: emp.lastName || emp.last_name,
          email: emp.email || '',
          phone: emp.phone || '',
          position: emp.position || '',
          organizationId: emp.organizationId || emp.organization_id,
          organizationName: getOrganizationById(emp.organizationId || emp.organization_id)?.name || 'Unbekannt',
          hourlyRate: emp.hourlyRate || emp.hourly_rate || 0,
          isActive: (emp.isActive !== undefined ? emp.isActive : emp.is_active) ? 'Ja' : 'Nein',
          weeklyHours: (typeof (emp as any).weeklyHours === 'number') ? (emp as any).weeklyHours : (typeof (emp as any).weekly_hours === 'number' ? (emp as any).weekly_hours : undefined),
          // provide daily plan so month export can count planned hours for ganztägige Abwesenheit
          dailyHoursPlan: (emp as any).dailyHoursPlan || undefined
        })),
        shiftTypes: latestShiftTypes.map((st: any) => ({
          id: st.id,
          name: st.name,
          description: st.description || '',
          startTime: st.startTime || st.start_time || '',
          endTime: st.endTime || st.end_time || '',
          isFlexible: (st.isFlexible !== undefined ? st.isFlexible : st.is_flexible) ? 'Ja' : 'Nein',
          color: st.color || '#1976d2',
          colorHex: st.color || '#1976d2',
          displayTime: (st.isFlexible !== undefined ? st.isFlexible : st.is_flexible) ? 'Flexibel' : `${st.startTime || st.start_time || 'N/A'} - ${st.endTime || st.end_time || 'N/A'}`,
          category: st.category,
          countsTowardHours: st.countsTowardHours,
          isAllDay: st.isAllDay
        })),
        shifts: timeRangeShifts.map((shift: any) => {
          const employee = latestEmployees.find((emp: any) => emp.id === (shift.employeeId || shift.employee_id));
          const shiftType = latestShiftTypes.find((st: any) => st.id === (shift.shiftTypeId || shift.shift_type_id));
          const organization = latestOrganizations.find((org: any) => org.id === (shift.organizationId || shift.organization_id));
          return {
            id: shift.id,
            date: format(new Date(shift.date), 'dd.MM.yyyy'),
            weekday: format(new Date(shift.date), 'EEEE', { locale: de }),
            startTime: shift.startTime || shift.start_time,
            endTime: shift.endTime || shift.end_time,
            duration: (shift.startTime || shift.start_time) && (shift.endTime || shift.end_time) ? calculateDuration(shift.startTime || shift.start_time, shift.endTime || shift.end_time) : '',
            shiftTypeId: shift.shiftTypeId || shift.shift_type_id,
            shiftTypeName: shiftType?.name || 'Unbekannt',
            shiftTypeColor: shiftType?.color || '#1976d2',
            shiftTypeCategory: (shiftType as any)?.category,
            shiftTypeCountsTowardHours: (shiftType as any)?.countsTowardHours,
            shiftTypeIsAllDay: (shiftType as any)?.isAllDay === true,
            employeeId: shift.employeeId || shift.employee_id || '',
            employeeName: employee ? `${employee.firstName || employee.first_name || 'N/A'} ${employee.lastName || employee.last_name || 'N/A'}` : 'Nicht besetzt',
            employeePosition: employee?.position || '',
            organizationId: shift.organizationId || shift.organization_id,
            organizationName: organization?.name || 'Unbekannt',
            notes: shift.notes || '',
            isAssigned: (shift.employeeId || shift.employee_id) ? 'Ja' : 'Nein'
          };
        })
      };

      const res = await saveDashboardExcel(exportData, `Dienstplan_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
      if (!res.ok) {
        setSnackbar({ open: true, message: 'Excel-Export fehlgeschlagen oder nicht verfügbar.', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: res.path ? `Gespeichert unter: ${res.path}` : 'Excel-Export gespeichert.', severity: 'success' });
      }
    } catch (e) {
      console.error('Dashboard Excel export (MonthView) error:', e);
      setSnackbar({ open: true, message: 'Fehler beim Excel-Export', severity: 'error' });
    }
  };

  // Tastatur-Navigation - nur für spezifische Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Explizit prüfen, ob wir in einem Input sind - wenn ja, komplett raus
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.MuiInputBase-root') ||
          target.closest('[role="textbox"]') ||
          target.closest('[role="combobox"]') ||
          target.closest('[role="spinbutton"]')) {
        return; // Komplett raus bei jeder Art von Input
      }
      
      // Nur auf Pfeiltasten + Modifier oder spezielle Keys reagieren
      const isArrowKey = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      const isSpecialKey = ['Home'].includes(event.key);
      
      if (!isArrowKey && !isSpecialKey) {
        return; // Ignoriere alle anderen Keys
      }

      // Bei Pfeiltasten nur reagieren wenn KEINE Modifier gedrückt sind
      if (isArrowKey && (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousMonth();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextMonth();
          break;
        case 'Home':
          if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            handleToday();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Auto-select first organization if none selected
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      console.log('MonthView: Auto-selecting first organization:', organizations[0]);
      dispatch(setSelectedOrganization(organizations[0]));
    }
  }, [organizations, selectedOrganization, dispatch]);

  // Filter employees by selected organization (wie in WeekView)
  const filteredEmployees = selectedOrganization 
    ? (employees || []).filter((emp: any) => emp.organizationId === selectedOrganization.id)
    : (employees || []);

  useEffect(() => {
    console.log('MonthView: Loaded data:', {
      employees: (employees || []).length,
      filteredEmployees: filteredEmployees.length,
      shiftTypes: (shiftTypes || []).length,
      shifts: (shifts || []).length,
      organizations: (organizations || []).length,
      selectedOrganization,
      shiftsData: shifts
    });
  }, [employees, filteredEmployees, shiftTypes, shifts, organizations, selectedOrganization]);

  // Berechne Kalender-Tage (6 Wochen Grid)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Hilfsfunktionen
  // Build an index of shifts per date (and org) to avoid filtering on every render cell
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    const all = Array.isArray(shifts) ? shifts : [];
    for (const s of all) {
      // Normalize any date string/object to local 'yyyy-MM-dd' to ensure stable matching
      let shiftDateStr: string;
      try {
        const d = new Date(s.date);
        shiftDateStr = format(d, 'yyyy-MM-dd');
      } catch {
        // Fallback: best-effort use original
        shiftDateStr = String(s.date);
      }
      // Korrigiere Organization-Filterung - unterstütze beide Feldnamen
      const orgMatch = !selectedOrganization || 
        (s.organizationId && s.organizationId.toString() === selectedOrganization.id.toString()) ||
        (s.organization_id && s.organization_id.toString() === selectedOrganization.id.toString());
      if (!orgMatch) continue;
      const arr = map.get(shiftDateStr) || [];
      arr.push(s);
      map.set(shiftDateStr, arr);
    }
    return map;
  }, [shifts, selectedOrganization]);

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Primary fast path via map
    const list = shiftsByDate.get(dateStr);
    if (list && list.length) return list;
    // Fallback: some records may have date strings with timezone effects; filter raw shifts defensively
    const all = Array.isArray(shifts) ? shifts : [];
    return all.filter((s: any) => {
      try {
        const d = new Date(s.date);
        return format(d, 'yyyy-MM-dd') === dateStr && (
          !selectedOrganization ||
          (s.organizationId && s.organizationId.toString() === selectedOrganization.id.toString()) ||
          (s.organization_id && s.organization_id.toString() === selectedOrganization.id.toString())
        );
      } catch { return false; }
    });
  };

  const getEmployeeById = (id: number | string) => {
    if (!id) return null;
    const allEmployees = employees || [];
    return allEmployees.find((emp: any) => emp.id.toString() === id.toString());
  };

  const getShiftTypeById = (id: number | string) => {
    if (!id) return null;
    const allShiftTypes = shiftTypes || [];
    return allShiftTypes.find((st: any) => st.id.toString() === id.toString());
  };

  // Hilfsfunktion: Prüfe ob ein Tag in einer Schließzeit liegt
  const isVacationDay = (date: Date): VacationPeriod | null => {
    // Parse 'yyyy-MM-dd' as local date to avoid timezone shifts
    const parseLocalYMD = (s?: string) => {
      if (!s) return null;
      const parts = s.split('-').map(Number);
      if (parts.length !== 3 || parts.some(n => isNaN(n as number))) return null;
      const [y, m, d] = parts as [number, number, number];
      return new Date(y, m - 1, d);
    };
    return vacationPeriods.find(period => {
      const startDate = parseLocalYMD(period.startDate) || new Date(period.startDate);
      const endDate = parseLocalYMD(period.endDate) || new Date(period.endDate);
      
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
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Monatsansicht
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button 
            variant="contained"
            onClick={handleDashboardExport}
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
            Excel Export
          </Button>

          <Button variant="outlined" onClick={handleToday}>
            Heute
          </Button>
          
          {/* Tastatur-Navigation Info */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            backgroundColor: 'action.hover',
            padding: 1,
            borderRadius: 1,
            ml: 1
          }}>
            <Typography variant="caption" color="text.secondary">
              Tastatur:
            </Typography>
            <Chip size="small" label="← →" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">
              Monat
            </Typography>
            <Chip size="small" label="Home" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">
              Heute
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Monats-Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton onClick={handlePreviousMonth} size="large">
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </Typography>
          
          <IconButton onClick={handleNextMonth} size="large">
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>

      {/* Organisation Info (wie in WeekView) */}
      {selectedOrganization && (
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`Organisation: ${selectedOrganization.name}`}
            sx={(theme) => ({
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.main,
              color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.contrastText,
              fontWeight: 'bold',
              boxShadow: theme.shadows[2],
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
              }
            })}
          />
        </Box>
      )}

      {/* Info wenn keine Mitarbeiter vorhanden */}
      {filteredEmployees.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, mb: 2 }}>
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

      {/* Kalender */}
  <Paper sx={{ p: 2 }}>
        {/* Wochentage Header */}
        <Grid container sx={{ mb: 1 }}>
          {weekDays.map((day) => (
            <Grid item xs={12/7} key={day}>
              <Box sx={{ 
                p: 1, 
                textAlign: 'center', 
                fontWeight: 'bold',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(103, 80, 164, 0.08)',
                backdropFilter: lowGpu ? 'none' : 'blur(8px)',
                color: (theme) => theme.palette.mode === 'dark' 
                  ? theme.palette.primary.light 
                  : theme.palette.primary.main
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: (theme) => theme.palette.mode === 'dark' 
                      ? theme.palette.primary.light 
                      : theme.palette.primary.main
                  }}
                >
                  {day}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Kalender-Grid */}
        <Grid container>
          {calendarDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
            const vacation = isVacationDay(day);
            const vacationBlocksScheduling = !!vacation?.affectsScheduling;

            return (
              <Grid item xs={12/7} key={index}>
                <Card 
                  sx={{ 
                    minHeight: '140px',
                    m: 0.5,
                    backgroundColor: (theme) => 
                      vacation 
                        ? theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0'
                        : isCurrentDay
                        ? theme.palette.mode === 'dark' ? 'rgba(208, 188, 255, 0.12)' : '#e3f2fd'
                        : isSelectedDay
                        ? theme.palette.mode === 'dark' ? 'rgba(236, 64, 122, 0.15)' : '#fce4ec'
                        : isCurrentMonth 
                        ? theme.palette.background.paper 
                        : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9f9f9',
                    border: (theme) => 
                      vacation 
                        ? `2px solid ${theme.palette.warning.main}`
                        : isCurrentDay 
                        ? `2px solid ${theme.palette.primary.main}` 
                        : isSelectedDay
                        ? `2px dashed ${theme.palette.secondary.main}`
                        : `1px solid ${theme.palette.divider}`,
                    opacity: isCurrentMonth ? 1 : 0.7,
                    cursor: 'pointer',
                    backdropFilter: lowGpu ? 'none' : 'blur(8px)',
                    '&:hover': {
                      backgroundColor: (theme) => 
                        vacation 
                          ? theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : '#ffecb3'
                          : isCurrentDay 
                          ? theme.palette.mode === 'dark' ? 'rgba(208, 188, 255, 0.15)' : '#e3f2fd'
                          : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
                      ...(lowGpu ? {} : {
                        transform: 'translateY(-1px)',
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                          : '0 4px 12px rgba(103, 80, 164, 0.1)'
                      })
                    },
                    transition: lowGpu ? 'background-color 0.15s ease, border-color 0.15s ease' : 'all 0.2s ease-in-out'
                  }}
                  onClick={() => handleGoToWeek(day)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {/* Tagesnummer - IMMER oben, auch bei Schließzeiten */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 1 
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isCurrentDay ? 'bold' : 'normal',
                          color: (theme) => {
                            if (isCurrentDay) return theme.palette.primary.main;
                            if (isSelectedDay) return theme.palette.secondary.main;
                            if (!isCurrentMonth) return theme.palette.text.disabled;
                            return theme.palette.text.primary;
                          },
                          fontSize: '0.9rem',
                          zIndex: 10,
                          backgroundColor: vacation ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                          borderRadius: vacation ? 1 : 0,
                          px: vacation ? 1 : 0,
                          py: vacation ? 0.25 : 0,
                          boxShadow: vacation ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      {/* Schließzeit-Icon kompakt rechts oben */}
                      {vacation && (
                        <Chip 
                          size="small"
                          label="🏖️"
                          sx={{ 
                            backgroundColor: 'warning.main',
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20,
                            minWidth: 28,
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }}
                        />
                      )}
                    </Box>
                    
                    {/* Schließzeit-Info kompakt */}
                    {vacation && (
                      <Box sx={{ mb: 1 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.65rem',
                            color: 'warning.dark',
                            fontWeight: 'bold',
                            display: 'block',
                            textAlign: 'center',
                            backgroundColor: 'warning.light',
                            padding: '2px 4px',
                            borderRadius: 1,
                            lineHeight: 1.2
                          }}
                        >
                          SCHLIESSZEIT
                          <br />
                          <span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>
                            {vacation.name}
                          </span>
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Feiertag anzeigen */}
                    {(() => {
                      const holiday = isHoliday(day, holidays);
                      return holiday && !vacation ? (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.6rem',
                            color: 'error.main',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            display: 'block',
                            mb: 0.5,
                            lineHeight: 1
                          }}
                        >
                          {holiday.name}
                        </Typography>
                      ) : null;
                    })()}
                    
                    {/* Schichten für den Tag - bei Schließzeit weiterhin anzeigen */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {dayShifts && dayShifts.length > 0 ? dayShifts.slice(0, 3).map((shift: any) => {
                        const employee = getEmployeeById(shift.employeeId || shift.employee_id);
                        const shiftType = getShiftTypeById(shift.shiftTypeId || shift.shift_type_id);
                        const shiftColor = shiftType?.color || '#666';
                        const isAllDayOrAbsence = (shiftType?.isAllDay === true) || (shiftType?.category === 'absence');
                        
                        return (
                          <Card 
                            key={shift.id} 
                            sx={{ 
                              minHeight: 28,
                              cursor: 'pointer',
                              position: 'relative',
                              backgroundColor: shiftColor,
                              borderRadius: 2,
                              transition: lowGpu ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                              '&:hover': { 
                                zIndex: 5,
                                backgroundColor: shiftColor, // Farbe beibehalten
                                '& .delete-button': { display: 'flex' },
                                ...(lowGpu ? {} : {
                                  transform: 'scale(1.03)',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                                })
                              }
                            }}
                          >
                            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }} onClick={(e) => {
                              e.stopPropagation();
                              // Optional: könnte Editing öffnen wenn vorhanden
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Avatar sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  fontSize: '0.6rem',
                                  bgcolor: employee ? 'rgba(255,255,255,0.8)' : 'rgba(255,0,0,0.8)',
                                  color: employee ? 'black' : 'white'
                                }}>
                                  {employee ? (
                                    `${employee.firstName?.[0] || employee.first_name?.[0] || '?'}${employee.lastName?.[0] || employee.last_name?.[0] || '?'}`
                                  ) : (
                                    <PersonIcon sx={{ fontSize: 12 }} />
                                  )}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  {!isAllDayOrAbsence && (shift.startTime || shift.start_time) && (shift.endTime || shift.end_time) && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '0.65rem', 
                                        lineHeight: 1,
                                        color: 'white',
                                        fontWeight: 'bold',
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {(shift.startTime || shift.start_time)} - {(shift.endTime || shift.end_time)}
                                    </Typography>
                                  )}
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.6rem', 
                                      lineHeight: 1,
                                      color: 'rgba(255,255,255,0.9)',
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {employee ? `${employee.firstName || employee.first_name || 'N/A'} ${employee.lastName || employee.last_name || 'N/A'}` : 'Nicht besetzt'}
                                  </Typography>
                                  {shiftType && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '0.55rem', 
                                        lineHeight: 1,
                                        color: 'rgba(255,255,255,0.8)',
                                        fontStyle: 'italic',
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {shiftType.name}{isAllDayOrAbsence ? '' : ''}
                                    </Typography>
                                  )}
                                </Box>
                                {/* Delete Button */}
                                <Box
                                  className="delete-button"
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
                                    // Lösch-Logik via Redux
                                    dispatch(deleteShift(parseInt(shift.id))).then(() => {
                                      dispatch(fetchShifts({}));
                                    });
                                  }}
                                >
                                  <span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>×</span>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      }) : null}
                      
                      {/* Overflow-Indikator */}
                      {dayShifts && dayShifts.length > 3 && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontStyle: 'italic'
                          }}
                        >
                          +{dayShifts.length - 3} weitere
                        </Typography>
                      )}
                      
                      {/* Info für Schließzeiten */}
                      {vacation && vacationBlocksScheduling && dayShifts && dayShifts.length > 0 && (
                        <Typography 
                          variant="caption" 
                          color="warning.dark" 
                          sx={{ 
                            textAlign: 'center',
                            fontSize: '0.65rem',
                            fontStyle: 'italic',
                            backgroundColor: 'warning.light',
                            padding: '2px 4px',
                            borderRadius: 1
                          }}
                        >
                          {dayShifts.length} Schicht{dayShifts.length > 1 ? 'en' : ''} geplant
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Snackbar for export feedback */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={5000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MonthView;
// Snackbar for export
/* Snackbar is declared via state above and rendered here to provide user feedback. */
